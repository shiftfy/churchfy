import { useState, useEffect } from "react";
import { Plus, X, Search, Tag as TagIcon, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { ScrollArea } from "@/components/ui/scroll-area";

const PRESET_COLORS = [
    "#EF4444", // Red
    "#F97316", // Orange
    "#F59E0B", // Amber
    "#84CC16", // Lime
    "#10B981", // Emerald
    "#06B6D4", // Cyan
    "#3B82F6", // Blue
    "#6366F1", // Indigo
    "#8B5CF6", // Violet
    "#EC4899", // Pink
];

interface Tag {
    id: string;
    organization_id: string;
    name: string;
    color: string;
}

interface PersonTagsProps {
    personId: string;
    organizationId: string;
}

export function PersonTags({ personId, organizationId }: PersonTagsProps) {
    const [assignedTags, setAssignedTags] = useState<Tag[]>([]);
    const [allTags, setAllTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [open, setOpen] = useState(false);
    const [updating, setUpdating] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    // Create Tag Dialog State
    const [createDialogOpen, setCreateDialogOpen] = useState(false);
    const [creating, setCreating] = useState(false);
    const [newTagName, setNewTagName] = useState("");
    const [newTagColor, setNewTagColor] = useState(PRESET_COLORS[6]); // Default blue

    useEffect(() => {
        if (personId && organizationId) {
            fetchTags();
        }
    }, [personId, organizationId]);

    const fetchTags = async () => {
        try {
            // Fetch all tags for organization
            const { data: tagsData, error: tagsError } = await supabase
                .from("tags")
                .select("*")
                .eq("organization_id", organizationId)
                .order("name");

            if (tagsError) throw tagsError;
            setAllTags(tagsData || []);

            // Fetch assigned tags for person
            const { data: personTagsData, error: personTagsError } = await supabase
                .from("person_tags")
                .select("tag_id")
                .eq("person_id", personId);

            if (personTagsError) throw personTagsError;

            const assignedIds = new Set(personTagsData?.map(pt => pt.tag_id));
            const assigned = (tagsData || []).filter(t => assignedIds.has(t.id));
            setAssignedTags(assigned);
        } catch (error) {
            console.error("Error fetching tags:", error);
            toast.error("Erro ao carregar tags.");
        } finally {
            setLoading(false);
        }
    };

    const handleAddTag = async (tag: Tag) => {
        setUpdating(true);
        try {
            const { error } = await supabase
                .from("person_tags")
                .insert({
                    person_id: personId,
                    tag_id: tag.id
                });

            if (error) throw error;

            // Get current user for history
            const { data: { user } } = await supabase.auth.getUser();

            // Log to person_history
            await supabase.from("person_history").insert({
                person_id: personId,
                organization_id: organizationId,
                action_type: 'tag_added',
                description: `Tag adicionada: ${tag.name}`,
                metadata: { tag_name: tag.name, tag_color: tag.color },
                created_by: user?.id
            });

            setAssignedTags([...assignedTags, tag]);
            toast.success("Tag adicionada!");
            setOpen(false);
            setSearchQuery("");
        } catch (error) {
            console.error("Error adding tag:", error);
            toast.error("Erro ao adicionar tag.");
        } finally {
            setUpdating(false);
        }
    };

    const handleRemoveTag = async (tagId: string) => {
        setUpdating(true);
        try {
            const tagToRemove = assignedTags.find(t => t.id === tagId);

            const { error } = await supabase
                .from("person_tags")
                .delete()
                .eq("person_id", personId)
                .eq("tag_id", tagId);

            if (error) throw error;

            // Get current user for history
            const { data: { user } } = await supabase.auth.getUser();

            // Log to person_history
            if (tagToRemove) {
                await supabase.from("person_history").insert({
                    person_id: personId,
                    organization_id: organizationId,
                    action_type: 'tag_removed',
                    description: `Tag removida: ${tagToRemove.name}`,
                    metadata: { tag_name: tagToRemove.name, tag_color: tagToRemove.color },
                    created_by: user?.id
                });
            }

            setAssignedTags(assignedTags.filter(t => t.id !== tagId));
            toast.success("Tag removida.");
        } catch (error) {
            console.error("Error removing tag:", error);
            toast.error("Erro ao remover tag.");
        } finally {
            setUpdating(false);
        }
    };

    const handleCreateAndAssignTag = async () => {
        if (!newTagName.trim()) {
            toast.error("O nome da tag é obrigatório.");
            return;
        }

        setCreating(true);
        try {
            // 1. Create the tag
            const { data: newTag, error: createError } = await supabase
                .from("tags")
                .insert({
                    organization_id: organizationId,
                    name: newTagName,
                    color: newTagColor,
                })
                .select()
                .single();

            if (createError) throw createError;

            // 2. Assign the tag to the person
            const { error: assignError } = await supabase
                .from("person_tags")
                .insert({
                    person_id: personId,
                    tag_id: newTag.id
                });

            if (assignError) throw assignError;

            // 3. Log to person_history
            const { data: { user } } = await supabase.auth.getUser();
            await supabase.from("person_history").insert({
                person_id: personId,
                organization_id: organizationId,
                action_type: 'tag_added',
                description: `Tag adicionada: ${newTag.name}`,
                metadata: { tag_name: newTag.name, tag_color: newTag.color },
                created_by: user?.id
            });

            // 4. Update local state
            setAllTags([...allTags, newTag]);
            setAssignedTags([...assignedTags, newTag]);

            // 5. Reset and close
            setNewTagName("");
            setNewTagColor(PRESET_COLORS[6]);
            setCreateDialogOpen(false);
            toast.success("Tag criada e adicionada!");
        } catch (error: any) {
            console.error("Error creating tag:", error);
            if (error.code === '23505') {
                toast.error("Já existe uma tag com este nome.");
            } else {
                toast.error("Erro ao criar tag.");
            }
        } finally {
            setCreating(false);
        }
    };

    const unassignedTags = allTags.filter(
        tag => !assignedTags.some(assigned => assigned.id === tag.id)
    );

    const filteredTags = unassignedTags.filter(tag =>
        tag.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) {
        return <div className="h-6 w-20 bg-muted animate-pulse rounded" />;
    }

    return (
        <div className="flex flex-wrap items-center gap-2 mb-4">
            {assignedTags.map(tag => (
                <Badge
                    key={tag.id}
                    variant="outline"
                    className="pl-2 pr-1 py-0.5 gap-1 border-0"
                    style={{ backgroundColor: tag.color, color: '#fff' }}
                >
                    {tag.name}
                    <button
                        onClick={() => handleRemoveTag(tag.id)}
                        className="hover:bg-black/20 rounded-full p-0.5 transition-colors"
                        disabled={updating}
                    >
                        <X className="w-3 h-3" />
                    </button>
                </Badge>
            ))}

            <Popover open={open} onOpenChange={setOpen}>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-6 px-2 text-xs rounded-full border-dashed" disabled={updating}>
                        <Plus className="w-3 h-3" />
                        Tag
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[240px] p-0" align="start">
                    <div className="flex flex-col">
                        <div className="px-3 py-2 border-b flex items-center gap-2">
                            <Search className="w-3.5 h-3.5 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Buscar tag..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full text-sm outline-none bg-transparent"
                            />
                        </div>
                        <ScrollArea className="max-h-[250px]">
                            <div className="p-1">
                                {filteredTags.length === 0 ? (
                                    <div className="py-4 text-center text-xs text-muted-foreground">
                                        {searchQuery ? "Nenhuma tag encontrada." : "Todas as tags já foram adicionadas."}
                                    </div>
                                ) : (
                                    filteredTags.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => handleAddTag(tag)}
                                            disabled={updating}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-accent hover:text-accent-foreground transition-colors disabled:opacity-50 disabled:pointer-events-none"
                                        >
                                            <div
                                                className="w-3 h-3 rounded-full flex-shrink-0"
                                                style={{ backgroundColor: tag.color }}
                                            />
                                            <span className="truncate">{tag.name}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        </ScrollArea>
                        <div className="border-t p-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="w-full justify-start text-xs h-8"
                                onClick={() => {
                                    setOpen(false);
                                    setCreateDialogOpen(true);
                                }}
                            >
                                <Plus className="w-3 h-3 mr-2" />
                                Criar Nova Tag
                            </Button>
                        </div>
                    </div>
                </PopoverContent>
            </Popover>

            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Nova Tag</DialogTitle>
                        <DialogDescription>
                            Defina o nome e a cor para identificar esta tag.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Nome</Label>
                            <Input
                                placeholder="Ex: Liderança, Visitante, Batizado"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Cor</Label>
                            <div className="flex flex-wrap gap-2">
                                {PRESET_COLORS.map((color) => (
                                    <button
                                        key={color}
                                        type="button"
                                        onClick={() => setNewTagColor(color)}
                                        className={`w-8 h-8 rounded-full border-2 transition-all ${newTagColor === color
                                            ? "ring-2 ring-primary ring-offset-2 scale-110"
                                            : "hover:scale-110"
                                            }`}
                                        style={{ backgroundColor: color }}
                                    />
                                ))}
                            </div>
                        </div>

                        <div className="pt-2">
                            <Label className="text-muted-foreground text-xs uppercase mb-2 block">Pré-visualização</Label>
                            <div className="flex justify-center p-4 border rounded-md border-dashed bg-muted/50">
                                <Badge
                                    className="px-3 py-1 text-sm font-medium border-0"
                                    style={{ backgroundColor: newTagColor, color: '#fff' }}
                                >
                                    <TagIcon className="w-3 h-3 mr-1.5 opacity-80" />
                                    {newTagName || "Nome da Tag"}
                                </Badge>
                            </div>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>Cancelar</Button>
                        <Button onClick={handleCreateAndAssignTag} disabled={creating}>
                            {creating && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                            Salvar
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
