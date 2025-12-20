import { useState, useEffect } from "react";
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
import { Save, MessageSquare, Bot, AlertCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";

const whatsappSchema = z.object({
    openai_api_key: z.string().optional(),
    ai_model: z.string(),
    ai_temperature: z.number().min(0).max(1),
    is_connected: z.boolean(),
});

type WhatsAppFormData = z.infer<typeof whatsappSchema>;

export function WhatsAppSettings() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [configId, setConfigId] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
    } = useForm<WhatsAppFormData>({
        resolver: zodResolver(whatsappSchema),
        defaultValues: {
            ai_model: "gpt-4o-mini",
            ai_temperature: 0.7,
            is_connected: false,
        },
    });

    useEffect(() => {
        if (user?.organization_id) {
            fetchConfig();
        } else if (user && !user.organization_id) {
            // Se o usuário carregou mas não tem org_id, paramos o loading
            // O AuthContext vai tentar buscar o org_id em background
            setLoading(false);
        }
    }, [user]);

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
                setConfigId(data.id);
                setValue("openai_api_key", data.openai_api_key || "");
                setValue("ai_model", data.ai_model || "gpt-4o-mini");
                setValue("ai_temperature", Number(data.ai_temperature) || 0.7);
                setValue("is_connected", data.is_connected || false);
            }
        } catch (error) {
            console.error("Error fetching whatsapp config:", error);
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
                ai_model: data.ai_model,
                ai_temperature: data.ai_temperature,
                is_connected: data.is_connected,
                updated_at: new Date().toISOString(),
            };

            if (configId) {
                const { error } = await supabase
                    .from("whatsapp_configs")
                    .update(payload)
                    .eq("id", configId);
                if (error) throw error;
            } else {
                const { error } = await supabase.from("whatsapp_configs").insert(payload);
                if (error) throw error;
            }

            alert("Configurações salvas com sucesso!");
            fetchConfig();
        } catch (error: any) {
            console.error("Error saving whatsapp config:", error);
            alert(error.message || "Erro ao salvar configurações");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="space-y-6 max-w-4xl animate-in fade-in duration-300">
                <div className="space-y-2">
                    <div className="h-8 w-64 bg-muted animate-pulse rounded-md" />
                    <div className="h-4 w-96 bg-muted animate-pulse rounded-md" />
                </div>

                <div className="h-20 w-full bg-muted animate-pulse rounded-lg" />

                <Card>
                    <CardHeader>
                        <div className="h-6 w-48 bg-muted animate-pulse rounded-md" />
                        <div className="h-4 w-72 bg-muted animate-pulse rounded-md mt-2" />
                    </CardHeader>
                    <CardContent>
                        <div className="flex items-center justify-between p-4 border rounded-lg">
                            <div className="space-y-2">
                                <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                                <div className="h-4 w-64 bg-muted animate-pulse rounded" />
                            </div>
                            <div className="h-6 w-11 bg-muted animate-pulse rounded-full" />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <div className="h-6 w-56 bg-muted animate-pulse rounded-md" />
                        <div className="h-4 w-80 bg-muted animate-pulse rounded-md mt-2" />
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                        </div>
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                            </div>
                            <div className="space-y-2">
                                <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                                <div className="h-10 w-full bg-muted animate-pulse rounded-md" />
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <div className="h-10 w-48 bg-muted animate-pulse rounded-md" />
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-4xl">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Configuração WhatsApp</h1>
                <p className="text-muted-foreground mt-1">
                    Gerencie a conexão e a inteligência artificial do seu assistente
                </p>
            </div>

            <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Atenção</AlertTitle>
                <AlertDescription>
                    Para conectar seu WhatsApp, você precisará escanear o QR Code.
                    Esta funcionalidade requer um servidor de API do WhatsApp ativo.
                </AlertDescription>
            </Alert>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <MessageSquare className="w-5 h-5" />
                            Status da Conexão
                        </CardTitle>
                        <CardDescription>
                            Ative ou desative a integração com o WhatsApp
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
                            <div className="space-y-0.5">
                                <Label className="text-base">Integração Ativa</Label>
                                <p className="text-sm text-muted-foreground">
                                    Quando ativo, o sistema responderá mensagens automaticamente
                                </p>
                            </div>
                            <Switch
                                checked={watch("is_connected")}
                                onCheckedChange={(checked) => setValue("is_connected", checked)}
                            />
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Bot className="w-5 h-5" />
                            Inteligência Artificial (OpenAI)
                        </CardTitle>
                        <CardDescription>
                            Configure o "cérebro" do seu assistente virtual
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="openai_api_key">API Key da OpenAI</Label>
                            <Input
                                id="openai_api_key"
                                type="password"
                                placeholder="sk-..."
                                {...register("openai_api_key")}
                            />
                            <p className="text-xs text-muted-foreground">
                                Sua chave será armazenada de forma segura.
                            </p>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
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
                                        <SelectItem value="gpt-4o-mini">GPT-4o Mini (Recomendado)</SelectItem>
                                        <SelectItem value="gpt-4o">GPT-4o (Mais inteligente)</SelectItem>
                                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo (Legado)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Criatividade (Temperatura): {watch("ai_temperature")}</Label>
                                <Input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    {...register("ai_temperature", { valueAsNumber: true })}
                                />
                                <div className="flex justify-between text-xs text-muted-foreground">
                                    <span>Preciso (0.0)</span>
                                    <span>Criativo (1.0)</span>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <div className="flex justify-end">
                    <Button type="submit" disabled={saving}>
                        <Save className="w-4 h-4 mr-2" />
                        {saving ? "Salvando..." : "Salvar Configurações"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
