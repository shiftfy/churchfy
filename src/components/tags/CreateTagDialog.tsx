import { useState } from "react";
import { Loader2, Tag as TagIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

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

interface CreateTagDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (tag: any) => void;
}

export function CreateTagDialog({ open, onOpenChange, onSuccess }: CreateTagDialogProps) {
    const { user } = useAuth();
    const [tagName, setTagName] = useState("");
    const [tagColor, setTagColor] = useState(PRESET_COLORS[6]); // Default blue
    const [loading, setLoading] = useState(false);

    const handleSave = async () => {
        if (!tagName.trim()) {
            toast.error("O nome da tag é obrigatório.");
            return;
        }

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("tags")
                .insert({
                    organization_id: user?.organization_id,
                    name: tagName,
                    color: tagColor,
                })
                .select()
                .single();

            if (error) throw error;

            toast.success("Tag criada com sucesso!");
            setTagName("");
            setTagColor(PRESET_COLORS[6]);
            onOpenChange(false);
            if (onSuccess) onSuccess(data);
        } catch (error: any) {
            console.error("Error saving tag:", error);
            if (error.code === '23505') {
                toast.error("Já existe uma tag com este nome.");
            } else {
                toast.error("Erro ao salvar tag.");
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[550px]">
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
                                className="px-3 py-1 text-sm font-medium border-0 text-white"
                                style={{ backgroundColor: tagColor }}
                            >
                                <TagIcon className="w-3 h-3 mr-1.5 opacity-80 text-white" />
                                {tagName || "Nome da Tag"}
                            </Badge>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={loading}>
                        {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
