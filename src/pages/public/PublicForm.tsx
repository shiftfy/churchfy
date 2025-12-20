import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import type { Form } from "@/types/form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, Loader2 } from "lucide-react";

export function PublicForm() {
    const { username, slug } = useParams();
    const [form, setForm] = useState<Form | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [error, setError] = useState<string | null>(null);

    // Multi-step State
    const [currentStep, setCurrentStep] = useState(0);
    const [isFocused, setIsFocused] = useState(false);
    const [redirectCountdown, setRedirectCountdown] = useState(5);

    useEffect(() => {
        if (username && slug) {
            fetchForm();
        }
    }, [username, slug]);

    // Dynamic Colors Helper & Handlers
    const settings = form?.settings || {
        background_color: "#ffffff",
        button_color: "#000000",
        text_color: "#000000",
        button_text_color: "#ffffff"
    };

    useEffect(() => {
        if (submitted && settings.finalization_action === 'redirect_auto' && settings.finalization_redirect_url) {
            const timer = setInterval(() => {
                setRedirectCountdown((prev) => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        window.location.href = settings.finalization_redirect_url!;
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
            return () => clearInterval(timer);
        }
    }, [submitted, settings]);

    const fetchForm = async () => {
        setLoading(true);
        console.log("PublicForm: Fetching form...", { username, slug });
        try {
            const { data, error } = await supabase
                .from("forms")
                .select("*, organizations!inner(username, name, logo_url)")
                .eq("slug", slug)
                .eq("organizations.username", username)
                .eq("is_active", true)
                .single();

            if (error) {
                console.error("PublicForm: Database error", error);
                throw error;
            }

            console.log("PublicForm: Form fetched successfully", data);
            setForm(data as Form);
        } catch (error) {
            console.error("Error fetching form:", error);
            setError("Formulário não encontrado ou inativo.");
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (fieldId: string, value: any) => {
        setFormData((prev) => ({
            ...prev,
            [fieldId]: value,
        }));
    };

    const handleSubmit = async (e?: React.FormEvent) => {
        if (e && e.preventDefault) e.preventDefault();
        if (!form) return;

        setSubmitting(true);
        try {
            const { error: submissionError } = await supabase.from("visitor_responses").insert({
                form_id: form.id,
                organization_id: form.organization_id,
                responses: formData,
                user_agent: navigator.userAgent,
            });

            if (submissionError) throw submissionError;

            setSubmitted(true);
        } catch (error: any) {
            console.error("Error submitting form:", error);
            alert("Erro ao enviar formulário. Tente novamente.");
        } finally {
            setSubmitting(false);
        }
    };

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

    const textColorWithOpacity = (opacity: number) => hexToRgba(settings.text_color, opacity);
    const borderColor = textColorWithOpacity(0.2);

    // Navigation Handlers
    const handleNext = (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!form) return;

        const currentField = form.fields[currentStep];

        if (currentField.required && !formData[currentField.id]) {
            alert("Por favor, preencha este campo.");
            return;
        }

        if (currentStep < form.fields.length - 1) {
            setCurrentStep(prev => prev + 1);
        } else {
            handleSubmit(e as any);
        }
    };

    const handleBack = () => {
        if (currentStep > 0) {
            setCurrentStep(prev => prev - 1);
        }
    };

    const totalSteps = form?.fields.length || 0;

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 animate-pulse">
                <div className="w-full max-w-2xl space-y-8">
                    <div className="space-y-4 text-center">
                        <div className="h-4 w-24 bg-gray-200 mx-auto rounded-full" />
                        <div className="h-12 w-3/4 bg-gray-200 mx-auto rounded-lg" />
                        <div className="h-6 w-1/2 bg-gray-200 mx-auto rounded-lg" />
                    </div>
                    <div className="space-y-12 pt-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="space-y-4">
                                <div className="h-6 w-48 bg-gray-200 rounded" />
                                <div className="h-12 w-full bg-gray-100 border-b border-gray-200 rounded-none" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    if (error || !form) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-white p-4 text-center">
                <div className="w-full max-w-md space-y-4">
                    <h2 className="text-3xl font-bold text-gray-900 mb-2">Ops!</h2>
                    <p className="text-gray-500 text-lg">{error || "Formulário não encontrado."}</p>
                    <Button
                        variant="outline"
                        onClick={() => window.location.reload()}
                        className="mt-4 border-gray-300 text-gray-900 hover:bg-gray-100"
                    >
                        Tentar novamente
                    </Button>
                </div>
            </div>
        );
    }


    if (submitted) {
        return (
            <div
                className="min-h-screen flex flex-col items-center justify-center p-4 text-center animate-fade-in transition-colors duration-500"
                style={{ backgroundColor: settings.background_color, color: settings.text_color }}
            >
                <div className="mb-8 w-full max-w-md mx-auto">
                    {form.organizations?.logo_url ? (
                        <div className="mb-8 animate-in zoom-in duration-500">
                            <img
                                src={form.organizations.logo_url}
                                alt={form.organizations.name}
                                className="h-32 w-auto object-contain mx-auto drop-shadow-lg"
                            />
                        </div>
                    ) : (
                        <div
                            className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border shadow-lg"
                            style={{
                                backgroundColor: hexToRgba(settings.button_color, 0.1),
                                borderColor: settings.button_color,
                                color: settings.button_color
                            }}
                        >
                            <CheckCircle2 className="w-10 h-10" />
                        </div>
                    )}
                    <h1
                        className="text-4xl md:text-5xl font-bold mb-4"
                        style={{ color: settings.button_color }}
                    >
                        {settings.finalization_title || "Obrigado!"}
                    </h1>
                    <p className="text-lg md:text-xl font-light opacity-80 mb-8 whitespace-pre-wrap">
                        {settings.finalization_message || "Suas informações foram enviadas com sucesso."}
                    </p>

                    {settings.finalization_action === 'redirect_auto' && (
                        <div className="text-sm opacity-60 animate-pulse">
                            Redirecionando em {redirectCountdown} segundos...
                        </div>
                    )}

                    {settings.finalization_action === 'redirect_button' && settings.finalization_redirect_url && (
                        <Button
                            onClick={() => window.location.href = settings.finalization_redirect_url!}
                            className="h-12 px-8 text-base font-semibold rounded-xl transition-all shadow-lg hover:scale-[1.02] active:scale-[0.98] w-full"
                            style={{
                                backgroundColor: settings.button_color,
                                color: settings.button_text_color,
                                boxShadow: `0 4px 20px ${hexToRgba(settings.button_color, 0.25)}`
                            }}
                        >
                            {settings.finalization_button_text || "Continuar"}
                        </Button>
                    )}
                </div>

                {settings.finalization_action === 'none' && (
                    <div className="text-sm opacity-30">
                        Você já pode fechar esta página.
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            className="min-h-screen flex flex-col font-sans transition-colors duration-500 relative"
            style={{ backgroundColor: settings.background_color, color: settings.text_color }}
        >
            <style dangerouslySetInnerHTML={{
                __html: `
                input:focus, textarea:focus, select:focus, 
                input:focus-visible, textarea:focus-visible, select:focus-visible {
                    outline: none !important;
                    box-shadow: none !important;
                    -webkit-tap-highlight-color: transparent !important;
                }
            ` }} />
            {/* Top Section: Header (Church Name, Title, Desc) */}
            {/* Adjusted to be always visible or just step 0? Request 3 says "at the top". 
                If we keep "Only on First Step", it will be at the top of First Step.
                I will allow it to take natural height at the top.
            */}
            <div className="w-full max-w-[440px] mx-auto px-6 pt-12 pb-4 z-20">
                <div className="text-left space-y-2 animate-in fade-in slide-in-from-top-4 duration-500">
                    <div className="mb-4">
                        {form.organizations?.logo_url && (
                            <img
                                src={form.organizations.logo_url}
                                alt={form.organizations.name}
                                className="h-12 w-auto object-contain mb-3"
                            />
                        )}
                        {settings.show_church_name !== false && (
                            <span className="text-xs uppercase tracking-wider opacity-50 block font-semibold">
                                {form.organizations?.name || "CHURCHFY"}
                            </span>
                        )}
                    </div>
                    <h1
                        className="text-2xl font-bold tracking-tight leading-tight"
                        style={{ color: settings.button_color }}
                    >
                        {form.title}
                    </h1>
                    {form.description && (
                        <p
                            className="text-sm leading-relaxed opacity-70 font-light"
                        >
                            {form.description}
                        </p>
                    )}
                </div>
            </div>

            {/* Middle Section: Centered Input & Label */}
            <div className="flex-1 w-full max-w-[440px] mx-auto px-6 flex flex-col justify-center pb-60">
                <form
                    onSubmit={(e) => handleNext(e)}
                    className="w-full"
                >
                    {form.fields.map((field, index) => {
                        if (index !== currentStep) return null;

                        return (
                            <div key={field.id} className="w-full space-y-1 animate-in zoom-in-95 fade-in duration-500">
                                <Label
                                    htmlFor={field.id}
                                    className="text-xl md:text-2xl font-medium block text-left"
                                    style={{ color: settings.text_color }}
                                >
                                    {field.label} {field.required && <span style={{ color: settings.button_color }}>*</span>}
                                </Label>

                                {field.type === "textarea" ? (
                                    <Textarea
                                        id={field.id}
                                        value={formData[field.id] || ""}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        placeholder={field.placeholder || "Digite sua resposta..."}
                                        className="h-32 w-full bg-transparent border-0 border-b-2 text-lg text-left p-0 py-4 resize-none rounded-none placeholder:opacity-40 transition-colors duration-300"
                                        style={{
                                            borderColor: isFocused ? settings.button_color : borderColor,
                                            color: settings.text_color
                                        }}
                                        autoFocus
                                    />
                                ) : field.type === "select" ? (
                                    <div className="relative">
                                        <select
                                            id={field.id}
                                            value={formData[field.id] || ""}
                                            onChange={(e) => handleInputChange(field.id, e.target.value)}
                                            onFocus={() => setIsFocused(true)}
                                            onBlur={() => setIsFocused(false)}
                                            className="h-14 w-full bg-transparent border-b-2 text-lg text-left appearance-none cursor-pointer rounded-none transition-colors duration-300"
                                            style={{
                                                borderColor: isFocused ? settings.button_color : borderColor,
                                                color: settings.text_color
                                            }}
                                            autoFocus
                                        >
                                            <option value="" disabled style={{ backgroundColor: settings.background_color }}>
                                                Selecione...
                                            </option>
                                            {field.options?.map((opt) => (
                                                <option key={opt} value={opt} style={{ backgroundColor: settings.background_color }}>
                                                    {opt}
                                                </option>
                                            ))}
                                        </select>
                                        <div
                                            className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[10px] opacity-40"
                                            style={{ color: settings.text_color }}
                                        >
                                            ▼
                                        </div>
                                    </div>
                                ) : (
                                    <Input
                                        id={field.id}
                                        type={field.type}
                                        value={formData[field.id] || ""}
                                        onChange={(e) => handleInputChange(field.id, e.target.value)}
                                        onFocus={() => setIsFocused(true)}
                                        onBlur={() => setIsFocused(false)}
                                        placeholder={field.placeholder || (field.type === 'phone' ? "(00) 00000-0000" : "Digite aqui...")}
                                        className="h-14 w-full bg-transparent border-0 border-b-2 text-lg text-left p-0 py-2 rounded-none placeholder:opacity-40 transition-colors duration-300"
                                        style={{
                                            borderColor: isFocused ? settings.button_color : borderColor,
                                            color: settings.text_color
                                        }}
                                        autoFocus
                                    />
                                )}
                            </div>
                        );
                    })}
                </form>
            </div>

            {/* Footer / Buttons & Progress Area Fixed Bottom */}
            <div className="fixed bottom-0 left-0 w-full z-50 pointer-events-none">
                <div className="w-full max-w-[440px] mx-auto px-6 pb-10 flex flex-col pointer-events-auto">
                    {/* Buttons row */}
                    <div className="flex items-center gap-3 mb-6">
                        {currentStep > 0 && (
                            <button
                                type="button"
                                onClick={handleBack}
                                className="h-12 px-6 rounded-xl bg-white/5 hover:bg-white/10 backdrop-blur-sm transition-all text-sm font-medium border"
                                style={{
                                    color: settings.text_color,
                                    borderColor: hexToRgba(settings.text_color, 0.1)
                                }}
                            >
                                Voltar
                            </button>
                        )}

                        {(() => {
                            const currentField = form.fields[currentStep];
                            if (!currentField) return null;

                            const isRequired = currentField.required;
                            const value = formData[currentField.id];
                            const hasValue = value && value.toString().trim().length > 0;
                            const canContinue = !isRequired || hasValue;

                            return (
                                <Button
                                    onClick={() => handleNext()}
                                    disabled={submitting || !canContinue}
                                    className={`h-12 flex-1 text-base font-semibold rounded-xl transition-all shadow-lg ${!canContinue ? "opacity-30 cursor-not-allowed grayscale" : "hover:scale-[1.02] active:scale-[0.98]"
                                        }`}
                                    style={{
                                        backgroundColor: settings.button_color,
                                        color: settings.button_text_color,
                                        boxShadow: canContinue ? `0 4px 20px ${hexToRgba(settings.button_color, 0.25)}` : 'none'
                                    }}
                                >
                                    {submitting ? (
                                        <span className="flex items-center justify-center gap-2">
                                            Enviando... <Loader2 className="w-5 h-5 animate-spin" />
                                        </span>
                                    ) : (
                                        currentStep === totalSteps - 1 ? "Finalizar" : "Próximo"
                                    )}
                                </Button>
                            );
                        })()}
                    </div>

                    {/* Progress Bar (Conditional) */}
                    {settings.show_progress_bar !== false && (
                        <div className="flex gap-2 w-full mb-4">
                            {form.fields.map((_, idx) => (
                                <div
                                    key={idx}
                                    className="h-1 flex-1 rounded-full transition-all duration-300"
                                    style={{
                                        backgroundColor: idx <= currentStep
                                            ? settings.button_color
                                            : hexToRgba(settings.text_color, 0.15)
                                    }}
                                />
                            ))}
                        </div>
                    )}

                    <div
                        className="text-center text-[10px] uppercase tracking-widest opacity-30 font-semibold"
                        style={{ color: settings.text_color }}
                    >
                        Powered by Churchfy
                    </div>
                </div>
            </div>
        </div>
    );
}
