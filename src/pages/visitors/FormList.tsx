import { useState, useEffect } from "react";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import type { Form } from "@/types/form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { QRCodeDialog } from "@/components/visitors/QRCodeDialog";
import { Plus, Pencil, Trash2, FileText, Eye, Copy, QrCode } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

export function FormList() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [forms, setForms] = useState<Form[]>([]);
    const [loading, setLoading] = useState(true);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [formToDelete, setFormToDelete] = useState<Form | null>(null);
    const [qrCodeOpen, setQrCodeOpen] = useState(false);
    const [selectedFormForQr, setSelectedFormForQr] = useState<Form | null>(null);
    const [orgUsername, setOrgUsername] = useState("");

    useEffect(() => {
        if (user?.organization_id) {
            fetchForms();
            fetchOrganization();
        } else if (user && !user.organization_id) {
            setLoading(false);
        }
    }, [user]);

    const fetchOrganization = async () => {
        try {
            const { data, error } = await supabase
                .from("organizations")
                .select("username")
                .eq("id", user?.organization_id)
                .single();

            if (error) throw error;
            setOrgUsername(data?.username || "");
        } catch (error) {
            console.error("Error fetching organization:", error);
        }
    };

    const fetchForms = async () => {
        if (!user?.organization_id) return;

        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("forms")
                .select(`
                    *,
                    journeys:journey_id(title),
                    response_count:visitor_responses(count)
                `)
                .eq("organization_id", user.organization_id)
                .order("created_at", { ascending: false });

            if (error) throw error;
            setForms(data || []);
        } catch (error) {
            console.error("Error fetching forms:", error);
        } finally {
            setLoading(false);
        }
    };

    const toggleFormStatus = async (formId: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from("forms")
                .update({ is_active: !currentStatus })
                .eq("id", formId);

            if (error) throw error;

            setForms(
                forms.map((f) =>
                    f.id === formId ? { ...f, is_active: !currentStatus } : f
                )
            );
        } catch (error: any) {
            console.error("Error toggling form status:", error);
            alert(error.message || "Erro ao alterar status do formulário");
        }
    };

    const handleDelete = async () => {
        if (!formToDelete) return;

        try {
            const { error } = await supabase
                .from("forms")
                .delete()
                .eq("id", formToDelete.id);

            if (error) throw error;

            setForms(forms.filter((f) => f.id !== formToDelete.id));
            setDeleteDialogOpen(false);
            setFormToDelete(null);
        } catch (error: any) {
            console.error("Error deleting form:", error);
            alert(error.message || "Erro ao excluir formulário");
        }
    };

    const copyPublicLink = (slug: string) => {
        const url = `${window.location.origin}/${orgUsername}/${slug}`;
        navigator.clipboard.writeText(url);
        alert("Link copiado para a área de transferência!");
    };

    const openQrCode = (form: Form) => {
        setSelectedFormForQr(form);
        setQrCodeOpen(true);
    };

    if (loading) {
        return (
            <div className="space-y-6">
                {/* Menu - sem animação */}
                <SectionTabs
                    items={[
                        { label: "Formulários", href: "/formularios" },
                        { label: "Fluxos", href: "/engajamento/fluxos" },
                        { label: "Inputs e Tags", href: "/engajamento/tags" },
                    ]}
                />

                {/* Conteúdo - com animação */}
                <div className="animate-in fade-in duration-300 space-y-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Formulários</h1>
                            <p className="text-muted-foreground mt-1">
                                Crie e gerencie formulários para coleta de dados de visitantes
                            </p>
                        </div>
                        <div className="h-10 w-40 bg-muted animate-pulse rounded-md" />
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="h-6 w-48 bg-muted animate-pulse rounded-md" />
                            <div className="h-4 w-64 bg-muted animate-pulse rounded-md mt-2" />
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-3">
                                {Array.from({ length: 5 }).map((_, i) => (
                                    <div key={i} className="flex items-center gap-4 py-3 border-b border-border/40">
                                        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                                        <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                                        <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                                        <div className="ml-auto flex gap-2">
                                            {Array.from({ length: 4 }).map((_, j) => (
                                                <div key={j} className="h-8 w-8 bg-muted animate-pulse rounded-md" />
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Menu - sem animação */}
            <SectionTabs
                items={[
                    { label: "Formulários", href: "/formularios" },
                    { label: "Fluxos", href: "/engajamento/fluxos" },
                    { label: "Inputs e Tags", href: "/engajamento/tags" },
                ]}
            />

            {/* Conteúdo - com animação */}
            <div className="animate-in fade-in duration-300 space-y-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-foreground">Formulários</h1>
                        <p className="text-muted-foreground mt-1">
                            Crie e gerencie formulários para coleta de dados de visitantes
                        </p>
                    </div>
                    <Button onClick={() => navigate("/formularios/novo")}>
                        <Plus className="w-4 h-4 mr-2" />
                        Novo Formulário
                    </Button>
                </div>

                {forms.length === 0 ? (
                    <Card>
                        <CardContent className="flex flex-col items-center justify-center py-12">
                            <FileText className="w-12 h-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">Nenhum formulário criado</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                Crie seu primeiro formulário para começar a receber visitantes
                            </p>
                            <Button onClick={() => navigate("/formularios/novo")}>
                                <Plus className="w-4 h-4 mr-2" />
                                Criar Primeiro Formulário
                            </Button>
                        </CardContent>
                    </Card>
                ) : (
                    <Card>
                        <CardHeader>
                            <CardTitle>Seus Formulários ({forms.length})</CardTitle>
                            <CardDescription>Gerencie seus formulários ativos e inativos</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Título</TableHead>
                                        <TableHead>Jornada</TableHead>
                                        <TableHead>Respostas</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {forms.map((form) => (
                                        <TableRow key={form.id}>
                                            <TableCell className="font-medium">{form.title}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {form.journeys?.title || "Sem jornada"}
                                            </TableCell>
                                            <TableCell>
                                                {form.response_count?.[0]?.count || 0}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Switch
                                                        checked={form.is_active}
                                                        onCheckedChange={() => toggleFormStatus(form.id, form.is_active)}
                                                    />
                                                    <span className="text-sm">
                                                        {form.is_active ? "Ativo" : "Inativo"}
                                                    </span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Ver página pública"
                                                        onClick={() => window.open(`/${orgUsername}/${form.slug}`, "_blank")}
                                                    >
                                                        <Eye className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Copiar link"
                                                        onClick={() => copyPublicLink(form.slug)}
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="QR Code"
                                                        onClick={() => openQrCode(form)}
                                                    >
                                                        <QrCode className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Editar"
                                                        onClick={() => navigate(`/formularios/editar/${form.id}`)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="Excluir"
                                                        onClick={() => {
                                                            setFormToDelete(form);
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

                <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Excluir Formulário</DialogTitle>
                            <DialogDescription>
                                Tem certeza que deseja excluir o formulário <strong>{formToDelete?.title}</strong>?
                                Esta ação não pode ser desfeita e todas as respostas associadas serão perdidas.
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

                {selectedFormForQr && (
                    <QRCodeDialog
                        open={qrCodeOpen}
                        onOpenChange={setQrCodeOpen}
                        url={`${window.location.origin}/${orgUsername}/${selectedFormForQr.slug}`}
                        title={selectedFormForQr.title}
                    />
                )}
            </div>
        </div>
    );
}
