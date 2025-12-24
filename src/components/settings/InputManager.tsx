import { useState, useEffect } from "react";
import { Plus, Trash2, Edit2, Loader2, Type, Calendar, CheckSquare, List, AlignLeft } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

interface FieldDefinition {
    id: string;
    organization_id: string;
    label: string;
    type: 'text' | 'textarea' | 'date' | 'select' | 'checkbox';
    created_at: string;
}

export function InputManager() {
    const { user } = useAuth();
    const [fields, setFields] = useState<FieldDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [deleteAlertOpen, setDeleteAlertOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form State
    const [editingField, setEditingField] = useState<FieldDefinition | null>(null);
    const [fieldLabel, setFieldLabel] = useState("");
    const [fieldType, setFieldType] = useState<string>("text");
    const [fieldToDelete, setFieldToDelete] = useState<FieldDefinition | null>(null);

    useEffect(() => {
        if (user?.organization_id) {
            fetchFields();
        }
    }, [user?.organization_id]);

    useEffect(() => {
        if (!dialogOpen) {
            setEditingField(null);
            setFieldLabel("");
            setFieldType("text");
        }
    }, [dialogOpen]);

    const fetchFields = async () => {
        try {
            const { data, error } = await supabase
                .from("person_field_definitions")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setFields(data || []);
        } catch (error) {
            console.error("Error fetching fields:", error);
            toast.error("Erro ao carregar campos.");
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!fieldLabel.trim()) {
            toast.error("O nome do campo é obrigatório.");
            return;
        }

        setActionLoading(true);
        try {
            if (editingField) {
                const { error } = await supabase
                    .from("person_field_definitions")
                    .update({ label: fieldLabel, type: fieldType })
                    .eq("id", editingField.id);
                if (error) throw error;
                toast.success("Campo atualizado com sucesso!");
            } else {
                const { error } = await supabase
                    .from("person_field_definitions")
                    .insert({
                        organization_id: user?.organization_id,
                        label: fieldLabel,
                        type: fieldType,
                    });
                if (error) throw error;
                toast.success("Campo criado com sucesso!");
            }
            fetchFields();
            setDialogOpen(false);
        } catch (error: any) {
            console.error("Error saving field:", error);
            if (error.code === '23505') {
                toast.error("Já existe um campo com este nome.");
            } else {
                toast.error("Erro ao salvar campo.");
            }
        } finally {
            setActionLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!fieldToDelete) return;

        setActionLoading(true);
        try {
            const { error } = await supabase
                .from("person_field_definitions")
                .delete()
                .eq("id", fieldToDelete.id);

            if (error) throw error;

            toast.success("Campo excluído com sucesso!");
            fetchFields();
            setDeleteAlertOpen(false);
            setFieldToDelete(null);
        } catch (error) {
            console.error("Error deleting field:", error);
            toast.error("Erro ao excluir campo.");
        } finally {
            setActionLoading(false);
        }
    };

    const openEdit = (field: FieldDefinition) => {
        setEditingField(field);
        setFieldLabel(field.label);
        setFieldType(field.type);
        setDialogOpen(true);
    };

    const openDelete = (field: FieldDefinition) => {
        setFieldToDelete(field);
        setDeleteAlertOpen(true);
    };

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'text': return <Type className="w-3 h-3 mr-1" />;
            case 'textarea': return <AlignLeft className="w-3 h-3 mr-1" />;
            case 'date': return <Calendar className="w-3 h-3 mr-1" />;
            case 'checkbox': return <CheckSquare className="w-3 h-3 mr-1" />;
            case 'select': return <List className="w-3 h-3 mr-1" />;
            default: return <Type className="w-3 h-3 mr-1" />;
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'text': return "Texto";
            case 'textarea': return "Texto Grande";
            case 'date': return "Data";
            case 'checkbox': return "Sim/Não";
            case 'select': return "Seleção";
            default: return type;
        }
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
                            Novo Input
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>{editingField ? "Editar Input" : "Novo Input"}</DialogTitle>
                            <DialogDescription>
                                Crie um campo personalizado para adicionar informações extras aos perfis.
                            </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label>Nome do Campo</Label>
                                <Input
                                    placeholder="Ex: Data de Batismo, Hobby, Profissão"
                                    value={fieldLabel}
                                    onChange={(e) => setFieldLabel(e.target.value)}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo de Informação</Label>
                                <Select value={fieldType} onValueChange={setFieldType} disabled={!!editingField}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Texto (Ex: Profissão)</SelectItem>
                                        <SelectItem value="textarea">Texto Grande (Ex: Observações)</SelectItem>
                                        <SelectItem value="date">Data (Ex: Aniversário)</SelectItem>
                                        <SelectItem value="checkbox">Sim/Não (Ex: Membro Ativo)</SelectItem>
                                        {/* Select not implemented in UI yet for simplicity */}
                                        {/* <SelectItem value="select">Lista de Opções</SelectItem> */}
                                    </SelectContent>
                                </Select>
                                {editingField && (
                                    <p className="text-xs text-muted-foreground">
                                        O tipo do campo não pode ser alterado após a criação para evitar perda de dados.
                                    </p>
                                )}
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
                            <TableHead>Nome do Campo</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="w-[100px] text-right">Ações</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {fields.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    Nenhum campo personalizado criado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            fields.map((field) => (
                                <TableRow key={field.id}>
                                    <TableCell className="font-medium">
                                        {field.label}
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="font-normal">
                                            {getTypeIcon(field.type)}
                                            {getTypeLabel(field.type)}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className="flex items-center justify-end gap-2">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                onClick={() => openEdit(field)}
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                onClick={() => openDelete(field)}
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
                        <AlertDialogTitle>Excluir Campo</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja excluir o campo <span className="font-medium text-foreground">{fieldToDelete?.label}</span>?
                            <br /><br />
                            Esta ação removerá este dado de <span className="font-bold text-destructive">todas as pessoas</span> que possuem valor preenchido. Esta ação é irreversível.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDelete(); }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={actionLoading}
                        >
                            {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Excluir Definitivamente"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
