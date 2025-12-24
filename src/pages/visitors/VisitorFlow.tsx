import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
    DndContext,
    DragOverlay,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragStartEvent,
    type DragOverEvent,
    type DragEndEvent,
} from "@dnd-kit/core";
import {
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    useSortable,
    arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { supabase, type Journey } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Plus, MoreHorizontal, Pencil, Trash2, GripVertical, Inbox, ArrowLeft, Settings2, Map, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PersonDetailsDialog } from "@/components/visitors/PersonDetailsDialog";
import type { FormField } from "@/types/form";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { KanbanColumnSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface Stage {
    id: string;
    title: string;
    position: number;
    journey_id: string;
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
    visitor_responses?: {
        created_at: string;
        responses: Record<string, any>;
        forms?: {
            title: string;
            fields: FormField[];
        } | null;
    }[];
}

export function VisitorFlow() {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    // ... (rest of simple states)

    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
    const [stages, setStages] = useState<Stage[]>([]);
    const [people, setPeople] = useState<Person[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadingJourney, setLoadingJourney] = useState(false);

    // Journey Dialog States
    const [isAddingJourney, setIsAddingJourney] = useState(false);
    const [newJourneyTitle, setNewJourneyTitle] = useState("");
    const [newJourneyDescription, setNewJourneyDescription] = useState("");

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        if (user?.organization_id) {
            fetchJourneys();
        } else if (user && !user.organization_id) {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (selectedJourney) {
            fetchJourneyData(selectedJourney.id);
        } else {
            setStages([]);
            setPeople([]);
        }
    }, [selectedJourney]);

    const fetchJourneys = async () => {
        setLoading(true);
        const { data } = await supabase
            .from("journeys")
            .select("*")
            .eq("organization_id", user?.organization_id)
            .order("created_at");

        if (data) setJourneys(data);
        setLoading(false);
    };

    const fetchJourneyData = async (journeyId: string) => {
        setLoadingJourney(true);
        // Fetch stages
        const { data: stagesData } = await supabase
            .from("visitor_stages")
            .select("*")
            .eq("organization_id", user?.organization_id)
            .eq("journey_id", journeyId)
            .order("position");

        if (stagesData) setStages(stagesData);

        // Fetch people
        const { data: peopleData } = await supabase
            .from("people")
            .select("*, visitor_responses(created_at, responses, forms(title, fields))")
            .eq("organization_id", user?.organization_id)
            .eq("journey_id", journeyId);

        if (peopleData) setPeople(peopleData);
        setLoadingJourney(false);
    };

    const handleCreateJourney = async () => {
        if (!newJourneyTitle.trim()) {
            toast.error("O título do fluxo é obrigatório");
            return;
        }

        if (!user?.organization_id) {
            toast.error("Erro: Organização não identificada");
            console.error("Missing organization_id for user:", user);
            return;
        }

        try {
            const { data, error } = await supabase
                .from("journeys")
                .insert({
                    organization_id: user.organization_id,
                    title: newJourneyTitle,
                    description: newJourneyDescription,
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setJourneys([...journeys, data]);
                setNewJourneyTitle("");
                setNewJourneyDescription("");
                setIsAddingJourney(false);
                toast.success("Fluxo criado com sucesso!");

                // Create default stages for new journey
                const defaultStages = ["VISITANTES"];
                const stageInserts = defaultStages.map((title, index) => ({
                    organization_id: user.organization_id,
                    journey_id: data.id,
                    title,
                    position: index
                }));

                await supabase.from("visitor_stages").insert(stageInserts);
            }
        } catch (error: any) {
            console.error("Error creating journey:", error);
            toast.error("Erro ao criar fluxo: " + (error.message || "Erro desconhecido"));
        }
    };

    const findContainer = (id: string) => {
        if (stages.find((s) => s.id === id)) {
            return id;
        }
        const person = people.find((p) => p.id === id);
        return person?.stage_id || stages[0]?.id; // Default to first stage if null
    };

    const handleDragStart = (event: DragStartEvent) => {
        setActiveId(event.active.id as string);
    };

    const handleDragOver = (event: DragOverEvent) => {
        const { active, over } = event;
        if (!over) return;

        const activeId = active.id as string;
        const overId = over.id as string;

        // Find the containers
        const activeContainer = findContainer(activeId);
        const overContainer = findContainer(overId);

        if (
            !activeContainer ||
            !overContainer ||
            activeContainer === overContainer
        ) {
            return;
        }

        // If moving to a different container (stage)
        // We update the local state optimistically
        setPeople((prev) => {
            return prev.map((p) => {
                if (p.id === activeId) {
                    return { ...p, stage_id: overContainer };
                }
                return p;
            });
        });
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        const activeId = active.id as string;
        const overId = over?.id as string;

        if (!over) {
            setActiveId(null);
            return;
        }

        const overContainer = findContainer(overId);

        if (overContainer) {
            // Update DB
            const { error } = await supabase
                .from("people")
                .update({ stage_id: overContainer })
                .eq("id", activeId);

            if (error) {
                console.error("Error moving person:", error);
            }
        }

        setActiveId(null);
    };

    const [isAddingStage, setIsAddingStage] = useState(false);
    const [newStageTitle, setNewStageTitle] = useState("");

    const handleAddStage = async () => {
        if (!newStageTitle.trim() || !selectedJourney) return;

        try {
            const position = stages.length;
            const { data, error } = await supabase
                .from("visitor_stages")
                .insert({
                    organization_id: user?.organization_id,
                    journey_id: selectedJourney.id,
                    title: newStageTitle,
                    position
                })
                .select()
                .single();

            if (error) throw error;

            if (data) {
                setStages([...stages, data]);
                setNewStageTitle("");
                setIsAddingStage(false);
            }
        } catch (error) {
            console.error("Error adding stage:", error);
        }
    };

    const handleColumnDragEnd = async (event: DragEndEvent) => {
        if (!isEditMode) return; // Only allow column drag in edit mode

        const { active, over } = event;
        if (!over || active.id === over.id) return;

        // Don't allow moving the first column
        const oldIndex = stages.findIndex((s) => s.id === active.id);
        const newIndex = stages.findIndex((s) => s.id === over.id);

        if (oldIndex === 0 || newIndex === 0) return;

        const newStages = arrayMove(stages, oldIndex, newIndex);
        setStages(newStages);

        // Update positions in DB
        try {
            const updates = newStages.map((stage, index) => ({
                id: stage.id,
                position: index,
                title: stage.title,
                journey_id: stage.journey_id,
                organization_id: user?.organization_id
            }));

            const { error } = await supabase
                .from("visitor_stages")
                .upsert(updates);

            if (error) throw error;
        } catch (error) {
            console.error("Error updating stage positions:", error);
            if (selectedJourney) fetchJourneyData(selectedJourney.id);
        }
    };

    const [editingStage, setEditingStage] = useState<Stage | null>(null);
    const [editStageTitle, setEditStageTitle] = useState("");

    const handleEditStage = (stage: Stage) => {
        setEditingStage(stage);
        setEditStageTitle(stage.title);
    };

    const handleSaveStage = async () => {
        if (!editingStage || !editStageTitle.trim()) return;

        try {
            const { error } = await supabase
                .from("visitor_stages")
                .update({ title: editStageTitle })
                .eq("id", editingStage.id);

            if (error) throw error;

            setStages(stages.map(s => s.id === editingStage.id ? { ...s, title: editStageTitle } : s));
            setEditingStage(null);
        } catch (error) {
            console.error("Error updating stage:", error);
        }
    };

    const handleDeleteStage = async (stageId: string) => {
        try {
            // First move people to first stage
            const firstStageId = stages[0].id;
            const { error: moveError } = await supabase
                .from("people")
                .update({ stage_id: firstStageId })
                .eq("stage_id", stageId);

            if (moveError) throw moveError;

            // Then delete stage
            const { error: deleteError } = await supabase
                .from("visitor_stages")
                .delete()
                .eq("id", stageId);

            if (deleteError) throw deleteError;

            setStages(stages.filter(s => s.id !== stageId));
            // Update local people state
            setPeople(people.map(p => p.stage_id === stageId ? { ...p, stage_id: firstStageId } : p));
        } catch (error) {
            console.error("Error deleting stage:", error);
        }
    };

    const [deletingStageId, setDeletingStageId] = useState<string | null>(null);

    const confirmDeleteStage = async () => {
        if (!deletingStageId) return;
        await handleDeleteStage(deletingStageId);
        setDeletingStageId(null);
    };

    const handleDeletePerson = async (personId: string) => {
        try {
            const { error } = await supabase
                .from("people")
                .delete()
                .eq("id", personId);

            if (error) throw error;

            setPeople(people.filter(p => p.id !== personId));
            setSelectedPerson(null);
        } catch (error) {
            console.error("Error deleting person:", error);
        }
    };

    const handleArchivePerson = async (personId: string, isArchived: boolean) => {
        try {
            const { error } = await supabase
                .from("people")
                .update({ is_archived: isArchived })
                .eq("id", personId);

            if (error) throw error;

            setPeople(people.map(p => p.id === personId ? { ...p, is_archived: isArchived } : p));
            if (selectedPerson?.id === personId) {
                setSelectedPerson({ ...selectedPerson, is_archived: isArchived });
            }
        } catch (error) {
            console.error("Error archiving person:", error);
        }
    };

    if (!selectedJourney) {
        return (
            <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Fluxos</h1>
                        <p className="text-muted-foreground">
                            Gerencie os fluxos de acompanhamento da sua igreja.
                        </p>
                    </div>
                    <Button onClick={() => setIsAddingJourney(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Fluxo
                    </Button>
                </div>

                {loading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <div className="flex items-center justify-between">
                                        <div className="h-6 w-32 bg-muted animate-pulse rounded-md" />
                                        <div className="h-5 w-5 bg-muted animate-pulse rounded-full" />
                                    </div>
                                    <div className="h-4 w-48 bg-muted animate-pulse rounded-md mt-2" />
                                </CardHeader>
                                <CardContent>
                                    <div className="h-4 w-40 bg-muted animate-pulse rounded" />
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {journeys.map((journey) => (
                            <Card
                                key={journey.id}
                                className="cursor-pointer hover:border-primary/50 transition-colors group"
                                onClick={() => setSelectedJourney(journey)}
                            >
                                <CardHeader>
                                    <CardTitle className="flex items-center justify-between">
                                        {journey.title}
                                        <Map className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                    </CardTitle>
                                    <CardDescription>{journey.description || "Sem descrição"}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-sm text-muted-foreground">
                                        Clique para visualizar o fluxo
                                    </div>
                                </CardContent>
                            </Card>
                        ))}

                        {journeys.length === 0 && (
                            <div className="col-span-full flex flex-col items-center justify-center py-12 text-center border-2 border-dashed rounded-lg">
                                <Map className="w-12 h-12 text-muted-foreground mb-4 opacity-50" />
                                <h3 className="text-lg font-medium mb-2">Nenhum fluxo encontrado</h3>
                                <p className="text-muted-foreground mb-4">
                                    Crie seu primeiro fluxo para começar a organizar as pessoas.
                                </p>
                                <Button onClick={() => setIsAddingJourney(true)}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    Criar Primeiro Fluxo
                                </Button>
                            </div>
                        )}
                    </div>
                )}

                <Dialog open={isAddingJourney} onOpenChange={setIsAddingJourney}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Novo Fluxo</DialogTitle>
                            <DialogDescription>
                                Crie um novo fluxo de acompanhamento (ex: Visitantes, Batismo, Membresia).
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Fluxo</Label>
                                <Input
                                    value={newJourneyTitle}
                                    onChange={(e) => setNewJourneyTitle(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newJourneyTitle.trim()) {
                                            handleCreateJourney();
                                        }
                                    }}
                                    placeholder="Ex: Jovens"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Descrição (Opcional)</Label>
                                <Textarea
                                    value={newJourneyDescription}
                                    onChange={(e) => setNewJourneyDescription(e.target.value)}
                                    placeholder="Descrição breve sobre este fluxo"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddingJourney(false)}>
                                Cancelar
                            </Button>
                            <Button onClick={handleCreateJourney} disabled={!newJourneyTitle.trim()}>
                                Criar Fluxo
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setSelectedJourney(null)}>
                        <ArrowLeft className="w-5 h-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                            {selectedJourney.title}
                            <span className="text-xs font-normal text-muted-foreground bg-muted px-2 py-0.5 rounded-full border">
                                Fluxo
                            </span>
                        </h1>
                        <p className="text-muted-foreground text-sm">
                            {selectedJourney.description}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center space-x-2 bg-muted/50 p-2 rounded-lg border">
                        <Switch
                            id="edit-mode"
                            checked={isEditMode}
                            onCheckedChange={setIsEditMode}
                        />
                        <Label htmlFor="edit-mode" className="cursor-pointer flex items-center gap-2 text-sm font-medium">
                            <Settings2 className="w-4 h-4" />
                            Editar Estrutura
                        </Label>
                    </div>

                    {isEditMode && (
                        <Button onClick={() => setIsAddingStage(true)} variant="outline" className="border-dashed">
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Etapa
                        </Button>
                    )}
                </div>
            </div>

            {!user?.organization_id && (
                <div className="bg-red-50 text-red-900 p-4 rounded-md mb-6 border border-red-200">
                    <h3 className="font-bold flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Problema de Conta Identificado
                    </h3>
                    <p className="text-sm mt-2">
                        Sua conta de usuário não está vinculada a nenhuma organização. Isso impede a criação de fluxos.
                        Provavelmente houve uma falha durante o seu cadastro.
                    </p>
                    <div className="mt-4 flex gap-4">
                        <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => signOut()}
                        >
                            Sair e Criar Nova Conta
                        </Button>
                    </div>
                </div>
            )}

            {loadingJourney ? (
                <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] items-start animate-in fade-in duration-300">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <KanbanColumnSkeleton key={i} />
                    ))}
                </div>
            ) : (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCorners}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDragEnd={(event) => {
                        if (event.active.data.current?.type === "Column") {
                            handleColumnDragEnd(event);
                        } else {
                            handleDragEnd(event);
                        }
                    }}
                >
                    <div className="flex gap-4 overflow-x-auto pb-4 h-[calc(100vh-200px)] items-start">
                        <SortableContext
                            items={stages.map(s => s.id)}
                            strategy={horizontalListSortingStrategy}
                            disabled={!isEditMode} // Disable column sorting when not in edit mode
                        >
                            {stages.map((stage, index) => (
                                <KanbanColumn
                                    key={stage.id}
                                    id={stage.id}
                                    title={stage.title}
                                    count={people.filter((p) => (p.stage_id || stages[0].id) === stage.id && !p.is_archived).length}
                                    isFirst={index === 0}
                                    isEditMode={isEditMode}
                                    onEdit={() => handleEditStage(stage)}
                                    onDelete={() => setDeletingStageId(stage.id)}
                                >
                                    <SortableContext
                                        items={people
                                            .filter((p) => (p.stage_id || stages[0].id) === stage.id && !p.is_archived)
                                            .map((p) => p.id)}
                                        strategy={verticalListSortingStrategy}
                                    >
                                        {people
                                            .filter((p) => (p.stage_id || stages[0].id) === stage.id && !p.is_archived)
                                            .map((person) => (
                                                <KanbanCard
                                                    key={person.id}
                                                    person={person}
                                                    onClick={() => navigate(`/pessoas/${person.id}`)}
                                                />
                                            ))}
                                    </SortableContext>
                                </KanbanColumn>
                            ))}
                        </SortableContext>
                    </div>

                    <DragOverlay>
                        {activeId ? (
                            stages.find((s) => s.id === activeId) ? (
                                <div className="opacity-80 rotate-2 cursor-grabbing">
                                    <KanbanColumn
                                        id={activeId}
                                        title={stages.find((s) => s.id === activeId)!.title}
                                        count={people.filter((p) => (p.stage_id || stages[0].id) === activeId && !p.is_archived).length}
                                        isFirst={false}
                                        isEditMode={isEditMode}
                                        onEdit={() => { }}
                                        onDelete={() => { }}
                                    >
                                        {people
                                            .filter((p) => (p.stage_id || stages[0].id) === activeId && !p.is_archived)
                                            .map((person) => (
                                                <KanbanCard
                                                    key={person.id}
                                                    person={person}
                                                />
                                            ))}
                                    </KanbanColumn>
                                </div>
                            ) : (
                                <KanbanCard
                                    person={people.find((p) => p.id === activeId)!}
                                    isOverlay
                                />
                            )
                        ) : null}
                    </DragOverlay>
                </DndContext>
            )}

            <PersonDetailsDialog
                person={selectedPerson}
                open={!!selectedPerson}
                onOpenChange={(open) => !open && setSelectedPerson(null)}
                onDelete={handleDeletePerson}
                onArchive={handleArchivePerson}
                onJourneyChange={() => {
                    fetchJourneyData(selectedJourney.id);
                }}
                journeyTitle={selectedJourney.title}
            />

            {/* Add Stage Dialog */}
            <Dialog open={isAddingStage} onOpenChange={setIsAddingStage}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Etapa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome da Etapa</Label>
                            <Input
                                value={newStageTitle}
                                onChange={(e) => setNewStageTitle(e.target.value)}
                                placeholder="Ex: Batismo"
                            />
                        </div>
                        <Button className="w-full" onClick={handleAddStage}>
                            Criar Etapa
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Edit Stage Dialog */}
            <Dialog open={!!editingStage} onOpenChange={(open) => !open && setEditingStage(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Editar Etapa</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome da Etapa</Label>
                            <Input
                                value={editStageTitle}
                                onChange={(e) => setEditStageTitle(e.target.value)}
                                placeholder="Nome da etapa"
                            />
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingStage(null)}>Cancelar</Button>
                            <Button onClick={handleSaveStage}>Salvar</Button>
                        </DialogFooter>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deletingStageId} onOpenChange={(open) => !open && setDeletingStageId(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Etapa</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir esta etapa? Todas as pessoas nesta etapa serão movidas para a primeira etapa do fluxo.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmDeleteStage} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

function KanbanColumn({
    id,
    title,
    count,
    children,
    isFirst,
    isEditMode,
    onEdit,
    onDelete,
}: {
    id: string;
    title: string;
    count: number;
    children: React.ReactNode;
    isFirst: boolean;
    isEditMode: boolean;
    onEdit: () => void;
    onDelete: () => void;
}) {
    const {
        setNodeRef,
        attributes,
        listeners,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id,
        data: {
            type: "Column",
            isFirst, // Pass isFirst to data to check in drag handlers if needed
        },
        disabled: !isEditMode || isFirst, // Disable dragging for first column or if not in edit mode
    });

    const style = {
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex-shrink-0 w-80 flex flex-col rounded-lg border bg-secondary/30 border-border/50 transition-colors"
        >
            <div
                className="p-4 flex items-center justify-between border-b border-border/50 bg-secondary/50 rounded-t-lg"
            >
                <div className="flex items-center gap-2">
                    {isEditMode && !isFirst && (
                        <div
                            {...attributes}
                            {...listeners}
                            className="cursor-grab active:cursor-grabbing p-1 -ml-1"
                        >
                            <GripVertical className="w-4 h-4 text-muted-foreground/50" />
                        </div>
                    )}
                    <h3 className="font-semibold text-sm">{title}</h3>
                    <span className="bg-background text-xs px-2 py-0.5 rounded-full border border-border">
                        {count}
                    </span>
                </div>
                {isEditMode && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer hover:bg-background/80">
                                <MoreHorizontal className="w-4 h-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={onEdit} className="cursor-pointer">
                                <Pencil className="w-4 h-4 mr-2" />
                                Editar
                            </DropdownMenuItem>
                            {!isFirst && (
                                <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive cursor-pointer">
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Excluir
                                </DropdownMenuItem>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>
            <div className="p-2 flex-1 overflow-y-auto space-y-2 min-h-[100px]">
                {count === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-muted-foreground/50 min-h-[100px]">
                        <Inbox className="w-8 h-8 mb-2 opacity-50" />
                        <span className="text-xs">Essa lista está vazia!</span>
                    </div>
                ) : (
                    children
                )}
            </div>
        </div>
    );
}

function KanbanCard({ person, isOverlay, onClick }: { person: Person; isOverlay?: boolean; onClick?: () => void }) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: person.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <Card
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className={`cursor-grab active:cursor-grabbing hover:border-primary/50 transition-colors ${isOverlay ? "shadow-xl rotate-2 cursor-grabbing" : ""
                }`}
        >
            <CardContent className="p-3 space-y-2">
                <div className="flex justify-between items-start">
                    <span className="font-medium text-sm line-clamp-1">
                        {person.name}
                    </span>
                </div>
                <div className="text-xs text-muted-foreground">
                    {format(new Date(person.created_at), "dd/MM/yyyy", { locale: ptBR })}
                </div>
            </CardContent>
        </Card>
    );
}
