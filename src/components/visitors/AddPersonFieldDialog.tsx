import { useState, useEffect } from "react";
import { Plus, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
    DialogTrigger,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface FieldDefinition {
    id: string;
    label: string;
    type: 'text' | 'date' | 'select' | 'checkbox';
    organization_id: string;
    options?: string[];
}

interface AddPersonFieldDialogProps {
    onFieldAdded: (fieldDefId: string, value: any, newDefinition?: FieldDefinition) => Promise<void>;
}

export function AddPersonFieldDialog({ onFieldAdded }: AddPersonFieldDialogProps) {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);
    const [definitions, setDefinitions] = useState<FieldDefinition[]>([]);
    const [loadingDefinitions, setLoadingDefinitions] = useState(false);
    const [mode, setMode] = useState<'select' | 'create'>('select');

    // Form state
    const [selectedDefId, setSelectedDefId] = useState<string>("");
    const [fieldValue, setFieldValue] = useState("");

    // Create Mode State
    const [newFieldLabel, setNewFieldLabel] = useState("");
    const [newFieldType, setNewFieldType] = useState<FieldDefinition['type']>('text');

    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open && user?.organization_id && mode === 'select') {
            fetchDefinitions();
        }
    }, [open, user, mode]);

    // Cleanup on close
    useEffect(() => {
        if (!open) {
            setSelectedDefId("");
            setFieldValue("");
            setNewFieldLabel("");
            setNewFieldType("text");
            setMode("select");
        }
    }, [open]);

    const fetchDefinitions = async () => {
        setLoadingDefinitions(true);
        try {
            const { data, error } = await supabase
                .from("person_field_definitions")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .order("label");

            if (error) throw error;
            setDefinitions(data || []);
        } catch (error) {
            console.error("Error fetching definitions:", error);
            toast.error("Erro ao carregar campos disponíveis.");
        } finally {
            setLoadingDefinitions(false);
        }
    };

    const handleSave = async () => {
        if (mode === 'select' && !selectedDefId) {
            toast.error("Selecione um campo.");
            return;
        }

        if (mode === 'create' && !newFieldLabel) {
            toast.error("Digite o nome do campo.");
            return;
        }

        if (mode === 'select' && !fieldValue && fieldValue !== "false") { // Allow false for checkbox? Logic below handles types
            // Basic empty check
            if (!fieldValue && fieldValue !== "") { // Allow empty string? Usually we want a value.
                toast.error("Preencha o valor do campo.");
                return;
            }
        }

        // Ensure value is present for create mode too
        if (!fieldValue && fieldValue !== "") {
            toast.error("Preencha o valor inicial.");
            return;
        }

        setSaving(true);
        try {
            if (mode === 'create') {
                // Create definition first
                const { data: newDef, error: createError } = await supabase
                    .from("person_field_definitions")
                    .insert({
                        organization_id: user?.organization_id,
                        label: newFieldLabel,
                        type: newFieldType,
                        options: []
                    })
                    .select()
                    .single();

                if (createError) throw createError;

                // Add value using new definition
                await onFieldAdded(newDef.id, fieldValue, newDef);
            } else {
                // Use existing definition
                await onFieldAdded(selectedDefId, fieldValue);
            }

            setOpen(false);
            // Success toast is handled by parent, or we show it here?
            // Parent shows "Campo adicionado com sucesso!". We can rely on that.
        } catch (error) {
            console.error("Error saving field:", error);
            toast.error("Erro ao salvar informação.");
        } finally {
            setSaving(false);
        }
    };

    const selectedDef = mode === 'select' ? definitions.find(d => d.id === selectedDefId) : {
        type: newFieldType,
        label: newFieldLabel || "Novo Campo"
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="h-8">
                    <Plus className="w-3 h-3 mr-2" />
                    Adicionar Informação
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Adicionar Informação</DialogTitle>
                </DialogHeader>

                <Tabs value={mode} onValueChange={(v) => setMode(v as 'select' | 'create')} className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="select">Existente</TabsTrigger>
                        <TabsTrigger value="create">Novo Campo</TabsTrigger>
                    </TabsList>

                    <div className="py-4 space-y-4">
                        <TabsContent value="select" className="mt-0 space-y-4">
                            <div className="space-y-2">
                                <Label>Campo</Label>
                                <Select value={selectedDefId} onValueChange={setSelectedDefId} disabled={loadingDefinitions}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={loadingDefinitions ? "Carregando..." : "Selecione um campo..."} />
                                    </SelectTrigger>
                                    <SelectContent className="max-h-[300px]">
                                        {definitions.length === 0 ? (
                                            <div className="p-2 text-sm text-center text-muted-foreground">
                                                Nenhum campo disponível.
                                            </div>
                                        ) : (
                                            definitions.map((def) => (
                                                <SelectItem key={def.id} value={def.id}>
                                                    {def.label}
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        <TabsContent value="create" className="mt-0 space-y-4">
                            <div className="space-y-2">
                                <Label>Nome do Campo</Label>
                                <Input
                                    placeholder="Ex: Profissão, Hobby..."
                                    value={newFieldLabel}
                                    onChange={(e) => setNewFieldLabel(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Tipo de Dado</Label>
                                <Select value={newFieldType} onValueChange={(v: any) => setNewFieldType(v)}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="text">Texto Curto</SelectItem>
                                        <SelectItem value="date">Data</SelectItem>
                                        <SelectItem value="checkbox">Sim/Não</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </TabsContent>

                        {/* Value Input Area - Common for both modes */}
                        {(selectedDefId || mode === 'create') && selectedDef && (
                            <div className="space-y-2 pt-2 border-t mt-2">
                                <Label>Valor para este perfil</Label>
                                {selectedDef.type === 'date' ? (
                                    <Input
                                        type="date"
                                        value={fieldValue}
                                        onChange={(e) => setFieldValue(e.target.value)}
                                    />
                                ) : selectedDef.type === 'checkbox' ? (
                                    <Select value={fieldValue} onValueChange={setFieldValue}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Selecione..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="true">Sim</SelectItem>
                                            <SelectItem value="false">Não</SelectItem>
                                        </SelectContent>
                                    </Select>
                                ) : (
                                    <Input
                                        placeholder={`Digite o valor...`}
                                        value={fieldValue}
                                        onChange={(e) => setFieldValue(e.target.value)}
                                    />
                                )}
                            </div>
                        )}
                    </div>
                </Tabs>

                <DialogFooter>
                    <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                    <Button onClick={handleSave} disabled={saving || (mode === 'select' && !selectedDefId)}>
                        {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                        Salvar
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
