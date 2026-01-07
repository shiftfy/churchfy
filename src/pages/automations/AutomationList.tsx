import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { Plus, GitMerge, ArrowRight, Trash2, Edit2, Zap, MessageSquare, Tag as TagIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Automation {
    id: string;
    organization_id: string;
    name: string;
    trigger_type: 'form_submission' | 'stage_entry';
    trigger_config: any;
    actions: any[];
    is_active: boolean;
    created_at: string;
}

export function AutomationList() {
    const { user } = useAuth();
    const [automations, setAutomations] = useState<Automation[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (user?.organization_id) {
            fetchAutomations();
        }
    }, [user?.organization_id]);

    const fetchAutomations = async () => {
        try {
            const { data, error } = await supabase
                .from("automations")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setAutomations(data || []);
        } catch (error) {
            console.error("Error fetching automations:", error);
            toast.error("Erro ao carregar automações.");
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (automation: Automation) => {
        try {
            const newStatus = !automation.is_active;
            const { error } = await supabase
                .from("automations")
                .update({ is_active: newStatus })
                .eq("id", automation.id);

            if (error) throw error;

            setAutomations(prev => prev.map(a =>
                a.id === automation.id ? { ...a, is_active: newStatus } : a
            ));

            toast.success(`Automação ${newStatus ? 'ativada' : 'desativada'}!`);
        } catch (error) {
            console.error("Error updating automation status:", error);
            toast.error("Erro ao atualizar status.");
        }
    };

    const deleteAutomation = async (id: string) => {
        if (!confirm("Tem certeza que deseja excluir esta automação?")) return;

        try {
            const { error } = await supabase
                .from("automations")
                .delete()
                .eq("id", id);

            if (error) throw error;

            setAutomations(prev => prev.filter(a => a.id !== id));
            toast.success("Automação excluída!");
        } catch (error) {
            console.error("Error deleting automation:", error);
            toast.error("Erro ao excluir.");
        }
    };

    const getTriggerLabel = (type: string) => {
        switch (type) {
            case 'form_submission': return 'Formulário Preenchido';
            case 'stage_entry': return 'Mudança de Fase';
            default: return type;
        }
    };

    const getActionIcon = (type: string) => {
        switch (type) {
            case 'add_tag': return <TagIcon className="w-3 h-3 text-indigo-500" />;
            case 'send_whatsapp': return <MessageSquare className="w-3 h-3 text-green-500" />;
            default: return <Zap className="w-3 h-3" />;
        }
    };

    const getActionLabel = (type: string) => {
        switch (type) {
            case 'add_tag': return 'Adicionar Tag';
            case 'send_whatsapp': return 'Enviar WhatsApp';
            default: return type;
        }
    };


    if (loading) {
        return (
            <div className="space-y-6">
                {/* Menu - sem animação */}
                <SectionTabs
                    items={[
                        { label: "Automações", href: "/automacoes" },
                        { label: "WhatsApp", href: "/whatsapp" },
                    ]}
                />

                {/* Conteúdo - com animação */}
                <div className="animate-in fade-in duration-300 space-y-6">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Automações</h1>
                            <p className="text-muted-foreground mt-1">
                                Crie fluxos automáticos para engajar seus visitantes e membros.
                            </p>
                        </div>
                        <div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
                    </div>

                    {/* Skeleton cards */}
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {Array.from({ length: 3 }).map((_, i) => (
                            <Card key={i} className="relative overflow-hidden">
                                <CardContent className="p-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="h-5 w-32 bg-muted animate-pulse rounded" />
                                        <div className="h-5 w-10 bg-muted animate-pulse rounded-full" />
                                    </div>
                                    <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                                    <div className="flex items-center gap-2">
                                        <div className="h-6 w-16 bg-muted animate-pulse rounded-full" />
                                        <div className="h-6 w-20 bg-muted animate-pulse rounded-full" />
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Menu - sem animação */}
            <SectionTabs
                items={[
                    { label: "Automações", href: "/automacoes" },
                    { label: "WhatsApp", href: "/whatsapp" },
                ]}
            />

            {/* Conteúdo - com animação */}
            <div className="animate-in fade-in duration-300 space-y-6">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Automações</h1>
                        <p className="text-muted-foreground mt-1">
                            Crie fluxos automáticos para engajar seus visitantes e membros.
                        </p>
                    </div>
                    <Button asChild>
                        <Link to="/automacoes/nova">
                            <Plus className="mr-2 h-4 w-4" />
                            Nova Automação
                        </Link>
                    </Button>
                </div>

                {automations.length === 0 ? (
                    <Card className="border-dashed">
                        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
                            <div className="w-16 h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                                <GitMerge className="w-8 h-8 text-muted-foreground" />
                            </div>
                            <h3 className="text-lg font-medium mb-2">Nenhuma automação criada</h3>
                            <p className="text-muted-foreground max-w-sm mb-6">
                                Comece criando sua primeira automação para enviar mensagens ou adicionar tags automaticamente.
                            </p>
                            <Button asChild>
                                <Link to="/automacoes/nova">
                                    <Plus className="mr-2 h-4 w-4" />
                                    Criar Automação
                                </Link>
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid gap-3">
                        {automations.map((automation) => (
                            <Card key={automation.id} className={`transition-all hover:shadow-md ${!automation.is_active ? 'opacity-75 bg-muted/30' : 'bg-card'}`}>
                                {/* Header Section - Compact */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 pb-2 gap-4">
                                    <div className="flex items-center gap-3">
                                        <div>
                                            <CardTitle className="text-base font-semibold leading-none mb-1 flex items-center gap-2">
                                                {automation.name}
                                            </CardTitle>
                                            <CardDescription className="text-xs">
                                                Criado em {format(new Date(automation.created_at), "dd MMM, yyyy", { locale: ptBR })}
                                            </CardDescription>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                        <div className="flex items-center gap-2 mr-2">
                                            <Switch
                                                checked={automation.is_active}
                                                onCheckedChange={() => toggleStatus(automation)}
                                                className="scale-90"
                                            />
                                            <span className="text-xs font-medium text-muted-foreground w-12">
                                                {automation.is_active ? 'Ativo' : 'Pausa'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 border-l pl-2 h-6">
                                            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
                                                <Link to={`/automacoes/editar/${automation.id}`}>
                                                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteAutomation(automation.id)}>
                                                <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>

                                {/* Actions Flow Section */}
                                <div className="px-4 pb-4">
                                    <div className="flex flex-wrap items-center gap-2 text-sm p-2.5 bg-muted/40 rounded-md border border-border/50">
                                        {/* Trigger Badge */}
                                        <Badge variant="outline" className="bg-background shadow-xs text-muted-foreground hover:bg-background pr-3">
                                            <Zap className="w-3 h-3 mr-1.5 text-amber-500 fill-amber-500/20" />
                                            {getTriggerLabel(automation.trigger_type)}
                                        </Badge>

                                        {/* Flow Arrow */}
                                        <ArrowRight className="w-3 h-3 text-muted-foreground/40" />

                                        {/* Actions List */}
                                        {automation.actions.map((action, index) => (
                                            <div key={index} className="flex items-center gap-2">
                                                <Badge variant="secondary" className="bg-background/80 border shadow-xs text-foreground font-normal">
                                                    <span className="mr-1.5 opacity-80">{getActionIcon(action.type)}</span>
                                                    {getActionLabel(action.type)}
                                                </Badge>
                                                {index < automation.actions.length - 1 && (
                                                    <ArrowRight className="w-3 h-3 text-muted-foreground/40" />
                                                )}
                                            </div>
                                        ))}

                                        {automation.actions.length === 0 && (
                                            <span className="text-xs text-muted-foreground italic ml-1">Sem ações configuradas</span>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
