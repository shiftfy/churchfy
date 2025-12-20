import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { FormField } from "@/types/form";
import { supabase, type Journey } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Person {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    birthdate: string | null;
    stage_id: string | null;
    journey_id: string | null;
    created_at: string;
    is_archived?: boolean;
    visitor_responses?: {
        created_at: string;
        responses: Record<string, any>;
        forms?: {
            title: string;
            fields: FormField[];
        } | null;
    }[];
}

interface PersonDetailsDialogProps {
    person: Person | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onDelete: (personId: string) => void;
    onArchive: (personId: string, isArchived: boolean) => void;
    onJourneyChange?: () => void;
    journeyTitle?: string;
}

export function PersonDetailsDialog({ person, open, onOpenChange, onDelete, onArchive, onJourneyChange, journeyTitle }: PersonDetailsDialogProps) {
    const [isDeleting, setIsDeleting] = useState(false);
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [selectedJourneyId, setSelectedJourneyId] = useState<string | null>(null);
    const [isUpdatingJourney, setIsUpdatingJourney] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        if (open && user?.organization_id) {
            fetchJourneys();
        }
    }, [open, user]);

    useEffect(() => {
        if (person) {
            setSelectedJourneyId(person.journey_id);
        }
    }, [person]);

    const fetchJourneys = async () => {
        try {
            const { data, error } = await supabase
                .from("journeys")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .order("created_at");

            if (error) throw error;
            setJourneys(data || []);
        } catch (error) {
            console.error("Error fetching journeys:", error);
        }
    };

    const handleJourneyChange = async (newJourneyId: string) => {
        if (!person) return;

        setIsUpdatingJourney(true);
        try {
            // Get the first stage of the new journey
            const { data: stages, error: stagesError } = await supabase
                .from("visitor_stages")
                .select("id")
                .eq("journey_id", newJourneyId)
                .order("position")
                .limit(1);

            if (stagesError) throw stagesError;

            const firstStageId = stages?.[0]?.id || null;

            // Update person's journey and stage
            const { error: updateError } = await supabase
                .from("people")
                .update({
                    journey_id: newJourneyId,
                    stage_id: firstStageId,
                    updated_at: new Date().toISOString()
                })
                .eq("id", person.id);

            if (updateError) throw updateError;

            setSelectedJourneyId(newJourneyId);

            // Notify parent to refresh data
            if (onJourneyChange) {
                onJourneyChange();
            }

            toast.success("Jornada atualizada com sucesso!");
        } catch (error) {
            console.error("Error updating journey:", error);
            toast.error("Erro ao atualizar jornada");
        } finally {
            setIsUpdatingJourney(false);
        }
    };

    if (!person) return null;

    const getLatestResponse = () => {
        if (!person.visitor_responses || person.visitor_responses.length === 0) return null;
        return [...person.visitor_responses].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
    };

    const latestResponse = getLatestResponse();
    const form = latestResponse?.forms;
    const responses = latestResponse?.responses || {};

    // Get first name only
    const firstName = person.name.split(' ')[0];

    // Find current journey title for display
    const currentJourneyTitle = journeys.find(j => j.id === selectedJourneyId)?.title || journeyTitle;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center justify-between">
                        <span>Informações de {firstName}</span>
                        {currentJourneyTitle && (
                            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-1 rounded-full border">
                                {currentJourneyTitle}
                            </span>
                        )}
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="details">Dados Pessoais</TabsTrigger>
                        <TabsTrigger value="responses">Respostas</TabsTrigger>
                        <TabsTrigger value="journey">Jornada</TabsTrigger>
                    </TabsList>

                    <div className="py-4">
                        {/* Tab 1: Dados Pessoais */}
                        <TabsContent value="details" className="space-y-4 mt-0">
                            <div className="grid gap-4">
                                <div className="grid gap-2">
                                    <Label>Nome Completo</Label>
                                    <div className="p-3 bg-muted rounded-md text-sm font-medium">
                                        {person.name}
                                    </div>
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label>WhatsApp</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm">
                                            {person.phone || "-"}
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Data de Cadastro</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm">
                                            {format(new Date(person.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </TabsContent>

                        {/* Tab 2: Respostas */}
                        <TabsContent value="responses" className="space-y-4 mt-0">
                            {form ? (
                                <div className="space-y-4">
                                    <h3 className="font-medium text-sm text-muted-foreground mb-2">
                                        Formulário: {form.title}
                                    </h3>
                                    <div className="grid gap-4">
                                        {form.fields
                                            .filter((field) => {
                                                const label = field.label.toLowerCase();
                                                return !label.includes('nome completo') && !label.includes('whatsapp');
                                            })
                                            .map((field) => {
                                                const value = responses[field.id];
                                                let displayValue = value;

                                                if (value === undefined || value === null || value === "") {
                                                    displayValue = "-";
                                                } else if (typeof value === "boolean") {
                                                    displayValue = value ? "Sim" : "Não";
                                                }

                                                return (
                                                    <div key={field.id} className="grid gap-2">
                                                        <Label className="text-muted-foreground">{field.label}</Label>
                                                        <div className="p-3 bg-secondary/30 rounded-md text-sm">
                                                            {displayValue}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                    </div>
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                                    Nenhum formulário vinculado encontrado.
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 3: Jornada */}
                        <TabsContent value="journey" className="space-y-4 mt-0">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Jornada Atual</Label>
                                    <Select
                                        value={selectedJourneyId || "none"}
                                        onValueChange={handleJourneyChange}
                                        disabled={isUpdatingJourney}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione uma jornada" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" disabled>Sem Jornada</SelectItem>
                                            {journeys.map((journey) => (
                                                <SelectItem key={journey.id} value={journey.id}>
                                                    {journey.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Ao mudar a jornada, a pessoa será movida para o primeiro estágio da nova jornada.
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </div>
                </Tabs>

                <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:justify-between w-full border-t pt-4 mt-0">
                    <Button
                        variant="destructive"
                        onClick={() => setIsDeleting(true)}
                        className="w-full sm:w-auto"
                    >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Excluir
                    </Button>

                    <Button
                        variant={person.is_archived ? "outline" : "secondary"}
                        className="w-full sm:w-auto"
                        onClick={() => onArchive(person.id, !person.is_archived)}
                    >
                        {person.is_archived ? (
                            <>
                                <ArchiveRestore className="w-4 h-4 mr-2" />
                                Desarquivar
                            </>
                        ) : (
                            <>
                                <Archive className="w-4 h-4 mr-2" />
                                Arquivar
                            </>
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>

            <AlertDialog open={isDeleting} onOpenChange={setIsDeleting}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Cadastro</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir este cadastro? Esse contato será perdido permanentemente e não poderá ser recuperado.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (person) {
                                    onDelete(person.id);
                                }
                                setIsDeleting(false);
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Dialog >
    );
}
