import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOrganization } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { SettingsPageSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, Upload } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useEffect } from "react";

const organizationSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    address: z.string().optional(),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
    logo_url: z.string().optional(),
});

type OrganizationForm = z.infer<typeof organizationSchema>;

export function OrganizationSettings() {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);

    // React Query hook - dados são cacheados
    const { data: organization, isLoading, updateOrganization } = useOrganization();

    const form = useForm<OrganizationForm>({
        resolver: zodResolver(organizationSchema),
        defaultValues: {
            name: "",
            address: "",
            website: "",
            logo_url: "",
        },
    });

    // Atualizar form quando os dados chegarem
    useEffect(() => {
        if (organization) {
            form.reset({
                name: organization.name || "",
                address: organization.address || "",
                website: organization.website || "",
                logo_url: organization.logo_url || "",
            });
        }
    }, [organization, form]);

    const onSubmit = async (data: OrganizationForm) => {
        try {
            await updateOrganization.mutateAsync(data);
            toast.success("Organização atualizada com sucesso!");
        } catch (error) {
            console.error("Error updating organization:", error);
            toast.error("Erro ao atualizar organização");
        }
    };

    const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
        if (!user?.organization_id) return;
        try {
            setUploading(true);
            const file = event.target.files?.[0];
            if (!file) return;

            const fileExt = file.name.split('.').pop();
            const fileName = `${user?.organization_id}-${Math.random()}.${fileExt}`;
            const filePath = `organization-logos/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            const { data: { publicUrl } } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            // Auto-save to database usando mutation
            await updateOrganization.mutateAsync({ logo_url: publicUrl });

            form.setValue("logo_url", publicUrl);
            toast.success("Logo atualizada com sucesso!");
        } catch (error) {
            console.error("Error uploading logo:", error);
            toast.error(`Erro ao fazer upload da logo: ${(error as Error).message}`);
        } finally {
            setUploading(false);
        }
    };

    // Mostrar skeleton enquanto carrega
    if (isLoading) {
        return <SettingsPageSkeleton />;
    }

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Minha Igreja</h1>
                <p className="text-muted-foreground">
                    Gerencie as informações da sua organização.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Dados da Organização</CardTitle>
                    <CardDescription>
                        Informações visíveis para os membros e visitantes.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                        {/* Logo Upload */}
                        <div className="flex items-center gap-6">
                            <div className="relative h-24 w-24 rounded-lg border-2 border-dashed border-muted-foreground/25 flex items-center justify-center bg-muted/50 overflow-hidden group hover:border-primary/50 transition-colors">
                                {form.watch("logo_url") ? (
                                    <img
                                        src={form.watch("logo_url")}
                                        alt="Logo"
                                        className="h-full w-full object-cover"
                                    />
                                ) : (
                                    <Building2 className="h-8 w-8 text-muted-foreground" />
                                )}
                                <input
                                    type="file"
                                    accept="image/*"
                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                    onChange={handleLogoUpload}
                                    disabled={uploading}
                                />
                                {uploading && (
                                    <div className="absolute inset-0 bg-background/80 flex items-center justify-center">
                                        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                    </div>
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="font-medium">Logo da Igreja</h3>
                                <p className="text-sm text-muted-foreground">
                                    Recomendado: 512x512px, PNG ou JPG.
                                </p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="mt-2"
                                    disabled={uploading}
                                    onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                >
                                    <Upload className="mr-2 h-4 w-4" />
                                    {uploading ? "Enviando..." : "Alterar Logo"}
                                </Button>
                            </div>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="username">Username da Organização</Label>
                                <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">churchfy.com/</span>
                                    <Input
                                        id="username"
                                        value={organization?.username || ""}
                                        disabled
                                        className="bg-muted text-muted-foreground"
                                    />
                                </div>
                                <p className="text-xs text-muted-foreground">
                                    Este username é usado nas URLs dos formulários e não pode ser alterado para proteger links e QR Codes já distribuídos.
                                </p>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="name">Nome da Igreja</Label>
                                <Input
                                    id="name"
                                    placeholder="Ex: Igreja Batista Central"
                                    {...form.register("name")}
                                />
                                {form.formState.errors.name && (
                                    <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="website">Site</Label>
                                <Input
                                    id="website"
                                    placeholder="https://suaigreja.com.br"
                                    {...form.register("website")}
                                />
                                {form.formState.errors.website && (
                                    <p className="text-sm text-destructive">{form.formState.errors.website.message}</p>
                                )}
                            </div>

                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="address">Endereço</Label>
                                <Input
                                    id="address"
                                    placeholder="Rua, Número, Bairro, Cidade - UF"
                                    {...form.register("address")}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={updateOrganization.isPending}
                                className="min-w-[160px]"
                            >
                                {updateOrganization.isPending ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                                        Salvando...
                                    </>
                                ) : (
                                    "Salvar Alterações"
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}
