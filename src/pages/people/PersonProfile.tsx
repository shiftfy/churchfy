import { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { ArrowLeft, Save, Phone, Search, UserCheck, X } from "lucide-react";
import { toast } from "sonner";
import { PersonHistoryTimeline } from "@/components/people/PersonHistoryTimeline";
import { PersonPhotoUpload } from "@/components/people/PersonPhotoUpload";
import { PersonTags } from "@/components/visitors/PersonTags";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Person {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    birthdate: string | null;
    stage_id: string | null;
    journey_id: string | null;
    photo_url: string | null;
    custom_fields: Record<string, any>;
    created_at: string;
    visitor_responses?: any[];
    organization_id: string;
    observations?: string;
    discipler_id?: string | null;
}

export function PersonProfile() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [person, setPerson] = useState<Person | null>(null);
    const [initialPerson, setInitialPerson] = useState<Person | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);

    // Custom Fields State
    const [fieldDefinitions, setFieldDefinitions] = useState<any[]>([]);
    const [personCustomFields, setPersonCustomFields] = useState<Record<string, any>>({});
    const originalFieldValues = useRef<Record<string, any>>({});

    // Observations State
    const [observations, setObservations] = useState("");
    const originalObservations = useRef("");


    // Journey State
    const [journeys, setJourneys] = useState<any[]>([]);
    const [stages, setStages] = useState<any[]>([]);

    // Discipler State
    const [disciplers, setDisciplers] = useState<any[]>([]);
    const [selectedDiscipler, setSelectedDiscipler] = useState<any | null>(null);
    const [disciplerSearchQuery, setDisciplerSearchQuery] = useState("");
    const [disciplerPopoverOpen, setDisciplerPopoverOpen] = useState(false);

    useEffect(() => {
        if (id) {
            fetchPerson();
            fetchJourneys();
        }
    }, [id]);

    useEffect(() => {
        if (person?.organization_id) {
            fetchFieldDefinitions();
        }
    }, [person?.organization_id]);

    useEffect(() => {
        if (person?.journey_id) {
            fetchStages(person.journey_id);
        }
    }, [person?.journey_id]);

    useEffect(() => {
        if (person) {
            setPersonCustomFields(person.custom_fields || {});
            setObservations(person.observations || "");
            originalObservations.current = person.observations || "";
            // Load current discipler
            if (person.discipler_id) {
                fetchDisciplerById(person.discipler_id);
            } else {
                setSelectedDiscipler(null);
            }
        }
    }, [person]);

    useEffect(() => {
        if (person?.organization_id) {
            fetchDisciplers();
        }
    }, [person?.organization_id]);

    const fetchPerson = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("people")
                .select("*, visitor_responses(created_at, responses, forms(title, fields))")
                .eq("id", id)
                .single();

            if (error) throw error;
            // Ensure custom_fields is an object
            if (data && !data.custom_fields) data.custom_fields = {};
            setPerson(data);
            setInitialPerson(JSON.parse(JSON.stringify(data))); // Deep copy for comparison
        } catch (error) {
            console.error("Error fetching person:", error);
            toast.error("Erro ao carregar perfil");
            navigate("/visitantes");
        } finally {
            setLoading(false);
        }
    };

    const fetchJourneys = async () => {
        const { data } = await supabase.from("journeys").select("*").order("title");
        if (data) setJourneys(data);
    };

    const fetchStages = async (journeyId: string) => {
        const { data } = await supabase
            .from("visitor_stages")
            .select("*")
            .eq("journey_id", journeyId)
            .order("position");
        if (data) setStages(data);
    };

    const fetchDisciplers = async () => {
        if (!person?.organization_id) return;
        const { data } = await supabase
            .from("people")
            .select("id, name, phone, photo_url")
            .eq("organization_id", person.organization_id)
            .eq("is_discipler", true)
            .order("name");
        if (data) setDisciplers(data);
    };

    const fetchDisciplerById = async (disciplerId: string) => {
        const { data } = await supabase
            .from("people")
            .select("id, name, phone, photo_url")
            .eq("id", disciplerId)
            .single();
        if (data) setSelectedDiscipler(data);
    };

    const handleSelectDiscipler = async (discipler: any) => {
        if (!person) return;

        const oldDiscipler = selectedDiscipler;

        try {
            const { error } = await supabase
                .from("people")
                .update({
                    discipler_id: discipler.id,
                    updated_at: new Date().toISOString()
                })
                .eq("id", person.id);

            if (error) throw error;

            // Get current user for history
            const { data: { user } } = await supabase.auth.getUser();

            // Log to person_history
            await supabase.from("person_history").insert({
                person_id: person.id,
                organization_id: person.organization_id,
                action_type: 'info_update',
                description: 'Discipulador atribuído',
                metadata: {
                    Antes: oldDiscipler?.name || "-",
                    Depois: discipler.name
                },
                created_by: user?.id
            });

            setSelectedDiscipler(discipler);
            setPerson({ ...person, discipler_id: discipler.id });
            setDisciplerPopoverOpen(false);
            setDisciplerSearchQuery("");
            setHistoryRefreshTrigger(prev => prev + 1);
            toast.success(`Discipulador definido: ${discipler.name}`);
        } catch (error) {
            console.error("Error setting discipler:", error);
            toast.error("Erro ao definir discipulador.");
        }
    };

    const handleRemoveDiscipler = async () => {
        if (!person) return;

        const oldDiscipler = selectedDiscipler;

        try {
            const { error } = await supabase
                .from("people")
                .update({
                    discipler_id: null,
                    updated_at: new Date().toISOString()
                })
                .eq("id", person.id);

            if (error) throw error;

            // Get current user for history
            const { data: { user } } = await supabase.auth.getUser();

            // Log to person_history
            await supabase.from("person_history").insert({
                person_id: person.id,
                organization_id: person.organization_id,
                action_type: 'info_update',
                description: 'Discipulador removido',
                metadata: {
                    Antes: oldDiscipler?.name || "-",
                    Depois: "-"
                },
                created_by: user?.id
            });

            setSelectedDiscipler(null);
            setPerson({ ...person, discipler_id: null });
            setHistoryRefreshTrigger(prev => prev + 1);
            toast.success("Discipulador removido.");
        } catch (error) {
            console.error("Error removing discipler:", error);
            toast.error("Erro ao remover discipulador.");
        }
    };

    const fetchFieldDefinitions = async () => {
        if (!person?.organization_id) return;

        try {
            const { data, error } = await supabase
                .from("person_field_definitions")
                .select("*")
                .eq("organization_id", person.organization_id);

            if (error) throw error;
            setFieldDefinitions(data || []);
        } catch (error) {
            console.error("Error fetching field definitions:", error);
        }
    };

    const handleUpdateCustomField = async (key: string, value: any, oldValue?: any) => {
        if (!person) return;

        // Capture old value BEFORE any updates
        const previousValue = oldValue !== undefined ? oldValue : personCustomFields[key];

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

            // Find field definition to get the label
            const fieldDef = fieldDefinitions.find(def => def.id === key);
            const fieldLabel = fieldDef?.label || key;
            const isDateField = fieldDef?.type === 'date';
            const isCheckboxField = fieldDef?.type === 'checkbox';

            // Format values for display in history
            const formatValue = (val: any) => {
                if (val === undefined || val === null || val === "") return "-";

                // Format boolean values
                if (isCheckboxField || typeof val === 'boolean') {
                    return val === true || val === 'true' ? "Verdadeiro" : "Falso";
                }

                // Format date values
                if (isDateField && typeof val === 'string' && val.match(/^\d{4}-\d{2}-\d{2}$/)) {
                    // Convert YYYY-MM-DD to DD/MM/YYYY
                    const [year, month, day] = val.split('-');
                    return `${day}/${month}/${year}`;
                }

                return val;
            };

            // Get current user for history
            const { data: { user } } = await supabase.auth.getUser();

            // Log to person_history with old and new values
            await supabase.from("person_history").insert({
                person_id: person.id,
                organization_id: person.organization_id,
                action_type: 'info_update',
                description: `Campo atualizado: ${fieldLabel}`,
                metadata: {
                    Antes: formatValue(previousValue),
                    Depois: formatValue(value)
                },
                created_by: user?.id
            });

            setHistoryRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Error updating custom field:", error);
            toast.error("Erro ao atualizar campo.");
        }
    };

    const handleUpdateObservations = async () => {
        if (!person) return;

        const oldValue = originalObservations.current;
        const newValue = observations;

        // Only update if value changed
        if (oldValue === newValue) return;

        try {
            const { error } = await supabase
                .from("people")
                .update({
                    observations: newValue,
                    updated_at: new Date().toISOString()
                })
                .eq("id", person.id);

            if (error) throw error;

            // Get current user for history
            const { data: { user } } = await supabase.auth.getUser();

            // Log to person_history
            await supabase.from("person_history").insert({
                person_id: person.id,
                organization_id: person.organization_id,
                action_type: 'info_update',
                description: 'Observações atualizadas',
                metadata: {
                    Antes: oldValue || "-",
                    Depois: newValue || "-"
                },
                created_by: user?.id
            });

            // Update original value and person state
            originalObservations.current = newValue;
            if (person) {
                setPerson({ ...person, observations: newValue });
            }
            setHistoryRefreshTrigger(prev => prev + 1);
        } catch (error) {
            console.error("Error updating observations:", error);
            toast.error("Erro ao atualizar observações.");
        }
    };


    const handleSave = async () => {
        if (!person || !initialPerson) return;
        setSaving(true);
        try {
            const { error } = await supabase
                .from("people")
                .update({
                    name: person.name,
                    phone: person.phone,
                    email: person.email,
                    birthdate: person.birthdate,
                    custom_fields: personCustomFields,
                    observations: observations
                })
                .eq("id", person.id);

            if (error) throw error;

            // Detect changes for history
            const changes: Record<string, any> = {};
            if (person.name !== initialPerson.name) changes.nome = person.name;
            if (person.email !== initialPerson.email) changes.email = person.email;
            if (person.phone !== initialPerson.phone) changes.telefone = person.phone;
            if (person.birthdate !== initialPerson.birthdate) changes.nascimento = person.birthdate;

            // Check custom fields changes
            const oldFields = initialPerson.custom_fields || {};
            const newFields = person.custom_fields || {};
            Object.keys({ ...oldFields, ...newFields }).forEach(key => {
                if (oldFields[key] !== newFields[key]) {
                    changes[key] = newFields[key];
                }
            });

            if (Object.keys(changes).length > 0) {
                // Log history
                await supabase.from("person_history").insert({
                    person_id: person.id,
                    organization_id: person.organization_id,
                    action_type: 'info_update',
                    description: 'Informações atualizadas',
                    metadata: changes,
                    created_by: (await supabase.auth.getUser()).data.user?.id
                });
                setHistoryRefreshTrigger(prev => prev + 1);
            }

            const updatedPerson = { ...person, custom_fields: personCustomFields, observations: observations };
            setInitialPerson(JSON.parse(JSON.stringify(updatedPerson)));
            setPerson(updatedPerson);
            originalObservations.current = observations;
            toast.success("Perfil salvo com sucesso!");
        } catch (error) {
            console.error("Error saving person:", error);
            toast.error("Erro ao salvar");
        } finally {
            setSaving(false);
        }
    };

    const handleStageChange = async (newStageId: string) => {
        if (!person) return;
        const oldStage = stages.find(s => s.id === person.stage_id)?.title;
        const newStage = stages.find(s => s.id === newStageId)?.title;

        // Optimistic update
        setPerson({ ...person, stage_id: newStageId });

        try {
            await supabase.from("people").update({ stage_id: newStageId }).eq("id", person.id);

            // Log history
            await supabase.from("person_history").insert({
                person_id: person.id,
                organization_id: person.organization_id,
                action_type: 'stage_change',
                description: `Alterou a etapa`,
                metadata: { old_stage: oldStage, new_stage: newStage },
                created_by: (await supabase.auth.getUser()).data.user?.id
            });
            setHistoryRefreshTrigger(prev => prev + 1);
            toast.success("Fase atualizada!");
        } catch (error) {
            console.error("Error changing stage", error);
            fetchPerson(); // revert
        }
    };

    const handleJourneyChange = async (newJourneyId: string) => {
        if (!person) return;
        const oldJourney = journeys.find(j => j.id === person.journey_id)?.title;
        const newJourney = journeys.find(j => j.id === newJourneyId)?.title;

        try {
            // Fetch stages for the new journey first to get the first stage
            const { data: newStages } = await supabase
                .from("visitor_stages")
                .select("*")
                .eq("journey_id", newJourneyId)
                .order("position");

            const firstStageId = newStages?.[0]?.id || null;

            // Optimistic update
            setPerson({ ...person, journey_id: newJourneyId, stage_id: firstStageId });
            setStages(newStages || []);

            // Update in DB
            await supabase.from("people").update({
                journey_id: newJourneyId,
                stage_id: firstStageId
            }).eq("id", person.id);

            // Log history
            await supabase.from("person_history").insert({
                person_id: person.id,
                organization_id: person.organization_id,
                action_type: 'journey_change',
                description: `Alterou o fluxo`,
                metadata: { old_journey: oldJourney, new_journey: newJourney },
                created_by: (await supabase.auth.getUser()).data.user?.id
            });
            setHistoryRefreshTrigger(prev => prev + 1);
            toast.success("Fluxo atualizado!");
        } catch (error) {
            console.error("Error changing journey", error);
            toast.error("Erro ao alterar fluxo");
            fetchPerson(); // revert
        }
    };

    if (loading) {
        return (
            <div className="container mx-auto py-6 max-w-5xl space-y-8 animate-in fade-in duration-500">
                {/* Header Skeleton */}
                <div>
                    <Button variant="ghost" disabled className="mb-6">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                    </Button>
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                        <Skeleton className="h-32 w-32 rounded-full" />

                        <div className="flex-1 space-y-3">
                            <Skeleton className="h-10 w-64" />
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-4" />
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                        </div>

                        <Skeleton className="h-10 w-40" />
                    </div>
                </div>

                {/* Tabs Skeleton */}
                <div className="space-y-6">
                    <div className="flex border-b">
                        <div className="px-4 py-3 border-b-2 border-primary"><Skeleton className="h-5 w-24" /></div>
                        <div className="px-4 py-3"><Skeleton className="h-5 w-20" /></div>
                        <div className="px-4 py-3"><Skeleton className="h-5 w-32" /></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader><Skeleton className="h-6 w-32" /></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader><Skeleton className="h-6 w-40" /></CardHeader>
                            <CardContent className="space-y-4">
                                <Skeleton className="h-10 w-full" />
                                <Skeleton className="h-10 w-full" />
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        );
    }
    if (!person) return <div className="p-8">Pessoa não encontrada</div>;

    return (
        <div className="container mx-auto py-6 max-w-5xl space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div>
                <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                </Button>

                <div className="flex flex-col md:flex-row gap-6 items-start">
                    <PersonPhotoUpload
                        personId={person.id}
                        photoUrl={person.photo_url}
                        name={person.name}
                        onPhotoUpdate={(url) => setPerson({ ...person, photo_url: url })}
                    />

                    <div className="flex-1 space-y-2">
                        <h1 className="text-3xl font-bold">{person.name}</h1>
                        <div className="flex items-center gap-2 text-muted-foreground">
                            <Phone className="h-4 w-4" />
                            <span>
                                {person.phone || "Sem telefone"}
                            </span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-medium">
                                {journeys.find(j => j.id === person.journey_id)?.title || "Sem fluxo"}
                            </span>
                            <span className="text-muted-foreground/50">•</span>
                            <Badge variant="secondary" className="font-normal">
                                {stages.find(s => s.id === person.stage_id)?.title || "Sem etapa"}
                            </Badge>
                        </div>
                        <div className="pt-1">
                            <PersonTags personId={person.id} organizationId={person.organization_id} />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Discipler Selection */}
                        <Popover open={disciplerPopoverOpen} onOpenChange={setDisciplerPopoverOpen}>
                            <PopoverTrigger asChild>
                                <Button variant="outline" className="gap-2">
                                    <UserCheck className="h-4 w-4" />
                                    {selectedDiscipler ? selectedDiscipler.name : "Discipulador"}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-[280px] p-0" align="start">
                                <div className="flex flex-col">
                                    <div className="px-3 py-2 border-b flex items-center gap-2">
                                        <Search className="w-3.5 h-3.5 text-muted-foreground" />
                                        <input
                                            type="text"
                                            placeholder="Buscar discipulador..."
                                            value={disciplerSearchQuery}
                                            onChange={(e) => setDisciplerSearchQuery(e.target.value)}
                                            className="w-full text-sm outline-none bg-transparent"
                                        />
                                    </div>
                                    <ScrollArea className="max-h-[200px]">
                                        <div className="p-1">
                                            {disciplers
                                                .filter(d => d.name.toLowerCase().includes(disciplerSearchQuery.toLowerCase()))
                                                .length === 0 ? (
                                                <div className="py-4 text-center text-xs text-muted-foreground">
                                                    Nenhum discipulador encontrado.
                                                </div>
                                            ) : (
                                                disciplers
                                                    .filter(d => d.name.toLowerCase().includes(disciplerSearchQuery.toLowerCase()))
                                                    .map(discipler => (
                                                        <button
                                                            key={discipler.id}
                                                            onClick={() => handleSelectDiscipler(discipler)}
                                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                                                        >
                                                            <div className="w-6 h-6 rounded-full bg-muted flex items-center justify-center overflow-hidden">
                                                                {discipler.photo_url ? (
                                                                    <img src={discipler.photo_url} alt="" className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-medium">{discipler.name.charAt(0)}</span>
                                                                )}
                                                            </div>
                                                            <span className="truncate">{discipler.name}</span>
                                                            {selectedDiscipler?.id === discipler.id && (
                                                                <UserCheck className="w-3 h-3 ml-auto text-primary" />
                                                            )}
                                                        </button>
                                                    ))
                                            )}
                                        </div>
                                    </ScrollArea>
                                    {selectedDiscipler && (
                                        <div className="border-t p-2">
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="w-full justify-start text-xs h-8 text-destructive hover:text-destructive"
                                                onClick={handleRemoveDiscipler}
                                            >
                                                <X className="w-3 h-3 mr-2" />
                                                Remover Discipulador
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </PopoverContent>
                        </Popover>

                        <Button onClick={handleSave} disabled={saving}>
                            <Save className="mr-2 h-4 w-4" />
                            {saving ? "Salvando..." : "Salvar Alterações"}
                        </Button>
                    </div>
                </div>
            </div>

            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="w-full justify-start border-b rounded-none h-auto p-0 bg-transparent">
                    <TabsTrigger
                        value="overview"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                    >
                        Visão Geral
                    </TabsTrigger>
                    <TabsTrigger
                        value="history"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                    >
                        Histórico
                    </TabsTrigger>
                    <TabsTrigger
                        value="responses"
                        className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-4 py-3"
                    >
                        Respostas de Formulários
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-6 pt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle>Dados Pessoais</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Nome Completo</Label>
                                    <Input
                                        value={person.name}
                                        onChange={(e) => setPerson({ ...person, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                        value={person.email || ""}
                                        onChange={(e) => setPerson({ ...person, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Telefone / WhatsApp</Label>
                                    <Input
                                        value={person.phone || ""}
                                        onChange={(e) => setPerson({ ...person, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Data de Nascimento</Label>
                                    <Input
                                        type="date"
                                        value={person.birthdate || ""}
                                        onChange={(e) => setPerson({ ...person, birthdate: e.target.value })}
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <CardTitle>Outras Informações</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
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
                                        const isTextarea = def.type === 'textarea';

                                        return (
                                            <div key={def.id} className="space-y-2">
                                                <Label>{def.label}</Label>

                                                {isCheckbox ? (
                                                    <div className="flex items-center h-[40px] px-1">
                                                        <div className="flex items-center space-x-2">
                                                            <Switch
                                                                checked={!!value}
                                                                onCheckedChange={(checked) => handleUpdateCustomField(def.id, checked)}
                                                            />
                                                            <span className="text-sm text-foreground">
                                                                {value ? "Sim" : "Não"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ) : isSelect && def.options ? (
                                                    <Select
                                                        value={value?.toString() || ""}
                                                        onValueChange={(val) => handleUpdateCustomField(def.id, val)}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Selecione..." />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {def.options.map((opt: string) => (
                                                                <SelectItem key={opt} value={opt}>
                                                                    {opt}
                                                                </SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                ) : isTextarea ? (
                                                    <textarea
                                                        className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                                        value={value || ""}
                                                        onFocus={() => {
                                                            // Store original value when user starts editing
                                                            originalFieldValues.current[def.id] = personCustomFields[def.id];
                                                        }}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            // Update local state immediately
                                                            setPersonCustomFields(prev => ({ ...prev, [def.id]: newVal }));
                                                        }}
                                                        onBlur={(e) => {
                                                            const originalValue = originalFieldValues.current[def.id];
                                                            handleUpdateCustomField(def.id, e.target.value, originalValue);
                                                        }}
                                                        placeholder="Digite aqui..."
                                                    />
                                                ) : (
                                                    <Input
                                                        type={isDate ? "date" : "text"}
                                                        value={value || ""}
                                                        onFocus={() => {
                                                            // Store original value when user starts editing
                                                            originalFieldValues.current[def.id] = personCustomFields[def.id];
                                                        }}
                                                        onChange={(e) => {
                                                            const newVal = e.target.value;
                                                            // Update local state immediately
                                                            setPersonCustomFields(prev => ({ ...prev, [def.id]: newVal }));
                                                        }}
                                                        onBlur={(e) => {
                                                            const originalValue = originalFieldValues.current[def.id];
                                                            handleUpdateCustomField(def.id, e.target.value, originalValue);
                                                        }}
                                                        placeholder={isDate ? "" : "Digite aqui..."}
                                                    />
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    <div className="text-center text-muted-foreground text-sm py-4 border-2 border-dashed rounded-lg">
                                        Nenhum campo personalizado configurado.
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Observations Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Observações</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <textarea
                                className="flex min-h-[120px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                                value={observations}
                                onChange={(e) => setObservations(e.target.value)}
                                onBlur={handleUpdateObservations}
                                placeholder="Digite observações sobre esta pessoa..."
                            />
                        </CardContent>
                    </Card>

                    {/* Status / Journey Card */}
                    <Card>
                        <CardHeader>
                            <CardTitle>Fluxo</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                <div>
                                    <Label>Fluxo</Label>
                                    <Select
                                        value={person.journey_id || undefined}
                                        onValueChange={handleJourneyChange}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione o fluxo" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {journeys.map((journey) => (
                                                <SelectItem key={journey.id} value={journey.id}>
                                                    {journey.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Etapa Atual</Label>
                                    <Select
                                        value={person.stage_id || undefined}
                                        onValueChange={handleStageChange}
                                        disabled={!person.journey_id}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione a etapa" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {stages.map((stage) => (
                                                <SelectItem key={stage.id} value={stage.id}>
                                                    {stage.title}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="history" className="pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Linha do Tempo</CardTitle>
                            <CardDescription>Histórico de atividades e mudanças.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <PersonHistoryTimeline personId={person.id} refreshTrigger={historyRefreshTrigger} />
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="responses" className="pt-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Respostas de Formulários</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-6">
                                {person.visitor_responses?.map((resp, i) => (
                                    <div key={i} className="border rounded-lg p-4">
                                        <h4 className="font-semibold mb-2">{resp.forms?.title || "Formulário sem título"}</h4>
                                        <p className="text-xs text-muted-foreground mb-3">
                                            Preenchido em {new Date(resp.created_at).toLocaleDateString()}
                                        </p>
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {resp.forms?.fields?.map((field: any) => (
                                                <div key={field.id}>
                                                    <span className="text-sm font-medium text-muted-foreground">{field.label}:</span>
                                                    <p className="text-sm">{resp.responses[field.id] || "-"}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                                {(!person.visitor_responses || person.visitor_responses.length === 0) && (
                                    <p className="text-muted-foreground text-center py-4">Nhuma resposta encontrada.</p>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
