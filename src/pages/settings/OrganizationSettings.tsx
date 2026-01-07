import { useState, useEffect } from "react";
import { SectionTabs } from "@/components/layout/SectionTabs";
import { useForm, useFieldArray, FormProvider } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useOrganization } from "@/hooks/useData";
import { supabase } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { SettingsPageSkeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Building2, Upload, Plus, Trash2, Sparkles } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";

const organizationSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    address: z.string().optional(),
    website: z.string().url("URL inválida").optional().or(z.literal("")),
    logo_url: z.string().optional(),
    church_metadata: z.object({
        pastors: z.array(z.object({
            name: z.string().min(1, "Nome é obrigatório"),
            role: z.string().min(1, "Cargo é obrigatório")
        })).optional(),
        groups: z.array(z.object({
            name: z.string().min(1, "Nome é obrigatório"),
            description: z.string().optional(),
            meeting_time: z.string().optional()
        })).optional(),
        services: z.array(z.object({
            name: z.string().min(1, "Nome é obrigatório"),
            day_time: z.string().min(1, "Dia e horário são obrigatórios"),
            description: z.string().optional()
        })).optional(),
        additional_info: z.string().optional()
    }).optional()
});

type OrganizationForm = z.infer<typeof organizationSchema>;

export function OrganizationSettings() {
    const { user } = useAuth();
    const [uploading, setUploading] = useState(false);

    const { data: organization, isLoading, updateOrganization } = useOrganization();

    const form = useForm<OrganizationForm>({
        resolver: zodResolver(organizationSchema),
        defaultValues: {
            name: "",
            address: "",
            website: "",
            logo_url: "",
            church_metadata: {
                pastors: [],
                groups: [],
                services: [],
                additional_info: ""
            }
        },
    });

    useEffect(() => {
        if (organization) {
            form.reset({
                name: organization.name || "",
                address: organization.address || "",
                website: organization.website || "",
                logo_url: organization.logo_url || "",
                church_metadata: {
                    pastors: organization.church_metadata?.pastors || [],
                    groups: organization.church_metadata?.groups || [],
                    services: organization.church_metadata?.services || [],
                    additional_info: organization.church_metadata?.additional_info || ""
                }
            });
        }
    }, [organization, form]);

    const { fields: pastorFields, append: appendPastor, remove: removePastor } = useFieldArray({
        control: form.control,
        name: "church_metadata.pastors"
    });

    const { fields: groupFields, append: appendGroup, remove: removeGroup } = useFieldArray({
        control: form.control,
        name: "church_metadata.groups"
    });

    const { fields: serviceFields, append: appendService, remove: removeService } = useFieldArray({
        control: form.control,
        name: "church_metadata.services"
    });

    const onSubmit = async (data: OrganizationForm) => {
        try {
            await updateOrganization.mutateAsync(data);
            toast.success("Informações da igreja atualizadas com sucesso!");
        } catch (error) {
            console.error("Error updating organization:", error);
            toast.error("Erro ao atualizar informações");
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

    if (isLoading) {
        return <SettingsPageSkeleton />;
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-300 pb-12">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground mb-4">Minha Igreja</h1>
                    <SectionTabs
                        items={[
                            { label: "Geral", href: "/configuracoes" },
                            { label: "Filiais", href: "/filiais" },
                        ]}
                    />
                    <p className="text-muted-foreground">
                        Gerencie as informações da sua organização de forma centralizada.
                    </p>
                </div>

                {/* Inline AI Tip */}
                <div className="group inline-flex items-center gap-2.5 rounded-full border border-border/40 bg-muted/30 px-3.5 py-2 transition-colors duration-300 hover:border-border/60 hover:bg-muted/50">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                        <Sparkles className="h-3 w-3" strokeWidth={2} />
                    </div>
                    <p className="text-[13px] text-muted-foreground">
                        <span className="font-medium text-foreground/80">IA ativa</span> — estas informações são usadas para responder seus visitantes automaticamente.
                    </p>
                </div>
            </div>

            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 mb-8">
                            <TabsTrigger value="general">Geral</TabsTrigger>
                            <TabsTrigger value="leadership">Liderança</TabsTrigger>
                            <TabsTrigger value="services">Programação</TabsTrigger>
                            <TabsTrigger value="groups">Ministérios</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Identidade Visual & Contato</CardTitle>
                                    <CardDescription>
                                        Informações básicas de identificação da igreja.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-6">
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
                                        <div>
                                            <h3 className="font-medium">Logo da Igreja</h3>
                                            <p className="text-sm text-muted-foreground mb-2">
                                                Recomendado: 512x512px, PNG ou JPG.
                                            </p>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={uploading}
                                                onClick={() => document.querySelector<HTMLInputElement>('input[type="file"]')?.click()}
                                            >
                                                <Upload className="mr-2 h-4 w-4" />
                                                Alterar Logo
                                            </Button>
                                        </div>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2">
                                        <div className="space-y-2 md:col-span-2">
                                            <Label>Username (URL)</Label>
                                            <div className="flex items-center gap-2">
                                                <span className="text-muted-foreground text-sm">churchfy.com/</span>
                                                <Input
                                                    value={organization?.username || ""}
                                                    disabled
                                                    className="bg-muted text-muted-foreground"
                                                />
                                            </div>
                                        </div>

                                        <FormField
                                            control={form.control}
                                            name="name"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Nome da Igreja</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="Igreja Batista Central" {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <FormField
                                            control={form.control}
                                            name="website"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel>Site</FormLabel>
                                                    <FormControl>
                                                        <Input placeholder="https://..." {...field} />
                                                    </FormControl>
                                                    <FormMessage />
                                                </FormItem>
                                            )}
                                        />

                                        <div className="md:col-span-2">
                                            <FormField
                                                control={form.control}
                                                name="address"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Endereço Completo</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Rua, Número, Bairro, Cidade - UF" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="md:col-span-2">
                                            <FormField
                                                control={form.control}
                                                name="church_metadata.additional_info"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Outras Informações Relevantes</FormLabel>
                                                        <FormControl>
                                                            <Textarea
                                                                placeholder="Use este espaço para descrever a missão da igreja, história resumida ou qualquer informação que gostaria que a IA soubesse sobre sua comunidade."
                                                                className="min-h-[100px]"
                                                                {...field}
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="leadership">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Corpo Pastoral e Liderança</CardTitle>
                                    <CardDescription>
                                        Cadastre os pastores e líderes principais. A IA usará esses nomes para saber quem é quem na igreja.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {pastorFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg bg-muted/10">
                                            <div className="grid gap-4 md:grid-cols-2 flex-1">
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.pastors.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Nome Completo</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Pr. João Silva" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.pastors.${index}.role`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Cargo / Título</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Pastor Presidente" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => removePastor(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-dashed"
                                        onClick={() => appendPastor({ name: "", role: "" })}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Líder
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="services">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Programação de Cultos</CardTitle>
                                    <CardDescription>
                                        Informe os horários fixos de cultos. A IA informará estes horários quando perguntada.
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {serviceFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg bg-muted/10">
                                            <div className="grid gap-4 md:grid-cols-3 flex-1">
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.services.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Nome do Culto</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Culto de Celebração" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.services.${index}.day_time`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Dia e Horário</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Domingo às 18h" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.services.${index}.description`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Detalhes (Pregador/Cantor)</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Crianças são bem-vindas" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => removeService(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-dashed"
                                        onClick={() => appendService({ name: "", day_time: "", description: "" })}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Culto
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="groups">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Grupos e Ministérios</CardTitle>
                                    <CardDescription>
                                        Cadastre os grupos da igreja (Jovens, Mulheres, Células, etc).
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {groupFields.map((field, index) => (
                                        <div key={field.id} className="flex gap-4 items-start p-4 border rounded-lg bg-muted/10">
                                            <div className="grid gap-4 md:grid-cols-3 flex-1">
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.groups.${index}.name`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Nome do Grupo</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Rede de Jovens" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.groups.${index}.meeting_time`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Encontros (Quando?)</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Sábados às 20h" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                                <FormField
                                                    control={form.control}
                                                    name={`church_metadata.groups.${index}.description`}
                                                    render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel>Descrição</FormLabel>
                                                            <FormControl>
                                                                <Input placeholder="Ex: Para jovens de 18 a 30 anos" {...field} />
                                                            </FormControl>
                                                            <FormMessage />
                                                        </FormItem>
                                                    )}
                                                />
                                            </div>
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="icon"
                                                className="mt-8 text-destructive hover:bg-destructive/10"
                                                onClick={() => removeGroup(index)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="w-full border-dashed"
                                        onClick={() => appendGroup({ name: "", description: "", meeting_time: "" })}
                                    >
                                        <Plus className="mr-2 h-4 w-4" />
                                        Adicionar Grupo
                                    </Button>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end sticky bottom-6 bg-background/80 backdrop-blur-sm p-4 border-t z-10 rounded-lg shadow-sm">
                        <Button
                            type="submit"
                            disabled={updateOrganization.isPending}
                            className="min-w-[160px]"
                            size="lg"
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
            </FormProvider>
        </div>
    );
}
