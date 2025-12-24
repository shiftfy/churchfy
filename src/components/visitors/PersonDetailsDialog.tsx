import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
import { PersonTags } from "./PersonTags";

interface FieldDefinition {
    id: string;
    label: string;
    type: 'text' | 'date' | 'select' | 'checkbox';
    options?: string[];
}

interface Person {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    birthdate: string | null;
    stage_id: string | null;
    journey_id: string | null;
    created_at: string;
    is_archived?: boolean;
    custom_fields?: Record<string, any>;
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
    const [fieldDefinitions, setFieldDefinitions] = useState<FieldDefinition[]>([]);
    const [personCustomFields, setPersonCustomFields] = useState<Record<string, any>>({});



    const { user } = useAuth();

    useEffect(() => {
        if (open && user?.organization_id) {
            fetchJourneys();
            fetchFieldDefinitions();
        }
    }, [open, user]);

    useEffect(() => {
        if (person) {
            setSelectedJourneyId(person.journey_id);
            setPersonCustomFields(person.custom_fields || {});
        }
    }, [person]);



    const fetchFieldDefinitions = async () => {
        if (!user?.organization_id) {
            console.log("No organization ID found");
            return;
        }

        console.log("Fetching definitions for org:", user.organization_id);
        try {
            const { data, error } = await supabase
                .from("person_field_definitions")
                .select("*")
                .eq("organization_id", user.organization_id);

            if (error) {
                console.error("Error fetching definitions query:", error);
                throw error;
            }
            console.log("Fetched definitions:", data);
            setFieldDefinitions(data || []);
        } catch (error) {
            console.error("Error fetching definitions:", error);
        }
    };



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

            toast.success("Fluxo atualizado com sucesso!");
        } catch (error) {
            console.error("Error updating journey:", error);
            toast.error("Erro ao atualizar fluxo");
        } finally {
            setIsUpdatingJourney(false);
        }
    };

    const handleUpdateField = async (key: string, value: any) => {
        if (!person) return;

        const newCustomFields = {
            ...personCustomFields,
            [key]: value
        };

        // Optimistic update
        setPersonCustomFields(newCustomFields);

        try {
            const { error } = await supabase
                .from("people")
                .update({
                    custom_fields: newCustomFields,
                    updated_at: new Date().toISOString()
                })
                .eq("id", person.id);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating field:", error);
            toast.error("Erro ao atualizar campo.");
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

    // Use address from person record, or fallback to latest response extraction
    const addressValue = person.address || (form?.fields.find(f => f.type === 'address') ? responses[form.fields.find(f => f.type === 'address')!.id] : null);

    // Extract all Prayer Requests
    const getAllPrayerRequests = () => {
        if (!person.visitor_responses) return [];
        const requests: { date: string; request: string; formTitle: string }[] = [];

        person.visitor_responses.forEach(resp => {
            if (!resp.forms) return;
            resp.forms?.fields.forEach(field => {
                if (field.type === 'prayer_request') {
                    const value = resp.responses[field.id];
                    if (value) {
                        requests.push({
                            date: resp.created_at,
                            request: value,
                            formTitle: resp.forms?.title || "Sem título"
                        });
                    }
                }
            });
        });

        return requests.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    };

    const prayerRequests = getAllPrayerRequests();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
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

                <div className="px-6 pb-2">
                    {user?.organization_id && (
                        <PersonTags
                            personId={person.id}
                            organizationId={user.organization_id}
                        />
                    )}
                </div>

                <Tabs defaultValue="details" className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="details">Dados Pessoais</TabsTrigger>
                        <TabsTrigger value="responses">Respostas</TabsTrigger>
                        <TabsTrigger value="prayer_requests">Orações</TabsTrigger>
                        <TabsTrigger value="journey">Fluxo</TabsTrigger>
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
                                        <Label>Email</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm">
                                            {person.email || "-"}
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Data de Nascimento</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm">
                                            {person.birthdate ? format(new Date(person.birthdate), "dd/MM/yyyy", { locale: ptBR }) : "-"}
                                        </div>
                                    </div>
                                    <div className="grid gap-2">
                                        <Label>Data de Cadastro</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm">
                                            {format(new Date(person.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                                        </div>
                                    </div>
                                </div>

                                {addressValue && (
                                    <div className="grid gap-2">
                                        <Label>Endereço</Label>
                                        <div className="p-3 bg-muted rounded-md text-sm whitespace-pre-wrap">
                                            {addressValue}
                                        </div>
                                    </div>
                                )}

                                {/* Custom Fields Section */}
                                <div className="pt-4 border-t">
                                    <div className="flex items-center justify-between mb-2">
                                        <Label className="text-base font-semibold">Informações Adicionais</Label>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        {fieldDefinitions.length > 0 ? (
                                            fieldDefinitions.map((def) => {
                                                // Find value by ID first, then Label (for legacy support)
                                                let value = personCustomFields[def.id];
                                                if (value === undefined && personCustomFields[def.label] !== undefined) {
                                                    value = personCustomFields[def.label];
                                                }

                                                const isDate = def.type === 'date';
                                                const isCheckbox = def.type === 'checkbox';
                                                const isSelect = def.type === 'select';

                                                return (
                                                    <div key={def.id} className="grid gap-2">
                                                        <Label className="text-xs text-muted-foreground uppercase">{def.label}</Label>

                                                        {isCheckbox ? (
                                                            <div className="flex items-center h-[40px] px-1">
                                                                <div className="flex items-center space-x-2">
                                                                    <Switch
                                                                        checked={!!value}
                                                                        onCheckedChange={(checked) => handleUpdateField(def.id, checked)}
                                                                    />
                                                                    <span className="text-sm text-foreground">
                                                                        {value ? "Sim" : "Não"}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ) : isSelect && def.options ? (
                                                            <Select
                                                                value={value?.toString() || ""}
                                                                onValueChange={(val) => handleUpdateField(def.id, val)}
                                                            >
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Selecione..." />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {def.options.map((opt) => (
                                                                        <SelectItem key={opt} value={opt}>
                                                                            {opt}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>
                                                        ) : (
                                                            <Input
                                                                type={isDate ? "date" : "text"}
                                                                value={value || ""}
                                                                onChange={(e) => {
                                                                    const newVal = e.target.value;
                                                                    // Update local state immediately
                                                                    setPersonCustomFields(prev => ({ ...prev, [def.id]: newVal }));
                                                                }}
                                                                onBlur={(e) => {
                                                                    handleUpdateField(def.id, e.target.value);
                                                                }}
                                                                className="bg-muted/50 focus:bg-background"
                                                                placeholder={isDate ? "" : "Digite aqui..."}
                                                            />
                                                        )}
                                                    </div>
                                                );
                                            })
                                        ) : (
                                            <div className="col-span-full text-center py-4 text-sm text-muted-foreground border-2 border-dashed rounded-lg">
                                                Nenhum campo personalizado configurado.
                                            </div>
                                        )}
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
                                                return !label.includes('nome completo') &&
                                                    !label.includes('whatsapp') &&
                                                    field.type !== 'address' && // Already shown in details
                                                    field.type !== 'prayer_request'; // Shown in own tab
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
                                                        <div className="p-3 bg-secondary/30 rounded-md text-sm whitespace-pre-wrap">
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

                        {/* Tab 3: Pedidos de Oração */}
                        <TabsContent value="prayer_requests" className="space-y-4 mt-0">
                            {prayerRequests.length > 0 ? (
                                <div className="space-y-4">
                                    {prayerRequests.map((req, idx) => (
                                        <div key={idx} className="border rounded-lg p-4 bg-card space-y-2">
                                            <div className="flex justify-between items-center text-xs text-muted-foreground">
                                                <span>{format(new Date(req.date), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                                <span className="bg-muted px-2 py-0.5 rounded text-[10px]">{req.formTitle}</span>
                                            </div>
                                            <p className="text-sm whitespace-pre-wrap leading-relaxed">
                                                {req.request}
                                            </p>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center text-muted-foreground py-8 border-2 border-dashed rounded-lg">
                                    Nenhum pedido de oração encontrado.
                                </div>
                            )}
                        </TabsContent>

                        {/* Tab 4: Fluxo */}
                        <TabsContent value="journey" className="space-y-4 mt-0">
                            <div className="space-y-4">
                                <div className="grid gap-2">
                                    <Label>Fluxo Atual</Label>
                                    <Select
                                        value={selectedJourneyId || "none"}
                                        onValueChange={handleJourneyChange}
                                        disabled={isUpdatingJourney}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione um fluxo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none" disabled>Sem Fluxo</SelectItem>
                                            {journeys.map((journey) => (
                                                <SelectItem key={journey.id} value={journey.id}>
                                                    {journey.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <p className="text-xs text-muted-foreground">
                                        Ao mudar o fluxo, a pessoa será movida para o primeiro estágio do novo fluxo.
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
            </DialogContent >

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
