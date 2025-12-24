import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase, type Branch, type Journey } from "@/lib/supabase";
import type { FormField, FormFieldType } from "@/types/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
    SelectGroup,
    SelectLabel,
} from "@/components/ui/select";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { Trash2, Plus, ArrowLeft, Save, Eye, ChevronDown, ChevronUp, GripVertical, Lock } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface FormSettings {
    background_color: string;
    button_color: string;
    text_color: string;
    button_text_color: string;
    finalization_title?: string;
    finalization_message?: string;
    finalization_action?: 'none' | 'redirect_auto' | 'redirect_button';
    finalization_redirect_url?: string;
    finalization_button_text?: string;
    show_church_name?: boolean;
    show_progress_bar?: boolean;
}

const defaultSettings: FormSettings = {
    background_color: "#ffffff",
    button_color: "#000000",
    text_color: "#000000",
    button_text_color: "#ffffff",
    finalization_title: "Obrigado!",
    finalization_message: "Suas informações foram enviadas com sucesso.",
    finalization_action: "none",
    show_church_name: true,
    show_progress_bar: true
};

const formSchema = z.object({
    title: z.string().min(3, "Título deve ter no mínimo 3 caracteres"),
    description: z.string().optional(),
    slug: z
        .string()
        .min(3, "Slug deve ter no mínimo 3 caracteres")
        .regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
    is_active: z.boolean(),
    branch_id: z.string().optional(),
    journey_id: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

// Helper to determine text color based on background
function getContrastColor(hexColor: string) {
    // Remove hash if present
    const hex = hexColor.replace('#', '');

    // Convert to RGB
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);

    // Calculate brightness (YIQ formula)
    const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;

    return yiq >= 128 ? '#000000' : '#ffffff';
}

function FormPreview({ fields, title, description, settings }: { fields: FormField[], title: string, description?: string, settings?: FormSettings }) {
    const [currentStep, setCurrentStep] = useState(0);

    // Reset step if fields change drastically (optional but good for UX)
    useEffect(() => {
        if (currentStep >= fields.length && fields.length > 0) {
            setCurrentStep(fields.length - 1);
        }
    }, [fields.length]);

    const bg = settings?.background_color || "#000000";
    const textColor = settings?.text_color || "#ffffff";
    const btnColor = settings?.button_color || "#06b6d4";
    const btnTextColor = settings?.button_text_color || "#ffffff";

    // Helper for hex to rgba (duplicated for preview)
    const hexToRgba = (hex: string, alpha: number) => {
        let c: any;
        if (/^#([A-Fa-f0-9]{3}){1,2}$/.test(hex)) {
            c = hex.substring(1).split('');
            if (c.length == 3) {
                c = [c[0], c[0], c[1], c[1], c[2], c[2]];
            }
            c = '0x' + c.join('');
            return 'rgba(' + [(c >> 16) & 255, (c >> 8) & 255, c & 255].join(',') + ',' + alpha + ')';
        }
        return hex;
    };

    const textColorWithOpacity = (opacity: number) => hexToRgba(textColor, opacity);
    const borderColor = textColorWithOpacity(0.2);

    const handleNext = () => {
        if (currentStep < fields.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            // Cycle back to start or show success preview?
            // For preview, maybe just cycle or stay. Let's cycle to 0 after delay? or just stop.
            // Let's stop to match real form behavior (submit).
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    return (
        <Card className="sticky top-6 border-2 border-muted overflow-hidden">
            <CardHeader className="bg-muted/50 border-b py-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2 text-muted-foreground">
                        <Eye className="w-4 h-4" />
                        Visualização em Tempo Real (Multi-step)
                    </CardTitle>
                    <div className="flex gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80" />
                        <div className="w-2.5 h-2.5 rounded-full bg-green-400/80" />
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 bg-slate-100 dark:bg-slate-900 flex justify-center items-start min-h-[700px]">
                {/* Phone Frame */}
                <div className="relative w-[320px] h-[640px] bg-gray-900 rounded-[3rem] shadow-[0_0_50px_-12px_rgba(0,0,0,0.25)] ring-1 ring-white/10 p-3">
                    {/* Power Button */}
                    <div className="absolute right-[-2px] top-24 w-[3px] h-12 bg-gray-800 rounded-r-md" />
                    {/* Volume Buttons */}
                    <div className="absolute left-[-2px] top-24 w-[3px] h-8 bg-gray-800 rounded-l-md" />
                    <div className="absolute left-[-2px] top-36 w-[3px] h-8 bg-gray-800 rounded-l-md" />

                    {/* Screen */}
                    <div
                        className="relative w-full h-full rounded-[2.25rem] overflow-hidden flex flex-col transition-colors duration-300 font-sans"
                        style={{ backgroundColor: bg, color: textColor }}
                    >
                        {/* Status Bar Simulation */}
                        <div className="h-12 w-full flex items-center justify-between px-6 select-none z-10 shrink-0" style={{ backgroundColor: bg }}>
                            <span className="text-[10px] font-semibold opacity-90">9:41</span>
                            <div className="flex items-center gap-1.5">
                                <div className="w-4 h-2.5 rounded-[2px]" style={{ backgroundColor: textColor }} />
                                <div className="w-0.5 h-1" style={{ backgroundColor: textColor }} />
                            </div>
                        </div>

                        {/* Notch */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-7 w-32 bg-gray-900 rounded-b-2xl z-20" />

                        {/* Content Scrollable Area */}
                        <div className="flex-1 overflow-y-auto p-5 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:'none'] [scrollbar-width:'none'] flex flex-col justify-center">

                            {/* Title - Only on Step 0 */}
                            {currentStep === 0 && (
                                <div className="mb-8 text-left space-y-2 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    <span className="text-[10px] uppercase tracking-wider opacity-40 block">Churchfy</span>
                                    <h2
                                        className="text-2xl font-bold tracking-tight leading-tight"
                                        style={{ color: btnColor }}
                                    >
                                        {title || "Título do Formulário"}
                                    </h2>
                                    {description && (
                                        <p className="text-sm leading-relaxed opacity-70 font-light">
                                            {description}
                                        </p>
                                    )}
                                </div>
                            )}

                            {/* Fields */}
                            <div className="space-y-6 w-full relative min-h-[200px]">
                                {fields.length > 0 ? fields.map((field, index) => {
                                    if (index !== currentStep) return null;

                                    return (
                                        <div key={field.id} className="w-full space-y-4 animate-in fade-in slide-in-from-bottom-8 duration-500">
                                            <Label
                                                className="text-lg font-medium block transition-colors"
                                                style={{ color: textColor }}
                                            >
                                                {field.label} {field.required && <span style={{ color: btnColor }}>*</span>}
                                            </Label>

                                            {field.type === 'textarea' || field.type === 'address' || field.type === 'prayer_request' ? (
                                                <div
                                                    className="h-20 w-full bg-transparent border-0 border-b-2 text-sm p-0 py-2 resize-none"
                                                    style={{
                                                        borderColor: borderColor,
                                                        color: textColor
                                                    }}
                                                >
                                                    {field.placeholder || "Digite sua resposta..."}
                                                </div>
                                            ) : field.type === 'select' ? (
                                                <div
                                                    className="h-10 w-full bg-transparent border-b-2 text-sm flex items-center justify-between"
                                                    style={{
                                                        borderColor: borderColor,
                                                        color: textColor
                                                    }}
                                                >
                                                    <span className="opacity-50">Selecione...</span>
                                                    <span className="text-[10px] opacity-40">▼</span>
                                                </div>
                                            ) : field.type === 'checkbox' ? (
                                                <div className="flex items-center space-x-2 p-1">
                                                    <div
                                                        className="h-4 w-4 rounded border flex items-center justify-center"
                                                        style={{ borderColor: btnColor, backgroundColor: hexToRgba(btnColor, 0.1) }}
                                                    />
                                                    <span className="text-xs opacity-80">Opção de seleção</span>
                                                </div>
                                            ) : (
                                                <div
                                                    className="h-10 w-full bg-transparent border-0 border-b-2 text-sm flex items-center"
                                                    style={{
                                                        borderColor: borderColor,
                                                        color: textColor
                                                    }}
                                                >
                                                    {field.placeholder || (field.type === 'phone' ? "(00) 00000-0000" : "Digite aqui...")}
                                                </div>
                                            )}
                                        </div>
                                    );
                                }) : (
                                    <div className="text-center opacity-40 text-sm py-10">
                                        Adicione campos para visualizar
                                    </div>
                                )}
                            </div>

                            {/* Buttons */}
                            {fields.length > 0 && (
                                <div className="pt-8 flex items-center gap-2 mt-auto">
                                    {currentStep > 0 && (
                                        <Button
                                            variant="ghost"
                                            onClick={handleBack}
                                            className="h-10 px-3 rounded-lg opacity-60 hover:bg-white/5"
                                            style={{ color: textColor }}
                                        >
                                            Voltar
                                        </Button>
                                    )}
                                    <Button
                                        onClick={handleNext}
                                        className="h-10 text-sm font-medium rounded-lg transition-all shadow-lg flex-1"
                                        style={{
                                            backgroundColor: btnColor,
                                            color: btnTextColor,
                                            boxShadow: `0 0 15px ${hexToRgba(btnColor, 0.3)}`
                                        }}
                                    >
                                        {currentStep === fields.length - 1 ? "Finalizar" : "Próximo"}
                                    </Button>
                                </div>
                            )}
                        </div>

                        {/* Footer / Progress Bar */}
                        <div className="p-5 pb-8 pt-0 z-10 shrink-0 select-none">
                            <div className="flex gap-1 w-full mb-2">
                                {fields.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className="h-0.5 flex-1 rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: idx <= currentStep
                                                ? btnColor
                                                : hexToRgba(textColor, 0.1)
                                        }}
                                    />
                                ))}
                            </div>
                        </div>

                        {/* Home Indicator */}
                        <div className="h-5 w-full flex items-end justify-center pb-2 shrink-0" style={{ backgroundColor: bg }}>
                            <div
                                className="w-32 h-1 rounded-full"
                                style={{ backgroundColor: textColor === '#ffffff' ? 'rgba(255,255,255,0.2)' : '#e5e7eb' }}
                            />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// Sortable Field Item Component
function SortableFieldItem({
    field,
    isCollapsed,
    onToggleCollapse,
    onRemove,
    onUpdate
}: {
    field: FormField,
    isCollapsed: boolean,
    onToggleCollapse: () => void,
    onRemove: () => void,
    onUpdate: (id: string, updates: Partial<FormField>) => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: field.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 1 : 0,
    };

    return (
        <div ref={setNodeRef} style={style} className="group relative">
            <div className={`border rounded-lg bg-card transition-all ${isDragging ? "shadow-lg ring-2 ring-primary/20" : "hover:border-primary/50"}`}>
                <div className="flex items-center gap-3 p-4">
                    <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground">
                        <GripVertical className="w-5 h-5" />
                    </div>

                    <div className="flex-1 font-medium text-sm">
                        {field.label}
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                            {field.type}
                        </div>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onToggleCollapse}
                            className="h-8 w-8"
                        >
                            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                        </Button>
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={onRemove}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                            <Trash2 className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {!isCollapsed && (
                    <div className="p-4 pt-0 border-t bg-muted/10 space-y-4 animate-in slide-in-from-top-2 duration-200">
                        <div className="grid gap-4 md:grid-cols-2 pt-4">
                            <div className="space-y-2">
                                <Label>Rótulo (Label)</Label>
                                <Input
                                    value={field.label}
                                    onChange={(e) => onUpdate(field.id, { label: e.target.value })}
                                    placeholder="Nome do campo"
                                />
                            </div>

                            <div className="space-y-2">
                                <Label>Tipo</Label>
                                <Select
                                    value={field.type}
                                    onValueChange={(value: FormFieldType) =>
                                        onUpdate(field.id, { type: value })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectGroup>
                                            <SelectLabel>Padrão</SelectLabel>
                                            <SelectItem value="email">Email</SelectItem>
                                            <SelectItem value="phone">Telefone/WhatsApp</SelectItem>
                                            <SelectItem value="address">Endereço</SelectItem>
                                            <SelectItem value="prayer_request">Pedido de Oração</SelectItem>
                                            <SelectItem value="date">Data (Nascimento)</SelectItem>
                                        </SelectGroup>
                                        <SelectGroup>
                                            <SelectLabel>Personalizados</SelectLabel>
                                            <SelectItem value="text">Texto Curto</SelectItem>
                                            <SelectItem value="textarea">Texto Longo</SelectItem>
                                            <SelectItem value="date">Data</SelectItem>
                                            <SelectItem value="select">Seleção (Lista)</SelectItem>
                                            <SelectItem value="checkbox">Caixa de Seleção</SelectItem>
                                        </SelectGroup>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label>Placeholder</Label>
                                <Input
                                    value={field.placeholder || ""}
                                    onChange={(e) =>
                                        onUpdate(field.id, { placeholder: e.target.value })
                                    }
                                    placeholder="Texto de exemplo"
                                />
                            </div>

                            <div className="flex items-center gap-6 pt-8">
                                <div className="flex items-center space-x-2">
                                    <Switch
                                        checked={field.required}
                                        onCheckedChange={(checked) =>
                                            onUpdate(field.id, { required: checked })
                                        }
                                    />
                                    <Label>Obrigatório</Label>
                                </div>
                            </div>

                            {field.type === "select" && (
                                <div className="col-span-2 space-y-2">
                                    <Label>Opções (separadas por vírgula)</Label>
                                    <Input
                                        value={field.options?.join(", ") || ""}
                                        onChange={(e) =>
                                            onUpdate(field.id, {
                                                options: e.target.value.split(",").map((s) => s.trim()),
                                            })
                                        }
                                        placeholder="Opção 1, Opção 2, Opção 3"
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function FormBuilder() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [fields, setFields] = useState<FormField[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [journeys, setJourneys] = useState<Journey[]>([]);
    const [collapsedFields, setCollapsedFields] = useState<Set<string>>(new Set());
    const [orgUsername, setOrgUsername] = useState("");
    const [settings, setSettings] = useState<FormSettings>(defaultSettings);
    const { planId } = useSubscription();

    const isOnePlan = planId === 'one';

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    // Update text colors when background/button colors change
    useEffect(() => {
        setSettings(prev => ({
            ...prev,
            text_color: getContrastColor(prev.background_color),
            button_text_color: getContrastColor(prev.button_color)
        }));
    }, [settings.background_color, settings.button_color]);

    const {
        register,
        handleSubmit,
        setValue,
        watch,
        formState: { errors },
    } = useForm<FormData>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            is_active: true,
        },
    });

    const selectedBranchId = watch("branch_id");
    const title = watch("title");
    const description = watch("description");

    useEffect(() => {
        if (user?.organization_id) {
            fetchBranches();
            fetchJourneys();
            fetchOrganization();
        }
    }, [user]);

    useEffect(() => {
        if (id) {
            fetchForm(id);
        } else {
            // Default fields for new form
            setFields([
                {
                    id: "field_name",
                    type: "text",
                    label: "Nome Completo",
                    placeholder: "Seu nome",
                    required: true,
                    width: "full",
                    isLocked: true,
                },
                {
                    id: "field_whatsapp",
                    type: "phone",
                    label: "WhatsApp",
                    placeholder: "(00) 00000-0000",
                    required: true,
                    width: "full",
                    isLocked: true,
                },
            ]);
        }
    }, [id]);

    const fetchBranches = async () => {
        try {
            const { data, error } = await supabase
                .from("branches")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .eq("is_active", true);

            if (error) throw error;
            setBranches(data || []);
        } catch (error) {
            console.error("Error fetching branches:", error);
        }
    };

    const fetchJourneys = async () => {
        try {
            const { data, error } = await supabase
                .from("journeys")
                .select("*")
                .eq("organization_id", user?.organization_id)
                .order("created_at");

            if (error) throw error;
            setJourneys(data || []);
        } catch (error) {
            console.error("Error fetching journeys:", error);
        }
    };

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

    const fetchForm = async (formId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from("forms")
                .select("*")
                .eq("id", formId)
                .single();

            if (error) throw error;

            setValue("title", data.title);
            setValue("description", data.description || "");
            setValue("slug", data.slug);
            setValue("is_active", data.is_active);
            setValue("branch_id", data.branch_id || undefined);
            setValue("journey_id", data.journey_id || undefined);
            setFields(data.fields as FormField[]);

            if (data.settings) {
                setSettings(data.settings as FormSettings);
            }
        } catch (error) {
            console.error("Error fetching form:", error);
            navigate("/formularios");
        } finally {
            setLoading(false);
        }
    };

    const generateSlug = (title: string) => {
        return title
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9\s-]/g, "")
            .trim()
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const title = e.target.value;
        if (!id && !selectedBranchId) {
            setValue("slug", generateSlug(title));
        }
    };

    useEffect(() => {
        if (selectedBranchId) {
            const branch = branches.find(b => b.id === selectedBranchId);
            if (branch) {
                setValue("slug", branch.slug);
            }
        }
    }, [selectedBranchId, branches, setValue]);

    const addField = (type: FormFieldType = "text", label: string = "Novo Campo", placeholder: string = "") => {
        const newId = crypto.randomUUID();
        setFields([
            ...fields,
            {
                id: newId,
                type,
                label,
                placeholder,
                required: false,
                width: "full",
            },
        ]);
        // Auto expand new field
        const newCollapsed = new Set(collapsedFields);
        newCollapsed.delete(newId);
        setCollapsedFields(newCollapsed);
    };

    const removeField = (fieldId: string) => {
        setFields(fields.filter((f) => f.id !== fieldId));
    };

    const updateField = (fieldId: string, updates: Partial<FormField>) => {
        setFields(fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)));
    };

    const toggleCollapse = (fieldId: string) => {
        const newCollapsed = new Set(collapsedFields);
        if (newCollapsed.has(fieldId)) {
            newCollapsed.delete(fieldId);
        } else {
            newCollapsed.add(fieldId);
        }
        setCollapsedFields(newCollapsed);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const onSubmit = async (data: FormData) => {
        setLoading(true);
        try {
            if (!user?.organization_id) throw new Error("Organization ID not found");

            const formData = {
                ...data,
                fields,
                settings,
                organization_id: user.organization_id,
                branch_id: data.branch_id || null,
                journey_id: data.journey_id || null,
            };

            if (id) {
                const { error } = await supabase
                    .from("forms")
                    .update(formData)
                    .eq("id", id);
                if (error) throw error;
                toast.success("Formulário atualizado com sucesso!");
            } else {
                const { error } = await supabase.from("forms").insert(formData);
                if (error) throw error;
                toast.success("Formulário criado com sucesso!");
            }
        } catch (error: any) {
            console.error("Error saving form:", error);
            if (error.code === "23505" || error.message?.includes("duplicate key")) {
                toast.error("Já existe um formulário com este URL (slug) ou vinculado a esta filial. Por favor, escolha outro slug ou edite o formulário existente.");
            } else {
                toast.error(error.message || "Erro ao salvar formulário");
            }
        } finally {
            setLoading(false);
        }
    };

    const fixedFields = fields.filter(f => f.isLocked);
    const customFields = fields.filter(f => !f.isLocked);

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-12 px-4 md:px-6">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/formularios")}>
                    <ArrowLeft className="w-5 h-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">
                        {id ? "Editar Formulário" : "Novo Formulário"}
                    </h1>
                    <p className="text-muted-foreground text-sm">
                        Configure os campos e aparência do seu formulário
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                    <Tabs defaultValue="general" className="w-full">
                        <TabsList className="grid w-full grid-cols-3 mb-4">
                            <TabsTrigger value="general">Geral</TabsTrigger>
                            <TabsTrigger value="style">Estilo</TabsTrigger>
                            <TabsTrigger value="finalization">Finalização</TabsTrigger>
                        </TabsList>

                        <TabsContent value="general" className="space-y-8">
                            {/* Configurações Gerais */}
                            <Card>
                                <CardHeader>
                                    <CardTitle>Configurações Gerais</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    {!isOnePlan && (
                                        <div className="space-y-2">
                                            <Label htmlFor="branch_id">Filial (Opcional)</Label>
                                            <Select
                                                value={watch("branch_id") || "none"}
                                                onValueChange={(value) => setValue("branch_id", value === "none" ? undefined : value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione uma filial..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sem filial vinculada</SelectItem>
                                                    {branches.map((branch) => (
                                                        <SelectItem key={branch.id} value={branch.id}>
                                                            {branch.name}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <p className="text-[10px] text-muted-foreground">
                                                Vincule este formulário a uma filial específica. Se selecionado, o URL do formulário será o URL da filial.
                                            </p>
                                        </div>
                                    )}
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="title">Título do Formulário *</Label>
                                            <Input
                                                id="title"
                                                {...register("title")}
                                                onChange={handleTitleChange}
                                                placeholder="Ex: Visitantes de Domingo"
                                            />
                                            {errors.title && (
                                                <p className="text-sm text-destructive">{errors.title.message}</p>
                                            )}
                                        </div>

                                        <div className="space-y-2">
                                            <Label htmlFor="slug">Slug *</Label>
                                            <Input
                                                id="slug"
                                                {...register("slug")}
                                                placeholder="visitantes-domingo"
                                                disabled={!!watch("branch_id") || !!id}
                                                className={id ? "bg-muted text-muted-foreground" : ""}
                                            />
                                            {errors.slug && (
                                                <p className="text-sm text-destructive">{errors.slug.message}</p>
                                            )}
                                            {orgUsername && watch("slug") && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    URL: app.churchfy.com/{orgUsername}/{watch("slug")}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <Label htmlFor="description">Descrição / Boas-vindas</Label>
                                        <Textarea
                                            id="description"
                                            {...register("description")}
                                            placeholder="Uma mensagem breve que aparecerá no topo do formulário"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label htmlFor="journey_id">Jornada (Opcional)</Label>
                                            <Select
                                                value={watch("journey_id") || "none"}
                                                onValueChange={(value) => setValue("journey_id", value === "none" ? undefined : value)}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Selecione uma jornada..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Sem jornada vinculada</SelectItem>
                                                    {journeys.map((journey) => (
                                                        <SelectItem key={journey.id} value={journey.id}>
                                                            {journey.title}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="space-y-2">
                                            <Label>Status do Formulário</Label>
                                            <div className="flex items-center space-x-2 h-10 border rounded-md px-3">
                                                <Switch
                                                    checked={watch("is_active")}
                                                    onCheckedChange={(checked) => setValue("is_active", checked)}
                                                />
                                                <Label>{watch("is_active") ? "Ativo" : "Inativo"}</Label>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Campos do Formulário */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <CardTitle>Campos do Formulário</CardTitle>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button type="button" variant="outline" size="sm">
                                                <Plus className="w-4 h-4 mr-2" />
                                                Adicionar Campo
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" className="w-56">
                                            <DropdownMenuLabel>Padrão</DropdownMenuLabel>
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem onClick={() => addField("date", "Data de Nascimento")}>
                                                    Data de Nascimento
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("phone", "Telefone/WhatsApp", "(00) 00000-0000")}>
                                                    Telefone/WhatsApp
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("email", "Email", "exemplo@email.com")}>
                                                    Email
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("address", "Endereço", "Rua, Número, Bairro...")}>
                                                    Endereço
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("prayer_request", "Pedido de Oração", "Descreva seu pedido...")}>
                                                    Pedido de Oração
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuLabel>Personalizados</DropdownMenuLabel>
                                            <DropdownMenuGroup>
                                                <DropdownMenuItem onClick={() => addField("text", "Texto Curto")}>
                                                    Texto Curto
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("textarea", "Texto Longo")}>
                                                    Texto Longo
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("date", "Data")}>
                                                    Data
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("select", "Seleção (Lista)")}>
                                                    Seleção (lista)
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => addField("checkbox", "Caixa de Seleção")}>
                                                    Caixa de seleção
                                                </DropdownMenuItem>
                                            </DropdownMenuGroup>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </CardHeader>
                                <CardContent className="space-y-4">

                                    {/* Fixed Fields Section */}
                                    {fixedFields.length > 0 && (
                                        <div className="space-y-3 mb-6">
                                            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 p-2 rounded">
                                                <Lock className="w-3 h-3" />
                                                <span>Campos Obrigatórios do Sistema (Fixos)</span>
                                            </div>
                                            {fixedFields.map(field => (
                                                <div key={field.id} className="border rounded-lg bg-muted/30 p-4 flex items-center gap-3 opacity-80">
                                                    <Lock className="w-4 h-4 text-muted-foreground" />
                                                    <div className="flex-1 font-medium text-sm">
                                                        {field.label}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                                        {field.type === 'phone' ? 'WhatsApp' : 'Texto'}
                                                    </div>
                                                    <div className="text-xs font-medium text-primary">
                                                        Obrigatório
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {/* Draggable Custom Fields */}
                                    <DndContext
                                        sensors={sensors}
                                        collisionDetection={closestCenter}
                                        onDragEnd={handleDragEnd}
                                    >
                                        <SortableContext
                                            items={customFields.map(f => f.id)}
                                            strategy={verticalListSortingStrategy}
                                        >
                                            <div className="space-y-3">
                                                {customFields.map((field) => (
                                                    <SortableFieldItem
                                                        key={field.id}
                                                        field={field}
                                                        isCollapsed={collapsedFields.has(field.id)}
                                                        onToggleCollapse={() => toggleCollapse(field.id)}
                                                        onRemove={() => removeField(field.id)}
                                                        onUpdate={updateField}
                                                    />
                                                ))}
                                            </div>
                                        </SortableContext>
                                    </DndContext>

                                    {customFields.length === 0 && (
                                        <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                                            <p>Nenhum campo personalizado adicionado.</p>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="link">
                                                        Clique para adicionar
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="center" className="w-56">
                                                    <DropdownMenuLabel>Padrão</DropdownMenuLabel>
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuItem onClick={() => addField("date", "Data de Nascimento")}>
                                                            Data de Nascimento
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("phone", "Telefone/WhatsApp", "(00) 00000-0000")}>
                                                            Telefone/WhatsApp
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("email", "Email", "exemplo@email.com")}>
                                                            Email
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("address", "Endereço", "Rua, Número, Bairro...")}>
                                                            Endereço
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("prayer_request", "Pedido de Oração", "Descreva seu pedido...")}>
                                                            Pedido de Oração
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                    <DropdownMenuSeparator />
                                                    <DropdownMenuLabel>Personalizados</DropdownMenuLabel>
                                                    <DropdownMenuGroup>
                                                        <DropdownMenuItem onClick={() => addField("text", "Texto Curto")}>
                                                            Texto Curto
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("textarea", "Texto Longo")}>
                                                            Texto Longo
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("date", "Data")}>
                                                            Data
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("select", "Seleção (Lista)")}>
                                                            Seleção (lista)
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => addField("checkbox", "Caixa de Seleção")}>
                                                            Caixa de seleção
                                                        </DropdownMenuItem>
                                                    </DropdownMenuGroup>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                    )}

                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="style" className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Personalização de Estilo</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-3">
                                            <Label>Cor de Fundo</Label>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-lg border shadow-sm"
                                                    style={{ backgroundColor: settings.background_color }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={settings.background_color}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, background_color: e.target.value }))}
                                                    className="w-full h-12 p-1 cursor-pointer"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                A cor do texto será ajustada automaticamente para garantir contraste.
                                            </p>
                                        </div>

                                        <div className="space-y-3">
                                            <Label>Cor do Botão</Label>
                                            <div className="flex items-center gap-3">
                                                <div
                                                    className="w-12 h-12 rounded-lg border shadow-sm"
                                                    style={{ backgroundColor: settings.button_color }}
                                                />
                                                <Input
                                                    type="color"
                                                    value={settings.button_color}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, button_color: e.target.value }))}
                                                    className="w-full h-12 p-1 cursor-pointer"
                                                />
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                A cor do texto do botão será ajustada automaticamente.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-6 border-t space-y-4">
                                        <Label className="text-base font-semibold text-foreground">Configurações de Exibição</Label>

                                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 transition-all hover:bg-muted/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Mostrar nome da igreja</Label>
                                                <p className="text-xs text-muted-foreground">Exibe o título da organização no topo do formulário</p>
                                            </div>
                                            <Switch
                                                checked={settings.show_church_name !== false}
                                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_church_name: checked }))}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between p-4 rounded-xl border bg-muted/30 transition-all hover:bg-muted/50">
                                            <div className="space-y-0.5">
                                                <Label className="text-sm font-medium">Mostrar barra de progresso</Label>
                                                <p className="text-xs text-muted-foreground">Exibe o progresso do preenchimento no rodapé</p>
                                            </div>
                                            <Switch
                                                checked={settings.show_progress_bar !== false}
                                                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, show_progress_bar: checked }))}
                                            />
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        <TabsContent value="finalization" className="space-y-8">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Configuração de Finalização</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <Label>Título de Finalização</Label>
                                            <Input
                                                value={settings.finalization_title || ""}
                                                onChange={(e) => setSettings(prev => ({ ...prev, finalization_title: e.target.value }))}
                                                placeholder="Ex: Obrigado!"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Mensagem de Finalização</Label>
                                            <Textarea
                                                value={settings.finalization_message || ""}
                                                onChange={(e) => setSettings(prev => ({ ...prev, finalization_message: e.target.value }))}
                                                placeholder="Ex: Suas informações foram enviadas com sucesso."
                                            />
                                        </div>

                                        <div className="space-y-3 pt-4 border-t">
                                            <Label>Ação Pós-envio</Label>
                                            <Select
                                                value={settings.finalization_action || "none"}
                                                onValueChange={(value: any) => setSettings(prev => ({ ...prev, finalization_action: value }))}
                                            >
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="none">Manter usuário na tela de agradecimento</SelectItem>
                                                    <SelectItem value="redirect_auto">Redirecionar automaticamente (5s)</SelectItem>
                                                    <SelectItem value="redirect_button">Exibir botão de redirecionamento</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        {settings.finalization_action === 'redirect_auto' && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                                <Label>URL de Redirecionamento</Label>
                                                <Input
                                                    value={settings.finalization_redirect_url || ""}
                                                    onChange={(e) => setSettings(prev => ({ ...prev, finalization_redirect_url: e.target.value }))}
                                                    placeholder="https://sua-igreja.com"
                                                />
                                            </div>
                                        )}

                                        {settings.finalization_action === 'redirect_button' && (
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                                <div className="space-y-2">
                                                    <Label>Texto do Botão</Label>
                                                    <Input
                                                        value={settings.finalization_button_text || ""}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, finalization_button_text: e.target.value }))}
                                                        placeholder="Voltar para o site"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>URL de Redirecionamento</Label>
                                                    <Input
                                                        value={settings.finalization_redirect_url || ""}
                                                        onChange={(e) => setSettings(prev => ({ ...prev, finalization_redirect_url: e.target.value }))}
                                                        placeholder="https://sua-igreja.com"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>
                    </Tabs>

                    <div className="flex justify-end gap-4">
                        <Button type="button" variant="outline" onClick={() => navigate("/formularios")}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            <Save className="w-4 h-4 mr-2" />
                            {loading ? "Salvando..." : "Salvar Formulário"}
                        </Button>
                    </div>
                </form>

                {/* Preview Column */}
                <div className="hidden lg:block">
                    <FormPreview fields={fields} title={title} description={description} settings={settings} />
                </div>
            </div >
        </div >
    );
}
