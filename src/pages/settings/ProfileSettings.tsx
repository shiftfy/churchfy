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
import { toast } from "sonner";
import { User, Camera } from "lucide-react";

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
        </div>
    );
}
