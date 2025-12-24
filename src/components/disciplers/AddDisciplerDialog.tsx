import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useDisciplers } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2, Users, User, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Discipler {
    id: string;
    name: string;
    phone: string | null;
    birth_date: string | null;
}

interface Disciple {
    id: string;
    name: string;
    phone: string | null;
    photo_url: string | null;
    assigned_at: string;
}

interface AddDisciplerDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
    editingDiscipler?: Discipler | null;
}

export function AddDisciplerDialog({ open, onOpenChange, onSuccess, editingDiscipler }: AddDisciplerDialogProps) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { createDiscipler, updateDiscipler, deleteDiscipler } = useDisciplers();
    const [loading, setLoading] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [disciples, setDisciples] = useState<Disciple[]>([]);
    const [loadingDisciples, setLoadingDisciples] = useState(false);
    const [formData, setFormData] = useState({
        firstName: "",
        lastName: "",
        whatsapp: "",
        birthDate: "",
    });

    useEffect(() => {
        if (editingDiscipler && open) {
            const names = editingDiscipler.name.split(" ");
            const firstName = names[0] || "";
            const lastName = names.slice(1).join(" ") || "";

            setFormData({
                firstName,
                lastName,
                whatsapp: formatWhatsApp(editingDiscipler.phone || ""),
                birthDate: editingDiscipler.birth_date ? formatDateForInput(editingDiscipler.birth_date) : "",
            });

            // Fetch disciples for this discipler
            fetchDisciples(editingDiscipler.id);
        } else if (open) {
            setFormData({ firstName: "", lastName: "", whatsapp: "", birthDate: "" });
            setDisciples([]);
        }
    }, [editingDiscipler, open]);

    const fetchDisciples = async (disciplerId: string) => {
        setLoadingDisciples(true);
        try {
            // We need to find people who have this discipler_id
            // And also get the date when they were assigned (from person_history)
            const { data: peopleData, error: peopleError } = await supabase
                .from("people")
                .select("id, name, phone, photo_url, updated_at")
                .eq("discipler_id", disciplerId)
                .order("name");

            if (peopleError) throw peopleError;

            // For each person, try to get the assignment date from history
            const disciplesWithDates: Disciple[] = [];

            for (const person of (peopleData || [])) {
                // Try to find the history entry for when discipler was assigned
                const { data: historyData } = await supabase
                    .from("person_history")
                    .select("created_at")
                    .eq("person_id", person.id)
                    .eq("action_type", "info_update")
                    .ilike("description", "%Discipulador%")
                    .order("created_at", { ascending: false })
                    .limit(1);

                disciplesWithDates.push({
                    id: person.id,
                    name: person.name,
                    phone: person.phone,
                    photo_url: person.photo_url,
                    assigned_at: historyData?.[0]?.created_at || person.updated_at
                });
            }

            setDisciples(disciplesWithDates);
        } catch (error) {
            console.error("Error fetching disciples:", error);
        } finally {
            setLoadingDisciples(false);
        }
    };

    function formatWhatsApp(value: string) {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 7) return `(${numbers.slice(0, 2)}) ${numbers.slice(2)}`;
        if (numbers.length <= 11) return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7)}`;
        return `(${numbers.slice(0, 2)}) ${numbers.slice(2, 7)}-${numbers.slice(7, 11)}`;
    }

    function formatDateForInput(dateStr: string) {
        const [year, month, day] = dateStr.split("-");
        return `${day}/${month}/${year}`;
    }

    function formatBirthDate(value: string) {
        const numbers = value.replace(/\D/g, "");
        if (numbers.length <= 2) return numbers;
        if (numbers.length <= 4) return `${numbers.slice(0, 2)}/${numbers.slice(2)}`;
        return `${numbers.slice(0, 2)}/${numbers.slice(2, 4)}/${numbers.slice(4, 8)}`;
    }

    const handleWhatsAppChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, whatsapp: formatWhatsApp(e.target.value) });
    };

    const handleBirthDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, birthDate: formatBirthDate(e.target.value) });
    };

    const handleDelete = async () => {
        if (!editingDiscipler) return;

        setLoading(true);
        try {
            await deleteDiscipler.mutateAsync(editingDiscipler.id);
            toast.success("Discipulador removido com sucesso.");
            onSuccess();
            onOpenChange(false);
        } catch (error) {
            console.error("Error deleting discipler:", error);
            toast.error("Erro ao remover discipulador.");
        } finally {
            setLoading(false);
            setShowDeleteConfirm(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user?.organization_id) {
            toast.error("Organização não encontrada.");
            return;
        }

        if (!formData.firstName.trim() || !formData.lastName.trim() || !formData.whatsapp.trim()) {
            toast.error("Preencha todos os campos obrigatórios.");
            return;
        }

        let dbBirthDate = null;
        if (formData.birthDate) {
            const parts = formData.birthDate.split("/");
            if (parts.length === 3 && parts[2].length === 4) {
                dbBirthDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
                toast.error("Data de nascimento inválida. Use DD/MM/AAAA");
                return;
            }
        }

        setLoading(true);

        try {
            const phoneNumbers = formData.whatsapp.replace(/\D/g, "");
            const fullName = `${formData.firstName.trim()} ${formData.lastName.trim()}`;

            const payload = {
                name: fullName,
                phone: phoneNumbers,
                birth_date: dbBirthDate,
            };

            if (editingDiscipler) {
                await updateDiscipler.mutateAsync({
                    id: editingDiscipler.id,
                    data: payload
                });
                toast.success("Discipulador atualizado com sucesso.");
            } else {
                await createDiscipler.mutateAsync(payload);
                toast.success("Discipulador adicionado com sucesso.");
            }

            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error saving discipler:", error);
            if (error.code === "23505") {
                toast.error("Já existe uma pessoa cadastrada com este número de WhatsApp.");
            } else {
                toast.error("Erro ao salvar discipulador. Tente novamente.");
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDiscipleClick = (discipleId: string) => {
        onOpenChange(false);
        navigate(`/pessoas/${discipleId}`);
    };

    const isEditing = !!editingDiscipler;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className={cn("sm:max-w-[500px]", isEditing && "sm:max-w-[550px]")}>
                    <DialogHeader>
                        <DialogTitle>{isEditing ? "Discipulador" : "Novo Discipulador"}</DialogTitle>
                        <DialogDescription>
                            {isEditing ? `Gerencie ${editingDiscipler?.name}` : "Adicione um novo discipulador ao sistema."}
                        </DialogDescription>
                    </DialogHeader>

                    {isEditing ? (
                        <Tabs defaultValue="info" className="w-full">
                            <TabsList className="w-full grid grid-cols-2">
                                <TabsTrigger value="info" className="gap-2">
                                    <User className="h-4 w-4" />
                                    Informações
                                </TabsTrigger>
                                <TabsTrigger value="disciples" className="gap-2">
                                    <Users className="h-4 w-4" />
                                    Discipulados ({disciples.length})
                                </TabsTrigger>
                            </TabsList>

                            <TabsContent value="info" className="mt-4">
                                <form onSubmit={handleSubmit}>
                                    <div className="grid gap-4">
                                        <div className="grid gap-2">
                                            <Label htmlFor="firstName">Nome *</Label>
                                            <Input
                                                id="firstName"
                                                value={formData.firstName}
                                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                                placeholder="Digite o nome"
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="lastName">Sobrenome *</Label>
                                            <Input
                                                id="lastName"
                                                value={formData.lastName}
                                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                                placeholder="Digite o sobrenome"
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="whatsapp">WhatsApp *</Label>
                                            <Input
                                                id="whatsapp"
                                                value={formData.whatsapp}
                                                onChange={handleWhatsAppChange}
                                                placeholder="(00) 00000-0000"
                                                maxLength={15}
                                                disabled={loading}
                                                required
                                            />
                                        </div>
                                        <div className="grid gap-2">
                                            <Label htmlFor="birthDate">Data de Nascimento</Label>
                                            <Input
                                                id="birthDate"
                                                value={formData.birthDate}
                                                onChange={handleBirthDateChange}
                                                placeholder="DD/MM/AAAA"
                                                maxLength={10}
                                                disabled={loading}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center mt-6">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                            onClick={() => setShowDeleteConfirm(true)}
                                            disabled={loading}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" />
                                            Excluir
                                        </Button>
                                        <div className="flex gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={() => onOpenChange(false)}
                                                disabled={loading}
                                            >
                                                Cancelar
                                            </Button>
                                            <Button type="submit" disabled={loading}>
                                                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Salvar
                                            </Button>
                                        </div>
                                    </div>
                                </form>
                            </TabsContent>

                            <TabsContent value="disciples" className="mt-4">
                                {loadingDisciples ? (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                                    </div>
                                ) : disciples.length === 0 ? (
                                    <div className="text-center py-8 text-muted-foreground">
                                        <Users className="h-12 w-12 mx-auto mb-3 opacity-20" />
                                        <p className="text-sm">Nenhum discipulado ainda.</p>
                                        <p className="text-xs mt-1">Atribua pessoas a este discipulador na tela da pessoa.</p>
                                    </div>
                                ) : (
                                    <ScrollArea className="h-[280px] pr-4">
                                        <div className="space-y-1">
                                            {disciples.map((disciple) => (
                                                <button
                                                    key={disciple.id}
                                                    onClick={() => handleDiscipleClick(disciple.id)}
                                                    className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left group"
                                                >
                                                    <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center overflow-hidden shrink-0">
                                                        {disciple.photo_url ? (
                                                            <img src={disciple.photo_url} alt="" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-sm font-medium text-muted-foreground">
                                                                {disciple.name.charAt(0)}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium truncate">{disciple.name}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            Desde {format(new Date(disciple.assigned_at), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                                                        </p>
                                                    </div>
                                                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                                </button>
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}
                            </TabsContent>
                        </Tabs>
                    ) : (
                        <form onSubmit={handleSubmit}>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="firstName">Nome *</Label>
                                    <Input
                                        id="firstName"
                                        value={formData.firstName}
                                        onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                        placeholder="Digite o nome"
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="lastName">Sobrenome *</Label>
                                    <Input
                                        id="lastName"
                                        value={formData.lastName}
                                        onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                        placeholder="Digite o sobrenome"
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="whatsapp">WhatsApp *</Label>
                                    <Input
                                        id="whatsapp"
                                        value={formData.whatsapp}
                                        onChange={handleWhatsAppChange}
                                        placeholder="(00) 00000-0000"
                                        maxLength={15}
                                        disabled={loading}
                                        required
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="birthDate">Data de Nascimento</Label>
                                    <Input
                                        id="birthDate"
                                        value={formData.birthDate}
                                        onChange={handleBirthDateChange}
                                        placeholder="DD/MM/AAAA"
                                        maxLength={10}
                                        disabled={loading}
                                    />
                                </div>
                            </div>
                            <DialogFooter>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => onOpenChange(false)}
                                    disabled={loading}
                                >
                                    Cancelar
                                </Button>
                                <Button type="submit" disabled={loading}>
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Adicionar
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>

            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Esta ação removerá o discipulador <strong>{editingDiscipler?.name}</strong> permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => {
                                e.preventDefault();
                                handleDelete();
                            }}
                            className={cn(buttonVariants({ variant: "destructive" }))}
                            disabled={loading}
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                            Sim, excluir
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}
