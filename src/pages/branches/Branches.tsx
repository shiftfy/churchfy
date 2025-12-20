import { useState } from "react";
import { Navigate } from "react-router-dom";
import { useBranches } from "@/hooks/useData";
import { useSubscription } from "@/hooks/useSubscription";
import type { Branch } from "@/lib/supabase";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Plus, Pencil, Trash2, MapPin, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

const branchSchema = z.object({
    name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres"),
    slug: z
        .string()
        .min(3, "Slug deve ter no mínimo 3 caracteres")
        .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
    address: z.string().optional(),
    phone: z.string().optional(),
    is_active: z.boolean(),
});

type BranchFormData = z.infer<typeof branchSchema>;

// Skeleton para tabela de branches
function BranchTableSkeleton() {
    return (
        <>
            {Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-5 w-10 rounded-full" />
                            <Skeleton className="h-4 w-12" />
                        </div>
                    </TableCell>
                    <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                            <Skeleton className="h-8 w-8 rounded-md" />
                            <Skeleton className="h-8 w-8 rounded-md" />
                        </div>
                    </TableCell>
                </TableRow>
            ))}
        </>
    );
}

export function Branches() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [branchToDelete, setBranchToDelete] = useState<Branch | null>(null);

    const { canCreateBranches, planId } = useSubscription();

    // Bloqueia acesso totalmente para o plano ONE
    if (planId === 'one') {
        return <Navigate to="/dashboard" replace />;
    }

    // React Query hook
    const {
        data: branches = [],
        isLoading,
        createBranch,
        updateBranch,
        deleteBranch,
    } = useBranches();

    const {
        register,
        handleSubmit,
        reset,
        setValue,
        watch,
        formState: { errors, isSubmitting },
    } = useForm<BranchFormData>({
        resolver: zodResolver(branchSchema),
        defaultValues: {
            is_active: true,
        },
    });

    const isActive = watch("is_active");

    const generateSlug = (name: string) => {
        return name
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    };

    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const name = e.target.value;
        if (!editingBranch) {
            setValue("slug", generateSlug(name));
        }
    };

    const handleOpenDialog = (branch?: Branch) => {
        if (branch) {
            setEditingBranch(branch);
            reset({
                name: branch.name,
                slug: branch.slug,
                address: branch.address || "",
                phone: branch.phone || "",
                is_active: branch.is_active,
            });
        } else {
            setEditingBranch(null);
            reset({
                name: "",
                slug: "",
                address: "",
                phone: "",
                is_active: true,
            });
        }
        setDialogOpen(true);
    };

    const onSubmit = async (data: BranchFormData) => {
        try {
            if (editingBranch) {
                await updateBranch.mutateAsync({ id: editingBranch.id, data });
            } else {
                await createBranch.mutateAsync(data);
            }
            setDialogOpen(false);
            reset();
        } catch (error: any) {
            console.error("Error saving branch:", error);
            alert(error.message || "Erro ao salvar filial");
        }
    };

    const handleDelete = async () => {
        if (!branchToDelete) return;

        try {
            await deleteBranch.mutateAsync(branchToDelete.id);
            setDeleteDialogOpen(false);
            setBranchToDelete(null);
        } catch (error: any) {
            console.error("Error deleting branch:", error);
            alert(error.message || "Erro ao excluir filial");
        }
    };

    const toggleBranchStatus = async (branch: Branch) => {
        try {
            await updateBranch.mutateAsync({
                id: branch.id,
                data: { is_active: !branch.is_active },
            });
        } catch (error: any) {
            console.error("Error toggling branch status:", error);
            alert(error.message || "Erro ao atualizar status");
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Filiais</h1>
                    <p className="text-muted-foreground mt-1">Gerencie as filiais da sua organização</p>
                </div>
                {canCreateBranches ? (
                    <Button onClick={() => handleOpenDialog()}>
                        <Plus className="w-4 h-4 mr-2" />
                        Nova Filial
                    </Button>
                ) : (
                    <Button variant="outline" disabled className="opacity-70 cursor-not-allowed">
                        <Lock className="w-4 h-4 mr-2" />
                        Upgrade Necessário
                    </Button>
                )}
            </div>

            {/* Branches Table */}
            {isLoading ? (
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-40" />
                        <Skeleton className="h-4 w-64 mt-2" />
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Endereço</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <BranchTableSkeleton />
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : branches.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <MapPin className="w-12 h-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">Nenhuma filial cadastrada</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            Comece criando sua primeira filial
                        </p>
                        <Button onClick={() => handleOpenDialog()}>
                            <Plus className="w-4 h-4 mr-2" />
                            Criar Primeira Filial
                        </Button>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardHeader>
                        <CardTitle>Lista de Filiais ({branches.length})</CardTitle>
                        <CardDescription>Visualize e gerencie todas as filiais cadastradas</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nome</TableHead>
                                    <TableHead>Endereço</TableHead>
                                    <TableHead>Telefone</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="text-right">Ações</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {branches.map((branch: Branch) => (
                                    <TableRow key={branch.id}>
                                        <TableCell className="font-medium">{branch.name}</TableCell>
                                        <TableCell>{branch.address || "-"}</TableCell>
                                        <TableCell>{branch.phone || "-"}</TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    checked={branch.is_active}
                                                    onCheckedChange={() => toggleBranchStatus(branch)}
                                                />
                                                <span className="text-sm">
                                                    {branch.is_active ? "Ativa" : "Inativa"}
                                                </span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleOpenDialog(branch)}
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => {
                                                        setBranchToDelete(branch);
                                                        setDeleteDialogOpen(true);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            )}

            {/* Create/Edit Dialog */}
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingBranch ? "Editar Filial" : "Nova Filial"}</DialogTitle>
                        <DialogDescription>
                            {editingBranch
                                ? "Atualize as informações da filial"
                                : "Preencha os dados da nova filial"}
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Nome da Filial *</Label>
                            <Input
                                id="name"
                                {...register("name")}
                                onChange={handleNameChange}
                                placeholder="Ex: Filial Centro"
                            />
                            {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="slug">Slug *</Label>
                            <Input id="slug" {...register("slug")} placeholder="filial-centro" />
                            {errors.slug && <p className="text-sm text-destructive">{errors.slug.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="address">Endereço</Label>
                            <Input id="address" {...register("address")} placeholder="Rua, Número, Bairro" />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="phone">Telefone</Label>
                            <Input id="phone" {...register("phone")} placeholder="(00) 00000-0000" />
                        </div>

                        <div className="flex items-center space-x-2">
                            <Switch
                                id="is_active"
                                checked={isActive}
                                onCheckedChange={(checked) => setValue("is_active", checked)}
                            />
                            <Label htmlFor="is_active">Filial ativa</Label>
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                                Cancelar
                            </Button>
                            <Button type="submit" disabled={isSubmitting}>
                                {isSubmitting ? "Salvando..." : editingBranch ? "Atualizar" : "Criar"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Excluir Filial</DialogTitle>
                        <DialogDescription>
                            Tem certeza que deseja excluir a filial <strong>{branchToDelete?.name}</strong>? Esta
                            ação não pode ser desfeita.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                            Cancelar
                        </Button>
                        <Button variant="destructive" onClick={handleDelete}>
                            Excluir
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
