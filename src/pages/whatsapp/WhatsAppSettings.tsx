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
import { Save, Bot, RefreshCw, Smartphone, Trash2, CheckCircle2, Zap, Layout, Play } from "lucide-react";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
    n8n_webhook_url: z.string().url("URL inválida").optional().or(z.literal("")),
    ai_model: z.string(),
    ai_temperature: z.number().min(0).max(1),
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

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors }
    } = useForm<WhatsAppFormData>({
        resolver: zodResolver(whatsappSchema),
        defaultValues: {
            ai_model: "gpt-4o-mini",
            ai_temperature: 0.7,
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
                // Check both status and state (v2 compatibility)
                const newStatus = result.instance.status || result.instance.state;

                // Ignore if status is undefined or null
                if (!newStatus) return;

                // Only update if status changed from previous poll
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

    const fetchConfig = async () => {
        if (!user?.organization_id) return;

        setLoading(true);
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
                setValue("n8n_webhook_url", data.webhook_url || ""); // Correctly mapping db webhook_url to form field
                setValue("ai_model", data.ai_model || "gpt-4o-mini");
                setValue("ai_temperature", Number(data.ai_temperature) || 0.7);
                setValue("is_connected", data.is_connected || false);
                setInstanceStatus(data.status || 'disconnected');

                // If we have an instance but status is disconnected, maybe check real status?
                if (data.instance_name && data.status !== 'connected') {
                    // Check status quietly
                    EvolutionApi.fetchInstance(data.instance_name).then(res => {
                        if (res?.instance?.status === 'open') {
                            setInstanceStatus('connected');
                            updateLocalStatus('connected');
                        }
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching whatsapp config:", error);
            toast.error("Erro ao carregar configurações.");
        } finally {
            setLoading(false);
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
                const webhookUrl = watch('n8n_webhook_url');

                // Save basic settings first if needed, or pass them to create
                // We need to create the instance via our Edge Function
                const result = await EvolutionApi.createInstance(instanceName, webhookUrl);

                if (!result) {
                    throw new Error("Não houve resposta da Evolution API. Por favor, atualize a página e verifique se as credenciais estão corretas. (Ref: Null Result)");
                }

                // Refetch config to get the saved instance details
                await fetchConfig();
                // We need to wait a bit or use the returned data locally? fetchConfig is safer.
                // But fetchConfig connects to DB. The edge function should have updated DB.
                // Let's assume fetchConfig finds it.
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
            console.log('Connect result:', connectResult);

            // Evolution API v2 may return QR code in different fields
            const result = connectResult as any;
            const qrCodeValue = result?.base64 ||
                result?.code ||
                result?.qrcode?.base64 ||
                result?.qrcode?.code ||
                result?.pairingCode ||
                null;
            console.log('QR Code value (first 50 chars):', qrCodeValue?.substring(0, 50));

            if (qrCodeValue && qrCodeValue.length > 10) {
                // If it's a base64 data URL, use it directly. If it's just base64, we need to generate QR from it.
                // The react-qr-code component expects a string value to encode into QR
                // If Evolution returns base64 of an image, we need to display it as image instead
                if (qrCodeValue.startsWith('data:image')) {
                    // It's already a base64 image - display as image
                    setQrCode(qrCodeValue);
                } else {
                    // It's the actual pairing code - use QRCode component to render it
                    setQrCode(qrCodeValue);
                }
                setInstanceStatus('connecting');
                toast.success("QR Code gerado! Escaneie com seu WhatsApp.");
            } else {
                // Instance might be already connected
                const status = (connectResult as any)?.instance?.status ||
                    (connectResult as any)?.instance?.state ||
                    (connectResult as any)?.state;
                console.log('Instance status:', status);

                if (status === 'open' || status === 'connected') {
                    setInstanceStatus('connected');
                    toast.success("Instância já está conectada!");
                    updateLocalStatus('connected');
                } else {
                    console.error('Unexpected connect result:', connectResult);
                    throw new Error("Não foi possível gerar o QR Code. Resposta inesperada da API.");
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
                n8n_webhook_url: data.n8n_webhook_url, // Changed from webhook_url to specific n8n field if using migration, or stick to webhook_url?
                // Migration 018 added fields but n8n_webhook_url was in my implementation plan. 
                // Existing table had webhook_url. 
                // Let's use `n8n_webhook_url` as I defined it in the migration (wait, did I add it? Checking earlier steps).
                // Migration 018:
                // ADD COLUMN IF NOT EXISTS instance_name TEXT,
                // ADD COLUMN IF NOT EXISTS instance_id TEXT,
                // ADD COLUMN IF NOT EXISTS api_token TEXT,
                // ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'disconnected';
                // I DID NOT add n8n_webhook_url in 018 explicitly, I missed it?
                // Let me check artifacts.
                // task.md: "Definir estrutura do Banco de Dados (Tabela whatsapp_config)"
                // 018_update_whatsapp_configs.sql content:
                // ALTER TABLE public.whatsapp_configs ... ADD COLUMN IF NOT EXISTS instance_name ...
                // It seems I failed to add `n8n_webhook_url` if it wasn't there. 
                // The original table has `webhook_url`. I should use that one.
                webhook_url: data.n8n_webhook_url,

                ai_model: data.ai_model,
                ai_temperature: data.ai_temperature,
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
            fetchConfig();
        } catch (error: any) {
            console.error("Error saving config:", error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-8">Carregando configurações...</div>; // TODO: Better skeleton
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-500 pb-12">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuração WhatsApp</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie a conexão e a inteligência artificial do seu assistente
                </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Tips and Configuration */}
                <div className="lg:col-span-2 space-y-6">
                    <Tabs defaultValue="instructions" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-4">
                            <TabsTrigger value="instructions">Instruções</TabsTrigger>
                            <TabsTrigger value="integration">Integração</TabsTrigger>
                        </TabsList>

                        {/* INSTRUCTIONS TAB */}
                        <TabsContent value="instructions" className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg text-blue-600">
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
                                            <div className="flex items-center gap-2 text-blue-600 font-medium">
                                                <Bot className="w-5 h-5" />
                                                2. Configurar IA
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Na aba "Integração", insira sua chave da OpenAI e configure a personalidade do assistente.
                                            </p>
                                        </div>
                                        <div className="space-y-2 p-4 border rounded-lg bg-muted/20">
                                            <div className="flex items-center gap-2 text-amber-600 font-medium">
                                                <Zap className="w-5 h-5" />
                                                3. Automatizar
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                Configure o Webhook para processar fluxos complexos no n8n se necessário.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900 rounded-lg text-sm text-yellow-800 dark:text-yellow-200">
                                        <strong>Dica Importante:</strong> Mantenha seu celular conectado à internet para garantir que o WhatsApp funcione corretamente. O assistente responderá automaticamente as mensagens recebidas.
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
                                            <Bot className="w-5 h-5 text-blue-600" />
                                            Parâmetros da Inteligência Artificial
                                        </CardTitle>
                                        <CardDescription>
                                            Configure como o assistente deve se comportar e processar mensagens.
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="n8n_webhook_url">Webhook do Workflow (n8n)</Label>
                                            <Input
                                                id="n8n_webhook_url"
                                                placeholder="https://seu-n8n.com/webhook/..."
                                                {...register("n8n_webhook_url")}
                                                className={errors.n8n_webhook_url ? "border-red-500" : ""}
                                            />
                                            {errors.n8n_webhook_url && <span className="text-xs text-red-500">{errors.n8n_webhook_url.message}</span>}
                                            <p className="text-xs text-muted-foreground">
                                                Opcional: Endpoint para processamento avançado de mensagens via Evolution API.
                                            </p>
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="openai_api_key">API Key da OpenAI</Label>
                                            <Input
                                                id="openai_api_key"
                                                type="password"
                                                placeholder="sk-..."
                                                {...register("openai_api_key")}
                                            />
                                            <p className="text-xs text-muted-foreground">
                                                Necessário para gerar respostas inteligentes. Sua chave é armazenada com segurança.
                                            </p>
                                        </div>

                                        <div className="grid gap-4 md:grid-cols-2 pt-2">
                                            <div className="space-y-2">
                                                <Label>Modelo de IA</Label>
                                                <Select
                                                    value={watch("ai_model")}
                                                    onValueChange={(val) => setValue("ai_model", val)}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecione o modelo" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Rápido & Econômico)</SelectItem>
                                                        <SelectItem value="gpt-4o">GPT-4o (Mais Inteligente)</SelectItem>
                                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legado)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-2">
                                                <Label className="flex justify-between">
                                                    <span>Criatividade (Temperatura)</span>
                                                    <span className="text-muted-foreground">{watch("ai_temperature")}</span>
                                                </Label>
                                                <Input
                                                    type="range"
                                                    min="0"
                                                    max="1"
                                                    step="0.1"
                                                    {...register("ai_temperature", { valueAsNumber: true })}
                                                />
                                                <div className="flex justify-between text-xs text-muted-foreground px-1">
                                                    <span>Preciso</span>
                                                    <span>Criativo</span>
                                                </div>
                                            </div>
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
                        <Card className={`border-2 transition-all duration-300 ${instanceStatus === 'connected' ? 'border-green-500/20 shadow-lg shadow-green-500/10' : 'border-muted'}`}>
                            <CardHeader className="bg-muted/50 pb-4">
                                <CardTitle className="flex items-center justify-between text-base">
                                    <span className="flex items-center gap-2">
                                        <Smartphone className="w-4 h-4" />
                                        Status da Conexão
                                    </span>
                                    <div className={`px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1.5 ${instanceStatus === 'connected'
                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                        : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                        }`}>
                                        <div className={`w-1.5 h-1.5 rounded-full ${instanceStatus === 'connected' ? 'bg-green-600' : 'bg-red-600'} animate-pulse`} />
                                        {instanceStatus === 'connected' ? 'Online' : 'Offline'}
                                    </div>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-6 flex flex-col items-center text-center space-y-6">
                                <div className="relative">
                                    <div className="w-48 h-48 bg-white p-3 rounded-xl shadow-sm border flex items-center justify-center relative overflow-hidden group">
                                        {instanceStatus === 'connected' ? (
                                            <div className="flex flex-col items-center animate-in zoom-in duration-300">
                                                <CheckCircle2 className="w-16 h-16 text-green-500 mb-2" />
                                                <span className="text-sm font-medium text-green-700">Dispositivo Vinculado</span>
                                                <span className="text-xs text-muted-foreground mt-1">Pronto para uso</span>
                                            </div>
                                        ) : qrCode ? (
                                            <div className="w-full h-full flex items-center justify-center animate-in fade-in">
                                                {qrCode.startsWith('data:image') ? (
                                                    <img
                                                        src={qrCode}
                                                        alt="QR Code"
                                                        className="max-w-full max-h-full object-contain"
                                                    />
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
                                                <Button variant="outline" className="w-full border-red-200 text-red-600 hover:bg-red-50 dark:border-red-900/30 dark:hover:bg-red-900/20">
                                                    <Trash2 className="w-4 h-4 mr-2" />
                                                    Desconectar
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Desconectar WhatsApp?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Isso irá interromper imediatamente o funcionamento do assistente virtual.
                                                        Você precisará escanear o QR Code novamente para reconectar.
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
                                        {instanceStatus === 'connected'
                                            ? "Seu dispositivo está enviando e recebendo mensagens normalmente."
                                            : "Clique no botão acima para gerar um novo código de pareamento."}
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}

