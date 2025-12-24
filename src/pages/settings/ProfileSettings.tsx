import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { User, Camera, Receipt, FileText, ExternalLink, AlertTriangle } from "lucide-react";
import { DeleteAccountDialog } from "./components/DeleteAccountDialog";

interface Invoice {
    id: string;
    number: string | null;
    amount: number;
    currency: string;
    status: string;
    created: number;
    period_start: number;
    period_end: number;
    invoice_pdf: string | null;
    hosted_invoice_url: string | null;
}

const profileSchema = z.object({
    firstName: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    lastName: z.string().min(2, "Sobrenome deve ter pelo menos 2 caracteres"),
    email: z.string().email(),
    phone: z.string().min(14, "Telefone inválido").optional().or(z.literal("")),
    avatar_url: z.string().optional(),
});

type ProfileForm = z.infer<typeof profileSchema>;

// Simple phone mask function (BR format)
const formatPhone = (value: string) => {
    if (!value) return "";
    const numbers = value.replace(/\D/g, "");
    if (numbers.length <= 10) {
        return numbers.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
    }
    return numbers.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
};

export function ProfileSettings() {
    const { user, fetchUserData } = useAuth(); // Assuming fetchUserData is exposed or we need to reload session
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loadingInvoices, setLoadingInvoices] = useState(true);
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const form = useForm<ProfileForm>({
        resolver: zodResolver(profileSchema),
        defaultValues: {
            firstName: "",
            lastName: "",
            email: "",
            phone: "",
            avatar_url: "",
        },
    });

    useEffect(() => {
        if (user) {
            const [firstName, ...lastNameParts] = (user.full_name || "").split(" ");
            const lastName = lastNameParts.join(" ");

            form.reset({
                firstName: firstName || "",
                lastName: lastName || "",
                email: user.email || "",
                phone: user.phone || "",
                avatar_url: user.avatar_url || "",
            });
        }
    }, [user]);

    // Fetch invoices from Stripe via Edge Function
    useEffect(() => {
        const fetchInvoices = async () => {
            try {
                setLoadingInvoices(true);
                const { data: { session } } = await supabase.auth.getSession();
                const token = session?.access_token;

                if (!token) {
                    console.warn("No session token for fetching invoices");
                    setLoadingInvoices(false);
                    return;
                }

                const { data, error } = await supabase.functions.invoke('get-invoices', {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (error) {
                    console.error("Error fetching invoices:", error);
                    return;
                }

                if (data?.invoices) {
                    setInvoices(data.invoices);
                }
            } catch (error) {
                console.error("Error fetching invoices:", error);
            } finally {
                setLoadingInvoices(false);
            }
        };

        fetchInvoices();
    }, []);

    const onSubmit = async (data: ProfileForm) => {
        if (!user?.id) return;

        setLoading(true);
        try {
            const fullName = `${data.firstName} ${data.lastName}`.trim();

            const { error } = await supabase
                .from("users")
                .update({
                    full_name: fullName,
                    phone: data.phone,
                    avatar_url: data.avatar_url,
                })
                .eq("id", user.id);

            if (error) throw error;

            toast.success("Perfil atualizado com sucesso!");
            await fetchUserData(user.id);
        } catch (error) {
            console.error("Error updating profile:", error);
            toast.error("Erro ao atualizar perfil");
        } finally {
            setLoading(false);
        }
    };

    const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!user) return;
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.id}-${Math.random()}.${fileExt}`;
            const filePath = `avatars/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Auto-save to database
            const { error: updateError } = await supabase
                .from("users")
                .update({ avatar_url: publicUrl })
                .eq("id", user.id);

            if (updateError) throw updateError;

            form.setValue("avatar_url", publicUrl);
            await fetchUserData(user.id); // Refresh context
            toast.success("Foto atualizada com sucesso!");
        } catch (error) {
            console.error("Error uploading avatar:", error);
            toast.error(`Erro ao fazer upload da foto: ${(error as Error).message}`);
        } finally {
            setUploading(false);
        }
    };

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const formatted = formatPhone(e.target.value);
        form.setValue("phone", formatted);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Conta Pessoal</h1>
                <p className="text-muted-foreground">
                    Gerencie suas informações pessoais e de contato.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados Pessoais</CardTitle>
                    <CardDescription>
                        Suas informações de identificação na plataforma.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Avatar Upload */}
                        <div className="flex items-center gap-6">
                            <div className="relative h-24 w-24 rounded-full border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden group">
                                {form.watch("avatar_url") ? (
                                    <img
                                        src={form.watch("avatar_url")}
                                        alt="Avatar"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <User className="h-8 w-8 text-muted-foreground" />
                                )}
                                <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    <Camera className="h-6 w-6 text-white" />
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleAvatarUpload}
                                    disabled={uploading}
                                />
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium">Sua Foto</h3>
                                <p className="text-sm text-muted-foreground">
                                    Clique na imagem para alterar.
                                </p>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2">
                                <Label htmlFor="firstName">Primeiro Nome</Label>
                                <Input
                                    id="firstName"
                                    placeholder="Seu primeiro nome"
                                    {...form.register("firstName")}
                                />
                                {form.formState.errors.firstName && (
                                    <p className="text-sm text-destructive">{form.formState.errors.firstName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="lastName">Sobrenome</Label>
                                <Input
                                    id="lastName"
                                    placeholder="Seu sobrenome"
                                    {...form.register("lastName")}
                                />
                                {form.formState.errors.lastName && (
                                    <p className="text-sm text-destructive">{form.formState.errors.lastName.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="email">Email</Label>
                                <Input
                                    id="email"
                                    {...form.register("email")}
                                    disabled
                                    className="bg-muted"
                                />
                                <p className="text-xs text-muted-foreground">
                                    O email não pode ser alterado.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="phone">Telefone</Label>
                                <Input
                                    id="phone"
                                    placeholder="(00) 00000-0000"
                                    value={form.watch("phone")}
                                    onChange={handlePhoneChange}
                                />
                                {form.formState.errors.phone && (
                                    <p className="text-sm text-destructive">{form.formState.errors.phone.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button type="submit" disabled={loading}>
                                {loading ? "Salvando..." : "Salvar Alterações"}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Invoices Section */}
            <Card>
                <CardHeader>
                    <CardTitle>
                        Faturas
                    </CardTitle>
                    <CardDescription>
                        Histórico de faturas pagas da sua assinatura.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loadingInvoices ? (
                        <div className="space-y-3">
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                            <Skeleton className="h-12 w-full" />
                        </div>
                    ) : invoices.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-center">
                            <FileText className="h-12 w-12 text-muted-foreground/50 mb-3" />
                            <p className="text-muted-foreground">
                                Não existem faturas para essa conta.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {invoices.map((invoice) => (
                                <div
                                    key={invoice.id}
                                    className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                            <Receipt className="h-5 w-5 text-green-600" />
                                        </div>
                                        <div>
                                            <p className="font-medium">
                                                {invoice.number || `Fatura ${invoice.id.slice(-8)}`}
                                            </p>
                                            <p className="text-sm text-muted-foreground">
                                                {new Date(invoice.created * 1000).toLocaleDateString('pt-BR', {
                                                    day: '2-digit',
                                                    month: 'long',
                                                    year: 'numeric'
                                                })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="text-right">
                                            <p className="font-semibold">
                                                {new Intl.NumberFormat('pt-BR', {
                                                    style: 'currency',
                                                    currency: invoice.currency.toUpperCase()
                                                }).format(invoice.amount)}
                                            </p>
                                            <p className="text-xs text-green-600 font-medium">
                                                Pago
                                            </p>
                                        </div>
                                        {invoice.invoice_pdf && (
                                            <a
                                                href={invoice.invoice_pdf}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-muted-foreground hover:text-foreground transition-colors"
                                                title="Baixar PDF"
                                            >
                                                <ExternalLink className="h-4 w-4" />
                                            </a>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Cancel Subscription / Delete Account Section */}
            {!user?.branch_id && (
                <Card className="border-red-100 bg-red-50/30">
                    <CardHeader>
                        <CardTitle className="text-red-600 flex items-center gap-2 text-xl">
                            <AlertTriangle className="h-5 w-5" />
                            Zona de Perigo
                        </CardTitle>
                        <CardDescription>
                            Caso você não deseje mais continuar com a sua assinatura e queira encerrar o uso da plataforma Churchfy,
                            você pode excluir sua conta permanentemente.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="text-sm text-muted-foreground max-w-xl">
                                <p>
                                    Ao clicar no botão ao lado, você iniciará o processo de exclusão total dos seus dados.
                                    <strong> Atenção:</strong> Esta ação é irreversível e apagará todos os registros da sua igreja.
                                </p>
                            </div>
                            <Button
                                variant="destructive"
                                onClick={() => setShowDeleteDialog(true)}
                                className="bg-red-600 hover:bg-red-700 whitespace-nowrap"
                            >
                                Cancelar minha assinatura
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            <DeleteAccountDialog
                open={showDeleteDialog}
                onOpenChange={setShowDeleteDialog}
            />
        </div>
    );
}
