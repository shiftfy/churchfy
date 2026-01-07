import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Save, Bot, RefreshCw, Smartphone, Trash2, CheckCircle2, Zap, Layout, Play, Sparkles } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SectionTabs } from "@/components/layout/SectionTabs";
import QRCode from "react-qr-code";
import { toast } from "sonner";
import { EvolutionApi } from "@/lib/evolution-api";
import type { WhatsappConfig } from "@/types/whatsapp";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const whatsappSchema = z.object({
    openai_api_key: z.string().optional(),
    is_connected: z.boolean(),
});

type WhatsAppFormData = z.infer<typeof whatsappSchema>;

export function WhatsAppSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [connecting, setConnecting] = useState(false);
    const [config, setConfig] = useState<WhatsappConfig | null>(null);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [instanceStatus, setInstanceStatus] = useState<string>("disconnected");
    const [activeTab, setActiveTab] = useState("instructions");

    const {
        register,
        handleSubmit,
        setValue,
        watch,
    } = useForm<WhatsAppFormData>({
        resolver: zodResolver(whatsappSchema),
        defaultValues: {
            openai_api_key: "",
            is_connected: false,
        },
    });

    const pollInterval = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            fetchConfig();
        } else if (user && !user.organization_id) {
            setLoading(false);
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [user]);

    // Poll for status continuously when there's an instance
    // This detects both connections and disconnections
    useEffect(() => {
        if (config?.instance_name) {
            // Start polling for any instance (connecting, connected, or waiting)
            startPolling(config.instance_name);
        } else {
            if (pollInterval.current) clearInterval(pollInterval.current);
        }

        return () => {
            if (pollInterval.current) clearInterval(pollInterval.current);
        };
    }, [config?.instance_name]);

    const startPolling = (instanceName: string) => {
        if (pollInterval.current) clearInterval(pollInterval.current);

        // Track previous status to detect changes
        let previousStatus: string | null = null;

        pollInterval.current = setInterval(async () => {
            const result = await EvolutionApi.fetchInstance(instanceName);

            if (result && result.instance) {
                const newStatus = result.instance.status || result.instance.state;

                if (!newStatus) return;

                // Only update status-related things if status changed
                if (newStatus !== previousStatus) {
                    if (newStatus === 'open' || newStatus === 'connected') {
                        // Now connected - Always update UI if status implies connection
                        setInstanceStatus('connected');
                        setQrCode(null);
                        if (previousStatus !== null) { // Don't toast on initial load
                            toast.success("WhatsApp Conectado!");
                        }
                        updateLocalStatus('connected');
                    } else if (newStatus === 'close' || newStatus === 'disconnected') {
                        // Now disconnected - Always update UI if status implies disconnection
                        setInstanceStatus('disconnected');
                        setQrCode(null);

                        // Only toast if we were previously connected (to avoid spamming on page load)
                        if (previousStatus === 'open' || previousStatus === 'connected') {
                            toast.warning("WhatsApp Desconectado!");
                        }
                        updateLocalStatus('disconnected');
                    } else if (newStatus === 'connecting') {
                        setInstanceStatus('connecting');
                    }

                    previousStatus = newStatus;
                }
            }
        }, 2000); // Poll every 2 seconds for faster updates
    };

    const fetchConfig = async (silent = false) => {
        if (!user?.organization_id) return;

        if (!silent) setLoading(true);
        try {
            const { data, error } = await supabase
                .from("whatsapp_configs")
                .select("*")
                .eq("organization_id", user.organization_id)
                .single();

            if (error && error.code !== "PGRST116") throw error;

            if (data) {
                setConfig(data as WhatsappConfig);
                setValue("openai_api_key", data.openai_api_key || "");
                setValue("is_connected", data.is_connected || false);
                setInstanceStatus(data.status || 'disconnected');

                // If we have an instance but status is disconnected, maybe check real status?
                if (data.instance_name && data.status !== 'connected') {
                    // Check status quietly
                    EvolutionApi.fetchInstance(data.instance_name).then(res => {
                        if (res?.instance?.status === 'open' || res?.instance?.state === 'open') {
                            setInstanceStatus('connected');
                            updateLocalStatus('connected');
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching whatsapp config:", error);
            if (!silent) toast.error("Erro ao carregar configurações.");
        } finally {
            if (!silent) setLoading(false);
        }
    };

    const updateLocalStatus = async (status: string) => {
        if (!config?.id) return;
        setInstanceStatus(status);
        await supabase
            .from('whatsapp_configs')
            .update({ status, is_connected: status === 'connected' })
            .eq('id', config.id);
    };

    const handleConnect = async () => {
        if (!user?.organization_id) return;
        setConnecting(true);
        setQrCode(null);

        try {
            let currentConfig = config;

            // 1. Ensure Instance Exists
            if (!currentConfig?.instance_name) {
                // Create new instance name based on org slug or random
                const instanceName = `churchfy_${user.organization_id.split('-')[0]}_${Date.now()}`;
                // We need to create the instance via our Edge Function
                const result = await EvolutionApi.createInstance(instanceName, "");

                if (!result) {
                    throw new Error("Não houve resposta da Evolution API.");
                }

                // Refetch config to get the saved instance details
                await fetchConfig();
                // Wait small delay
                await new Promise(r => setTimeout(r, 1000));

                // Manually refresh config data derived from result if fetch fails? 
                // Let's force fetch again.
                const { data } = await supabase.from('whatsapp_configs').select('*').eq('organization_id', user.organization_id).single();
                if (data) currentConfig = data as WhatsappConfig;
            }

            if (!currentConfig?.instance_name) throw new Error("Não foi possível identificar a instância.");

            // 2. Connect (Get QR Code)
            const connectResult = await EvolutionApi.connectInstance(currentConfig.instance_name);
            const result = connectResult as any;
            const qrCodeValue = result?.base64 ||
                result?.code ||
                result?.qrcode?.base64 ||
                result?.qrcode?.code ||
                result?.pairingCode ||
                null;

            if (qrCodeValue && qrCodeValue.length > 10) {
                // The react-qr-code component expects a string value to encode into QR
                // If Evolution returns base64 of an image, we need to display it as image instead
                setQrCode(qrCodeValue);
                setInstanceStatus('connecting');
                toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
            } else {
                // Instance might be already connected
                const status = result?.instance?.status ||
                    result?.instance?.state ||
                    result?.state;

                if (status === 'open' || status === 'connected') {
                    setInstanceStatus('connected');
                    toast.success("Instância já está conectada!");
                    updateLocalStatus('connected');
                } else {
                    throw new Error("Não foi possível gerar o QR Code.");
                }
            }

        } catch (error: any) {
            console.error("Connect error:", error);
            toast.error(error.message || "Erro ao conectar.");
        } finally {
            setConnecting(false);
        }
    };

    const handleDisconnect = async () => {
        if (!config?.instance_name) return;
        // Confirmation is now handled by AlertDialog Component

        setLoading(true);
        try {
            const success = await EvolutionApi.deleteInstance(config.instance_name);
            if (success) {
                toast.success("Desconectado com sucesso.");
                setInstanceStatus('disconnected');
                setQrCode(null);
                fetchConfig(); // Refresh DB state
            } else {
                toast.error("Erro ao desconectar.");
            }
        } catch (error) {
            toast.error("Erro ao processar desconexão.");
        } finally {
            setLoading(false);
        }
    };

    const onSubmit = async (data: WhatsAppFormData) => {
        if (!user?.organization_id) return;

        setSaving(true);
        try {
            const payload = {
                organization_id: user.organization_id,
                openai_api_key: data.openai_api_key,
                is_connected: data.is_connected,
                updated_at: new Date().toISOString(),
            };

            if (config?.id) {
                const { error } = await supabase
                    .from("whatsapp_configs")
                    .update(payload)
                    .eq("id", config.id);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("whatsapp_configs").insert(payload);
                if (error) throw error;
            }

            toast.success("Configurações salvas com sucesso!");
            fetchConfig(true); // Silent fetch to avoid skeleton
        } catch (error: any) {
            console.error("Error saving config:", error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 pb-12">
                {/* Menu - sem animação */}
                <SectionTabs
                    items={[
                        { label: "Automações", href: "/automacoes" },
                        { label: "WhatsApp", href: "/whatsapp" },
                    ]}
                />

                {/* Conteúdo - com animação */}
                <div className="animate-in fade-in duration-300 space-y-8">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">WhatsApp</h1>
                        <p className="text-muted-foreground mt-1">
                            Gerencie a conexão e a inteligência artificial do seu assistente
                        </p>
                    </div>

                    {/* Skeleton do conteúdo */}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Coluna esquerda */}
                        <div className="lg:col-span-2 space-y-6">
                            <div className="h-12 bg-muted animate-pulse rounded-lg" />
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    {Array.from({ length: 4 }).map((_, i) => (
                                        <div key={i} className="space-y-2">
                                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                                            <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                                        </div>
                                    ))}
                                </CardContent>
                            </Card>
                        </div>

                        {/* Coluna direita */}
                        <div className="space-y-6">
                            <Card>
                                <CardContent className="p-6 space-y-4">
                                    <div className="h-6 w-40 bg-muted animate-pulse rounded" />
                                    <div className="h-40 w-40 mx-auto bg-muted animate-pulse rounded-lg" />
                                    <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-12">
            {/* Menu - sem animação */}
            <SectionTabs
                items={[
                    { label: "Automações", href: "/automacoes" },
                    { label: "WhatsApp", href: "/whatsapp" },
                ]}
            />

            {/* Conteúdo - com animação */}
            <div className="animate-in fade-in duration-300 space-y-8">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">WhatsApp</h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie a conexão e a inteligência artificial do seu assistente
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Tips and Configuration */}
                    <div className="lg:col-span-2 space-y-6">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 mb-4">
                                <TabsTrigger value="instructions">Instruções</TabsTrigger>
                                <TabsTrigger value="integration">Integração</TabsTrigger>
                            </TabsList>

                            {/* INSTRUCTIONS TAB */}
                            <TabsContent value="instructions" className="space-y-6">
                                <Card>
                                    <CardHeader>
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                                <Play className="w-5 h-5" />
                                            </div>
                                            <CardTitle>Como funciona?</CardTitle>
                                        </div>
                                        <CardDescription>
                                            Siga os passos abaixo para ativar seu assistente virtual inteligente.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid gap-4 md:grid-cols-3">
                                            <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                                                <div className="flex items-center gap-2 text-green-600 font-medium">
                                                    <Smartphone className="w-5 h-5" />
                                                    1. Conectar
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Escaneie o QR Code na barra lateral para vincular seu WhatsApp ao sistema.
                                                </p>
                                            </div>
                                            <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                                                <div className="flex items-center gap-2 text-primary font-medium">
                                                    <Bot className="w-5 h-5" />
                                                    2. Configurar IA
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Na aba "Integração", insira sua chave da OpenAI e configure a personalidade do assistente.
                                                </p>
                                            </div>
                                            <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                                                <div className="flex items-center gap-2 text-primary font-medium">
                                                    <Zap className="w-5 h-5" />
                                                    3. Pronto!
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    Seu assistente está pronto para interagir com seus visitantes de forma automática.
                                                </p>
                                            </div>
                                        </div>

                                        <div className="relative overflow-hidden rounded-xl border border-primary/20 bg-gradient-to-r from-primary/[0.05] to-transparent p-4 group transition-all hover:bg-primary/[0.08]">
                                            <div className="flex items-center gap-3 relative">
                                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                                                    <Sparkles className="h-4 w-4" />
                                                </div>
                                                <p className="text-sm text-muted-foreground leading-relaxed">
                                                    <span className="font-semibold text-primary">Dica Importante:</span> Mantenha seu celular conectado à internet para garantir que o WhatsApp funcione corretamente.
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* INTEGRATION TAB */}
                            <TabsContent value="integration">
                                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="flex items-center gap-2">
                                                <Bot className="w-5 h-5 text-primary" />
                                                Parâmetros da Inteligência Artificial
                                            </CardTitle>
                                            <CardDescription>
                                                Configure como o assistente deve se comportar e processar mensagens.
                                            </CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="space-y-2">
                                                <Label htmlFor="openai_api_key">OpenAI API Key</Label>
                                                <Input
                                                    id="openai_api_key"
                                                    type="password"
                                                    placeholder="sk-..."
                                                    {...register("openai_api_key")}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-4">
                                            <CardTitle className="text-lg">Configurações de Resposta</CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="flex items-center justify-between space-x-2 border p-4 rounded-lg">
                                                <div className="space-y-0.5">
                                                    <Label className="text-base">Resposta Automática</Label>
                                                    <p className="text-sm text-muted-foreground">
                                                        Permitir que a IA responda automaticamente às mensagens recebidas.
                                                    </p>
                                                </div>
                                                <Switch
                                                    checked={watch("is_connected")}
                                                    onCheckedChange={(checked) => setValue("is_connected", checked)}
                                                />
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="flex justify-end pt-2">
                                        <Button type="submit" disabled={saving} size="lg" className="w-full md:w-auto">
                                            <Save className="w-4 h-4 mr-2" />
                                            {saving ? "Salvando..." : "Salvar Alterações"}
                                        </Button>
                                    </div>
                                </form>
                            </TabsContent>
                        </Tabs>
                    </div>

                    {/* Right Column: Sticky Connection Status */}
                    <div className="lg:col-span-1">
                        <div className="sticky top-6 space-y-6">
                            <Card className="transition-all duration-300">
                                <CardHeader className="bg-muted/50 py-3">
                                    <CardTitle className="flex items-center text-sm font-semibold">
                                        <Smartphone className="w-4 h-4 mr-2 text-muted-foreground" />
                                        Status da Conexão
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="pt-6 flex flex-col items-center text-center space-y-6">
                                    <div className="relative">
                                        <div className="w-48 h-48 bg-white p-3 rounded-xl shadow-sm border flex items-center justify-center relative overflow-hidden group">
                                            {instanceStatus === 'connected' ? (
                                                <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                                    <div className="w-16 h-16 bg-green-50 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-3">
                                                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                                                    </div>
                                                    <span className="text-base font-semibold text-foreground">Dispositivo Vinculado</span>
                                                    <span className="text-sm text-muted-foreground mt-1 text-green-600 font-medium">Pronto para uso</span>
                                                </div>
                                            ) : qrCode ? (
                                                <div className="w-full h-full flex items-center justify-center animate-in fade-in">
                                                    {qrCode.startsWith('data:image') ? (
                                                        <img src={qrCode} alt="QR Code" className="max-w-full max-h-full object-contain" />
                                                    ) : (
                                                        <QRCode
                                                            size={256}
                                                            style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                                                            value={qrCode}
                                                            viewBox={`0 0 256 256`}
                                                        />
                                                    )}
                                                    {/* Scan overlay effect */}
                                                    <div className="absolute inset-0 bg-gradient-to-b from-transparent via-blue-500/10 to-transparent h-full w-full -translate-y-full group-hover:translate-y-full transition-transform duration-1000 ease-in-out" />
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-center opacity-40">
                                                    <Smartphone className="w-12 h-12 mb-2" />
                                                    <span className="text-xs">Aguardando conexão...</span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2 w-full">
                                        {instanceStatus === 'connected' ? (
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" className="w-full text-muted-foreground hover:text-destructive transition-colors">
                                                        <Trash2 className="w-3.5 h-3.5 mr-2" />
                                                        Desvincular Dispositivo
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                        <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                                                        <AlertDialogDescription>
                                                            Isso irá interromper o assistente. Você precisará escanear o QR Code novamente.
                                                        </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                                        <AlertDialogAction onClick={handleDisconnect} className="bg-destructive hover:bg-destructive/90 text-white">
                                                            Sim, desconectar
                                                        </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        ) : (
                                            <Button
                                                onClick={handleConnect}
                                                disabled={connecting}
                                                className="w-full bg-green-600 hover:bg-green-700 text-white"
                                            >
                                                {connecting ? (
                                                    <>
                                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                                                        Gerando...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Layout className="w-4 h-4 mr-2" />
                                                        Gerar QR Code
                                                    </>
                                                )}
                                            </Button>
                                        )}

                                        <p className="text-xs text-muted-foreground px-2">
                                            {instanceStatus === 'connected' ? "Conectado e operando." : "Gere um QR Code para vincular."}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
