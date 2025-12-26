import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Plus, GitMerge, ArrowRight, Trash2, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { AutomationListSkeleton } from "@/components/ui/skeleton";
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


    if (loading) {
        return <AutomationListSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Automações</h1>
                    <p className="text-muted-foreground">
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
                <div className="grid gap-4">
                    {automations.map((automation) => (
                        <Card key={automation.id} className={`transition-all hover:shadow-sm ${!automation.is_active ? 'opacity-75 bg-muted/20' : ''}`}>
                            <CardHeader className="p-4 sm:p-6">
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <CardTitle className="text-lg">{automation.name}</CardTitle>
                                            <Badge variant={automation.is_active ? "default" : "secondary"}>
                                                {automation.is_active ? "Ativo" : "Pausado"}
                                            </Badge>
                                        </div>
                                        <CardDescription className="flex items-center gap-2 text-xs sm:text-sm">
                                            <span>
                                                Criado em {format(new Date(automation.created_at), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                            </span>
                                        </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                        <div className="flex items-center gap-2 mr-2">
                                            <Switch
                                                checked={automation.is_active}
                                                onCheckedChange={() => toggleStatus(automation)}
                                            />
                                            <span className="text-sm text-muted-foreground hidden sm:inline-block">
                                                {automation.is_active ? 'Ativado' : 'Pausado'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-1 border-l pl-2 ml-2">
                                            <Button variant="ghost" size="icon" asChild>
                                                <Link to={`/automacoes/editar/${automation.id}`}>
                                                    <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                                </Link>
                                            </Button>
                                            <Button variant="ghost" size="icon" onClick={() => deleteAutomation(automation.id)}>
                                                <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6 pt-0">
                                <div className="flex items-center gap-2 text-sm mt-2 p-3 bg-muted/30 rounded-lg border border-border/50">
                                    <Badge variant="outline" className="bg-background">
                                        Gatilho: {getTriggerLabel(automation.trigger_type)}
                                    </Badge>
                                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-muted-foreground">
                                        {automation.actions.length} {automation.actions.length === 1 ? 'ação' : 'ações'}
                                    </span>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
