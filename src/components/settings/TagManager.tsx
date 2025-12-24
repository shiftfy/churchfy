import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
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
import { Badge } from "@/components/ui/badge";

interface Tag {
    id: string;
    organization_id: string;
    name: string;
    color: string;
    created_at: string;
}

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
    "#D946EF", // Fuchsia
    "#EC4899", // Pink
    "#64748B", // Slate
];

export function TagManager() {
    const { user } = useAuth();
    const [tags, setTags] = useState<Tag[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form State
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [tagName, setTagName] = useState("");
    const [tagColor, setTagColor] = useState(PRESET_COLORS[6]); // Default blue
    const [tagToDelete, setTagToDelete] = useState<Tag | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            fetchTags();
        }
    }, [user?.organization_id]);

    useEffect(() => {
        if (!dialogOpen) {
            setEditingTag(null);
            setTagName("");
            setTagColor(PRESET_COLORS[6]);
        }
    }, [dialogOpen]);

    const fetchTags = async () => {
        try {
            const { data, error } = await supabase
                .from("tags")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .order("name");

            if (error) throw error;
            setTags(data || []);
        } catch (error) {
            console.error("Error fetching tags:", error);
            toast.error("Erro ao carregar tags.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!tagName.trim()) {
            toast.error("O nome da tag é obrigatório.");
            return;
        }

        setActionLoading(true);
        try {
            if (editingTag) {
                const { error } = await supabase
                    .from("tags")
                    .update({ name: tagName, color: tagColor })
                    .eq("id", editingTag.id);
                if (error) throw error;
                toast.success("Tag atualizada com sucesso!");
            } else {
                const { error } = await supabase
                    .from("tags")
                    .insert({
                        organization_id: user?.organization_id,
                        name: tagName,
                        color: tagColor,
                    });
                if (error) throw error;
                toast.success("Tag criada com sucesso!");
            }
            fetchTags();
            setDialogOpen(false);
        } catch (error: any) {
            console.error("Error saving tag:", error);
            if (error.code === '23505') {
                toast.error("Já existe uma tag com este nome.");
            } else {
                toast.error("Erro ao salvar tag.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!tagToDelete) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from("tags")
                .delete()
                .eq("id", tagToDelete.id);

            if (error) throw error;

            toast.success("Tag excluída com sucesso!");
            fetchTags();
            setDeleteAlertOpen(false);
            setTagToDelete(null);
        } catch (error) {
            console.error("Error deleting tag:", error);
            toast.error("Erro ao excluir tag.");
        } finally {
            setActionLoading(false);
        }
    };

    const openEdit = (tag: Tag) => {
        setEditingTag(tag);
        setTagName(tag.name);
        setTagColor(tag.color);
        setDialogOpen(true);
    };

    const openDelete = (tag: Tag) => {
        setTagToDelete(tag);
        setDeleteAlertOpen(true);
    };

    if (loading) {
        return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>;
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-end">
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                        <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Nova Tag
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingTag ? "Editar Tag" : "Nova Tag"}</DialogTitle>
                            <DialogDescription>
                                Defina o nome e a cor para identificar esta tag.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome</Label>
                                <Input
                                    placeholder="Ex: Liderança, Visitante, Batizado"
                                    value={tagName}
                                    onChange={(e) => setTagName(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Cor</Label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                    {PRESET_COLORS.map((color) => (
                                        <button
                                            key={color}
                                            type="button"
                                            onClick={() => setTagColor(color)}
                                            className={`w-6 h-6 rounded-full border transition-all ${tagColor === color
                                                    ? "ring-2 ring-primary ring-offset-2 scale-110"
                                                    : "hover:scale-110"
                                                }`}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                </div>
                                <div className="flex items-center gap-2">
                                    <Input
                                        type="color"
                                        value={tagColor}
                                        onChange={(e) => setTagColor(e.target.value)}
                                        className="w-12 h-9 p-1 cursor-pointer"
                                    />
                                    <Input
                                        value={tagColor}
                                        onChange={(e) => setTagColor(e.target.value)}
                                        placeholder="#000000"
                                        className="font-mono uppercase"
                                        maxLength={7}
                                    />
                                </div>
                            </div>

                            <div className="pt-2">
                                <Label className="text-muted-foreground text-xs uppercase mb-2 block">Pré-visualização</Label>
                                <div className="flex justify-center p-4 border rounded-md border-dashed bg-muted/50">
                                    <Badge
                                        className="px-3 py-1 text-sm font-medium border-0"
                                        style={{ backgroundColor: tagColor, color: '#fff' }}
                                    >
                                        <TagIcon className="w-3 h-3 mr-1.5 opacity-80" />
                                        {tagName || "Nome da Tag"}
                                    </Badge>
                                </div>
                            </div>
                        </div>

                        <DialogFooter>
                            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
                            <Button onClick={handleSave} disabled={actionLoading}>
                                {actionLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                                Salvar
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className="border rounded-md">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tag</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {tags.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">
                                    Nenhuma tag criada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            tags.map((tag) => (
                                <TableRow key={tag.id}>
                                    <TableCell>
                                        <Badge
                                            className="px-2.5 py-0.5 border-0"
                                            style={{ backgroundColor: tag.color, color: '#fff' }}
                                        >
                                            {tag.name}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEdit(tag)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => openDelete(tag)}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AlertDialog open={deleteAlertOpen} onOpenChange={setDeleteAlertOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Excluir Tag</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir a tag <span className="font-medium text-foreground">{tagToDelete?.name}</span>?
                            <br /><br />
                            Esta ação removerá a tag de todas as pessoas associadas.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
