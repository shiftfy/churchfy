import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Save, Plus, Trash2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectSeparator,
} from "@/components/ui/select";
import { VariableTextarea } from "@/components/automations/VariableTextarea";
import { AutomationBuilderSkeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { CreateTagDialog } from "@/components/tags/CreateTagDialog";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface TriggerConfig {
    form_id?: string;
    stage_id?: string;
    journey_id?: string; // Helper for UI selection
    form_slug?: string; // Helper for UI display
}

interface ActionConfig {
    tag_id?: string;
    message?: string;
}

interface Action {
    id: string; // Temp ID for UI
    type: 'add_tag' | 'send_whatsapp';
    config: ActionConfig;
}

export function AutomationBuilder() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Form State
    const [name, setName] = useState("");
    const [isActive, setIsActive] = useState(true);
    const [triggerType, setTriggerType] = useState<'form_submission' | 'stage_entry'>('form_submission');
    const [triggerConfig, setTriggerConfig] = useState<TriggerConfig>({});
    const [actions, setActions] = useState<Action[]>([]);

    // Data Selectors
    const [forms, setForms] = useState<any[]>([]);
    const [journeys, setJourneys] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);
    const [tags, setTags] = useState<any[]>([]);
    const [whatsappConnected, setWhatsappConnected] = useState(false);
    const [isCreateTagDialogOpen, setIsCreateTagDialogOpen] = useState(false);
    const [currentActionIdForTag, setCurrentActionIdForTag] = useState<string | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            fetchDependencies();
        }
    }, [user?.organization_id]);

    useEffect(() => {
        if (id && user?.organization_id) {
            fetchAutomation();
        }
    }, [id, user?.organization_id]);

    const fetchDependencies = async () => {
        try {
            // Forms
            const { data: formsData } = await supabase
                .from("forms")
                .select("id, title, slug")
                .eq("organization_id", user?.organization_id)
                .order("title");
            setForms(formsData || []);

            // Journeys & Stages
            const { data: journeysData } = await supabase
                .from("journeys")
                .select("id, title")
                .eq("organization_id", user?.organization_id)
                .order("title");
            setJourneys(journeysData || []);

            // Tags
            const { data: tagsData } = await supabase
                .from("tags")
                .select("id, name")
                .eq("organization_id", user?.organization_id)
                .order("name");
            setTags(tagsData || []);

            // WhatsApp Status
            const { data: whatsappData } = await supabase
                .from("whatsapp_configs")
                .select("status, is_connected")
                .eq("organization_id", user?.organization_id)
                .maybeSingle();

            setWhatsappConnected(whatsappData?.status === 'connected' || whatsappData?.is_connected === true);

        } catch (error) {
            console.error("Error fetching dependencies:", error);
        }
    };

    const handleTagCreated = (newTag: any) => {
        setTags(prev => [...prev, newTag].sort((a, b) => a.name.localeCompare(b.name)));
        if (currentActionIdForTag) {
            updateActionConfig(currentActionIdForTag, { tag_id: newTag.id });
        }
        setIsCreateTagDialogOpen(false);
        setCurrentActionIdForTag(null);
    };

    // Fetch Stages when journey is selected (for trigger config)
    const fetchStages = async (journeyId: string) => {
        const { data: stagesData } = await supabase
            .from("visitor_stages")
            .select("id, title")
            .eq("journey_id", journeyId)
            .order("position");
        setStages(stagesData || []);
    }

    const fetchAutomation = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("automations")
                .select("*")
                .eq("id", id)
                .single();

            if (error) throw error;

            setName(data.name);
            setIsActive(data.is_active);
            setTriggerType(data.trigger_type);
            setTriggerConfig(data.trigger_config);

            // Reconstruct actions (add temp IDs)
            const loadedActions = (data.actions || []).map((a: any, index: number) => ({
                ...a,
                id: `action-${Date.now()}-${index}`
            }));
            setActions(loadedActions);

            // If stage trigger, we need to load stages for the implied journey
            if (data.trigger_type === 'stage_entry' && data.trigger_config.stage_id) {
                // In a real app we'd fetch the stage's journey ID first.
                // For now let's just fetch ALL stages for org or try to find the journey.
                // Let's cheat slightly and just list all stages for simplified UX if journey isn't stored.
                // Or better: Fetch the stage to get its journey_id
                const { data: stageData } = await supabase
                    .from("visitor_stages")
                    .select("journey_id")
                    .eq("id", data.trigger_config.stage_id)
                    .single();

                if (stageData) {
                    setTriggerConfig(prev => ({ ...prev, journey_id: stageData.journey_id }));
                    fetchStages(stageData.journey_id);
                }
            }

        } catch (error) {
            console.error("Error fetching automation:", error);
            toast.error("Erro ao carregar automação.");
            navigate("/automacoes");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) {
            toast.error("Nome da automação é obrigatório");
            return;
        }

        if (triggerType === 'form_submission' && !triggerConfig.form_id) {
            toast.error("Selecione um formulário para o gatilho");
            return;
        }

        if (triggerType === 'stage_entry' && !triggerConfig.stage_id) {
            toast.error("Selecione uma etapa para o gatilho");
            return;
        }

        if (actions.length === 0) {
            toast.error("Adicione pelo menos uma ação");
            return;
        }

        // Validate actions
        for (const action of actions) {
            if (action.type === 'add_tag' && !action.config.tag_id) {
                toast.error("Selecione a tag para a ação de adicionar tag");
                return;
            }
            if (action.type === 'send_whatsapp' && !action.config.message) {
                toast.error("Escreva uma mensagem para o envio de WhatsApp");
                return;
            }
        }

        setSaving(true);
        try {
            // Clean up config for DB
            const cleanTriggerConfig = {
                form_id: triggerConfig.form_id,
                stage_id: triggerConfig.stage_id
            };

            // Strip undefined keys
            Object.keys(cleanTriggerConfig).forEach(key =>
                (cleanTriggerConfig as any)[key] === undefined && delete (cleanTriggerConfig as any)[key]
            );

            // Clean up actions for DB
            const cleanActions = actions.map(({ id, ...rest }) => rest);

            const payload = {
                organization_id: user?.organization_id,
                name,
                trigger_type: triggerType,
                trigger_config: cleanTriggerConfig,
                actions: cleanActions,
                is_active: isActive,
                updated_at: new Date().toISOString()
            };

            let error;
            if (id) {
                const { error: updateError } = await supabase
                    .from("automations")
                    .update(payload)
                    .eq("id", id);
                error = updateError;
            } else {
                const { error: insertError } = await supabase
                    .from("automations")
                    .insert(payload);
                error = insertError;
            }

            if (error) throw error;

            toast.success("Automação salva com sucesso!");
            navigate("/automacoes");
        } catch (error) {
            console.error("Error saving automation:", error);
            toast.error("Erro ao salvar automação.");
        } finally {
            setSaving(false);
        }
    };

    const addAction = (type: 'add_tag' | 'send_whatsapp') => {
        setActions([...actions, {
            id: `action-${Date.now()}`,
            type,
            config: {}
        }]);
    };

    const removeAction = (actionId: string) => {
        setActions(actions.filter(a => a.id !== actionId));
    };

    const updateActionConfig = (actionId: string, updates: Partial<ActionConfig>) => {
        setActions(actions.map(a =>
            a.id === actionId ? { ...a, config: { ...a.config, ...updates } } : a
        ));
    };

    const handleJourneySelect = (journeyId: string) => {
        setTriggerConfig(prev => ({ ...prev, journey_id: journeyId, stage_id: undefined })); // Reset stage
        fetchStages(journeyId);
    }

    if (loading) {
        return <AutomationBuilderSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/automacoes")}>
                        <ArrowLeft className="w-4 h-4" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold">{id ? "Editar Automação" : "Nova Automação"}</h1>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <Label htmlFor="active-mode">Ativo</Label>
                        <Switch id="active-mode" checked={isActive} onCheckedChange={setIsActive} />
                    </div>
                    <Button onClick={handleSave} disabled={saving}>
                        <Save className="mr-2 h-4 w-4" />
                        {saving ? "Salvando..." : "Salvar"}
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column: Settings & Trigger */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Configurações Básicas</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome da Automação</Label>
                                <Input
                                    placeholder="Ex: Mensagem de Boas-vindas"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="border-l-4 border-l-primary/50">
                        <CardHeader>
                            <CardTitle>Gatilho</CardTitle>
                            <CardDescription>O que vai iniciar esta automação?</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Tipo de Gatilho</Label>
                                <Select
                                    value={triggerType}
                                    onValueChange={(val: any) => {
                                        setTriggerType(val);
                                        setTriggerConfig({}); // Reset config on type change
                                    }}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="form_submission">Formulário Preenchido</SelectItem>
                                        <SelectItem value="stage_entry">Entrada em Etapa (Fluxo)</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {triggerType === 'form_submission' && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label>Qual formulário?</Label>
                                    <Select
                                        value={triggerConfig.form_id || ""}
                                        onValueChange={(val) => setTriggerConfig({ form_id: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o formulário" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {forms.map(f => (
                                                <SelectItem key={f.id} value={f.id}>{f.title}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            )}

                            {triggerType === 'stage_entry' && (
                                <div className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <div className="space-y-2">
                                        <Label>Fluxo (Jornada)</Label>
                                        <Select
                                            value={triggerConfig.journey_id || ""}
                                            onValueChange={handleJourneySelect}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione o fluxo" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {journeys.map(j => (
                                                    <SelectItem key={j.id} value={j.id}>{j.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div className="space-y-2">
                                        <Label>Etapa</Label>
                                        <Select
                                            value={triggerConfig.stage_id || ""}
                                            onValueChange={(val) => setTriggerConfig(prev => ({ ...prev, stage_id: val }))}
                                            disabled={!triggerConfig.journey_id}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecione a etapa" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {stages.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.title}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Right Column: Key, Actions */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-xl font-semibold">Ações</h2>
                        <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => addAction('add_tag')}>
                                <Plus className="mr-2 h-3 w-3" /> Add Tag
                            </Button>

                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <div className="inline-block">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => addAction('send_whatsapp')}
                                                disabled={!whatsappConnected}
                                            >
                                                <Plus className="mr-2 h-3 w-3" /> WhatsApp
                                            </Button>
                                        </div>
                                    </TooltipTrigger>
                                    {!whatsappConnected && (
                                        <TooltipContent>
                                            <p>WhatsApp não está conectado</p>
                                        </TooltipContent>
                                    )}
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    </div>

                    <div className="space-y-4">
                        {actions.length === 0 ? (
                            <div className="border border-dashed rounded-lg p-8 text-center text-muted-foreground bg-muted/20">
                                Nenhuma ação configurada. Adicione ações acima.
                            </div>
                        ) : (
                            actions.map((action, index) => (
                                <div key={action.id} className="relative pl-8 animate-in slide-in-from-right-4 duration-300">
                                    {/* Connector Line */}
                                    <div className="absolute left-[11px] top-[-24px] bottom-0 w-[2px] bg-border last:bottom-auto last:h-1/2"></div>
                                    {/* Node Dot */}
                                    <div className="absolute left-0 top-6 w-6 h-6 rounded-full border bg-background flex items-center justify-center z-10 text-xs font-medium text-muted-foreground">
                                        {index + 1}
                                    </div>

                                    <Card className="relative group">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                                            onClick={() => removeAction(action.id)}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </Button>

                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-base font-medium flex items-center gap-2">
                                                {action.type === 'add_tag' ? 'Adicionar Tag' : 'Enviar WhatsApp'}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            {action.type === 'add_tag' && (
                                                <div className="space-y-2">
                                                    <Label>Selecionar Tag</Label>
                                                    <Select
                                                        value={action.config.tag_id || ""}
                                                        onValueChange={(val) => {
                                                            if (val === "create_new") {
                                                                setCurrentActionIdForTag(action.id);
                                                                setIsCreateTagDialogOpen(true);
                                                            } else {
                                                                updateActionConfig(action.id, { tag_id: val });
                                                            }
                                                        }}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Escolha a tag" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {tags.length > 0 && (
                                                                <>
                                                                    {tags.map(t => (
                                                                        <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                                                                    ))}
                                                                    <SelectSeparator />
                                                                </>
                                                            )}
                                                            <SelectItem
                                                                value="create_new"
                                                                className="justify-center pl-2 text-xs font-medium text-muted-foreground hover:text-foreground focus:text-foreground transition-colors"
                                                            >
                                                                + Criar Nova Tag
                                                            </SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            )}

                                            {action.type === 'send_whatsapp' && (
                                                <div className="space-y-2">
                                                    <Label>Mensagem</Label>
                                                    <VariableTextarea
                                                        className="min-h-[100px]"
                                                        placeholder="Ex: Olá @nome, tudo bem?"
                                                        value={action.config.message || ""}
                                                        onChange={(val) => updateActionConfig(action.id, { message: val })}
                                                        variables={[
                                                            { key: '@nome', label: 'Nome do Contato' }
                                                        ]}
                                                    />
                                                    <div className="mt-2 flex items-start gap-2.5 rounded-md border border-dashed border-border/60 bg-muted/10 p-2.5">
                                                        <div className="mt-0.5 rounded-md bg-primary/10 p-1 text-primary">
                                                            <Sparkles className="h-3 w-3" />
                                                        </div>
                                                        <div className="space-y-0.5">
                                                            <p className="text-xs font-medium text-foreground/90">Personalize sua mensagem</p>
                                                            <p className="text-[11px] text-muted-foreground">
                                                                Use <code className="mx-0.5 rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground border border-border">@nome</code> para inserir o nome automaticamente.
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            <CreateTagDialog
                open={isCreateTagDialogOpen}
                onOpenChange={setIsCreateTagDialogOpen}
                onSuccess={handleTagCreated}
            />
        </div>
    );
}
