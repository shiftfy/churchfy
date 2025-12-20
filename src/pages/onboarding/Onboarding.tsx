import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/lib/supabase";
import { CheckCircle2, XCircle, Loader2, Building2, Users, MapPin, Globe } from "lucide-react";
import { toast } from "sonner";
import { PlanSelection, type PlanType } from "@/components/onboarding/PlanSelection";
import { CheckoutForm } from "@/components/onboarding/CheckoutForm";
import { Elements } from "@stripe/react-stripe-js";
import { stripePromise } from "@/lib/stripe";
import { AuthLayout } from "@/components/auth/AuthLayout";

type Step = 1 | 2 | 3 | 4 | 5; // 3=Plan, 4=Checkout, 5=Building

export function Onboarding() {
    const { user, createOrganization, loading: authLoading } = useAuthContext();
    const navigate = useNavigate();
    const [step, setStep] = useState<Step>(1);

    // Step 1 Data
    const [logo, setLogo] = useState<File | null>(null);
    const [organizationName, setOrganizationName] = useState("");
    const [username, setUsername] = useState("");

    // Step 2 Data
    const [membersCount, setMembersCount] = useState("");
    const [address, setAddress] = useState("");
    const [source, setSource] = useState("");

    // Step 3 & 4 Data (Plan & Payment)
    const [selectedPlan, setSelectedPlan] = useState<PlanType | null>(null);
    const [clientSecret, setClientSecret] = useState<string | null>(null);

    // Validation States
    const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
    const [isCheckingUsername, setIsCheckingUsername] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [usernameTouched, setUsernameTouched] = useState(false);

    // Building Animation State
    const [buildingProgress, setBuildingProgress] = useState(0);

    // Redirect if already has organization AND flow is fully done?
    // We only redirect if we are NOT in the middle of submission/onboarding logic.
    // However, since we save Org at step 2, we need to be careful not to redirect if user refreshes at step 3.
    // For now, we rely on local state 'step' to control flow, if page reloads user might be redirected.
    // In a robust app, we should check DB status.
    useEffect(() => {
        if (!authLoading && user?.organization_id && step === 1 && !isSubmitting) {
            // Check if subscription is missing?
            // For simplify, if org exists, we assume user is trying to access dashboard OR finish setup.
            // We'll let them pass for now, but ideally we check if plan is set.
            // navigate('/dashboard', { replace: true });
        }
    }, [user, authLoading, navigate, isSubmitting, step]);

    // Auto-generate username
    useEffect(() => {
        if (organizationName && !usernameTouched) {
            const generated = organizationName
                .toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .replace(/[^a-z0-9\s-]/g, "")
                .trim()
                .replace(/\s+/g, "-")
                .replace(/-+/g, "-");
            setUsername(generated);
        }
    }, [organizationName, usernameTouched]);

    // Check username
    useEffect(() => {
        const checkUsername = async () => {
            if (!username || username.length < 3) {
                setUsernameAvailable(null);
                return;
            }
            if (!/^[a-z0-9-]+$/.test(username)) {
                setUsernameAvailable(false);
                return;
            }

            setIsCheckingUsername(true);
            try {
                const { data, error } = await supabase
                    .from("organizations")
                    .select("username")
                    .eq("username", username)
                    .maybeSingle();

                if (error) throw error;
                setUsernameAvailable(!data);
            } catch (error) {
                console.error("Error checking username:", error);
                setUsernameAvailable(null);
            } finally {
                setIsCheckingUsername(false);
            }
        };

        const timeoutId = setTimeout(checkUsername, 500);
        return () => clearTimeout(timeoutId);
    }, [username]);

    // Validation Logic
    const isStep1Valid = organizationName.length > 0 && username.length >= 3 && usernameAvailable === true;
    const isStep2Valid = membersCount.length > 0 && address.length > 0;

    const handleNextStep = () => {
        if (step === 1) {
            if (!isStep1Valid) {
                if (!organizationName || !username) toast.error("Preencha todos os campos obrigatórios.");
                else if (usernameAvailable === false) toast.error("Escolha um username disponível.");
                return;
            }
            setStep(2);
        }
    };

    const handleCreateOrg = async () => {
        if (step === 2) {
            if (!isStep2Valid) {
                toast.error("Preencha todos os campos obrigatórios.");
                return;
            }

            setIsSubmitting(true);
            try {
                const userId = user?.id;
                if (!userId) throw new Error("User ID not found");

                // Upload Logo if exists
                let logoUrl = null;
                if (logo) {
                    const fileExt = logo.name.split('.').pop();
                    const fileName = `${userId}-${Math.random()}.${fileExt}`;
                    const filePath = `organization-logos/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                        .from('avatars')
                        .upload(filePath, logo);

                    if (!uploadError) {
                        const { data: { publicUrl } } = supabase.storage
                            .from('avatars')
                            .getPublicUrl(filePath);
                        logoUrl = publicUrl;
                    }
                }

                await createOrganization(userId, {
                    name: organizationName,
                    username,
                    membersCount,
                    address,
                    referralSource: source || "NOT_SPECIFIED"
                });

                if (logoUrl) {
                    // Update logo separately if needed, simplified here
                }

                // Move to Plan Selection
                setIsSubmitting(false);
                setStep(3);

            } catch (error) {
                console.error("Onboarding error:", error);
                setIsSubmitting(false);
                toast.error("Erro ao criar organização. Tente novamente.");
            }
        }
    };

    const handleProceedToCheckout = async (plan: PlanType) => {
        console.log("Onboarding: Chamando handleProceedToCheckout", { plan, organizationId: user?.organization_id });
        setIsSubmitting(true);

        try {
            if (!user?.organization_id) {
                console.error("Onboarding: Organization ID ausente");
                throw new Error("ID da organização não encontrado. Verifique se você completou os passos anteriores.");
            }

            // Get fresh session to ensure token is valid
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) {
                throw new Error("Sessão expirada. Faça login novamente.");
            }

            console.log("Onboarding: Token obtido:", token.substring(0, 10) + "...");

            console.log("Onboarding: Invocando Edge Function 'create-subscription'...");
            const { data, error } = await supabase.functions.invoke('create-subscription', {
                body: {
                    planId: plan,
                    organizationId: user?.organization_id
                },
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            console.log("Onboarding: Resposta da Edge Function:", { data, error });

            if (error) {
                console.error("Onboarding: Erro retornado pelo invoke:", error);
                throw error;
            }
            if (data?.error) {
                console.error("Onboarding: Erro nos dados da função:", data.error);
                throw new Error(data.error);
            }

            setClientSecret(data.clientSecret);

            // Move to Checkout
            console.log("Onboarding: Sucesso! Mudando para o passo 4.");
            setStep(4);

        } catch (error: any) {
            console.error("Onboarding: Falha no checkout:", error);
            toast.error("Erro ao preparar assinatura: " + (error.message || "Erro desconhecido"));
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCheckoutSuccess = () => {
        // Start building animation
        setStep(5);
        startBuildingAnimation();
    };

    const startBuildingAnimation = async () => {
        for (let i = 1; i <= 6; i++) {
            await new Promise(r => setTimeout(r, 800));
            setBuildingProgress(i);
        }
        setTimeout(() => {
            navigate('/dashboard');
        }, 1000);
    };

    // Render Content Helper
    const renderContent = () => {
        if (step === 1) {
            return (
                <div className="w-full animate-fade-in relative text-left">
                    <div className="absolute top-0 right-0 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        Passo 1 de 4
                    </div>
                    <div className="mb-8 pt-6">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight text-zinc-900">Configure sua Igreja</h1>
                        <p className="text-zinc-500">Vamos começar com as informações básicas</p>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col md:flex-row gap-6 items-start">
                            <div className="w-full md:w-auto flex flex-col items-center space-y-2">
                                <Label className="text-zinc-700">Logo (Opcional)</Label>
                                <div className="relative h-32 w-32 rounded-lg border-2 border-dashed border-zinc-200 flex items-center justify-center bg-zinc-50 overflow-hidden group hover:border-primary/50 transition-colors cursor-pointer shrink-0">
                                    {logo ? (
                                        <img src={URL.createObjectURL(logo)} alt="Logo Preview" className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="flex flex-col items-center justify-center text-zinc-400">
                                            <Building2 className="h-8 w-8 mb-2" />
                                            <span className="text-xs">Upload</span>
                                        </div>
                                    )}
                                    <input type="file" accept="image/*" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e) => { if (e.target.files?.[0]) setLogo(e.target.files[0]); }} />
                                </div>
                            </div>
                            <div className="flex-1 space-y-4 w-full">
                                <div className="space-y-2">
                                    <Label htmlFor="orgName" className="text-zinc-700">Nome da Igreja <span className="text-red-500">*</span></Label>
                                    <Input id="orgName" value={organizationName} onChange={(e) => setOrganizationName(e.target.value)} placeholder="Ex: Igreja Batista Central" className="h-11 bg-zinc-50 border-zinc-200" />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-zinc-700">Link da Igreja (Username) <span className="text-red-500">*</span></Label>
                                    <div className="relative">
                                        <div className="flex items-center gap-2">
                                            <span className="text-zinc-500 bg-zinc-100 px-3 py-2.5 rounded-md text-sm border border-zinc-200">churchfy.com/</span>
                                            <Input id="username" value={username} onChange={e => { setUsername(e.target.value.toLowerCase()); setUsernameTouched(true); }} placeholder="igreja-batista" className={`h-11 bg-zinc-50 border-zinc-200 ${usernameAvailable === false ? 'border-red-500 focus:border-red-500' : usernameAvailable === true ? 'border-green-500 focus:border-green-500' : ''}`} />
                                            {!isCheckingUsername && usernameAvailable === true && <CheckCircle2 className="w-5 h-5 text-green-500 absolute right-3" />}
                                            {!isCheckingUsername && usernameAvailable === false && <XCircle className="w-5 h-5 text-red-500 absolute right-3" />}
                                        </div>
                                    </div>
                                    {usernameAvailable === false && <p className="text-xs text-red-500">Este link já está em uso.</p>}
                                </div>
                            </div>
                        </div>
                        <Button onClick={handleNextStep} className="w-full h-11 text-lg mt-4 shadow-lg shadow-primary/20" disabled={!isStep1Valid}>Continuar</Button>
                    </div>
                </div>
            );
        }

        if (step === 2) {
            return (
                <div className="w-full animate-fade-in relative text-left">
                    <div className="absolute top-0 right-0 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        Passo 2 de 4
                    </div>
                    <div className="mb-8 pt-6">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight text-zinc-900">Detalhes Finais</h1>
                        <p className="text-zinc-500">Conhecendo melhor vocês</p>
                    </div>
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label className="text-zinc-700">Quantidade de Membros <span className="text-red-500">*</span></Label>
                            <Select onValueChange={setMembersCount} value={membersCount}>
                                <SelectTrigger className="h-11 bg-zinc-50 border-zinc-200"><SelectValue placeholder="Selecione a quantidade" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="0-50">0 - 50 membros</SelectItem>
                                    <SelectItem value="50-100">50 - 100 membros</SelectItem>
                                    <SelectItem value="100-300">100 - 300 membros</SelectItem>
                                    <SelectItem value="300-500">300 - 500 membros</SelectItem>
                                    <SelectItem value="500+">Mais de 500 membros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-700">Endereço / Localização <span className="text-red-500">*</span></Label>
                            <Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Cidade, Estado (ex: São Paulo, SP)" className="h-11 bg-zinc-50 border-zinc-200" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-zinc-700">Como nos conheceu?</Label>
                            <Select onValueChange={setSource} value={source}>
                                <SelectTrigger className="h-11 bg-zinc-50 border-zinc-200"><SelectValue placeholder="Selecione uma opção" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="SOCIAL">Redes Sociais</SelectItem>
                                    <SelectItem value="GOOGLE">Google</SelectItem>
                                    <SelectItem value="INDICATION">Indicação</SelectItem>
                                    <SelectItem value="OTHER">Outros</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="flex gap-4 pt-4">
                            <Button variant="outline" onClick={() => setStep(1)} className="flex-1 h-11 border-zinc-200" disabled={isSubmitting}>Voltar</Button>
                            <Button onClick={handleCreateOrg} className="flex-1 h-11 shadow-lg shadow-primary/20" disabled={!isStep2Valid || isSubmitting}>
                                {isSubmitting ? "Salvando..." : "Continuar"}
                            </Button>
                        </div>
                    </div>
                </div>
            );
        }

        if (step === 3) {
            return (
                <div className="w-full animate-fade-in relative">
                    {isSubmitting && (
                        <div className="absolute inset-0 z-50 bg-background/50 flex items-center justify-center backdrop-blur-sm">
                            <Loader2 className="w-10 h-10 animate-spin text-primary" />
                        </div>
                    )}
                    <div className="absolute -top-12 left-1/2 -translate-x-1/2 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full whitespace-nowrap">
                        Passo 3 de 4
                    </div>

                    <div className="pt-2">
                        <PlanSelection onSelect={setSelectedPlan} selectedPlan={selectedPlan} />
                    </div>

                    <div className="flex gap-4 justify-center mt-6 max-w-sm mx-auto">
                        <Button variant="outline" onClick={() => setStep(2)} className="flex-1 h-11 border-zinc-200" disabled={isSubmitting}>
                            Voltar
                        </Button>
                        <Button
                            onClick={() => selectedPlan && handleProceedToCheckout(selectedPlan)}
                            className="flex-1 h-11 shadow-lg shadow-primary/20"
                            disabled={!selectedPlan || isSubmitting}
                        >
                            {isSubmitting ? "Processando..." : "Continuar"}
                        </Button>
                    </div>
                </div>
            );
        }

        if (step === 4) {
            return (
                <div className="w-full animate-fade-in relative">
                    <div className="absolute top-0 right-0 text-sm font-medium text-muted-foreground bg-muted px-3 py-1 rounded-full">
                        Passo 4 de 4
                    </div>
                    <div className="mb-8 pt-6">
                        <h1 className="text-3xl font-bold mb-2 tracking-tight text-zinc-900 text-center">Pagamento Seguro</h1>
                        <p className="text-zinc-500 text-center">Finalize sua assinatura para começar</p>
                    </div>
                    <div className="max-w-md mx-auto">
                        {clientSecret && selectedPlan ? (
                            <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                                <CheckoutForm
                                    plan={selectedPlan}
                                    onSuccess={handleCheckoutSuccess}
                                    onBack={() => setStep(3)}
                                />
                            </Elements>
                        ) : (
                            <div className="text-center py-10">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                                <p className="mt-4 text-muted-foreground">Preparando checkout...</p>
                            </div>
                        )}
                    </div>
                </div>
            );
        }

        if (step === 5) {
            return (
                <div className="w-full max-w-2xl mx-auto flex flex-col items-center justify-center min-h-[400px] animate-fade-in">
                    <div className="relative w-64 h-64 mb-8">
                        <div className="absolute inset-0 flex items-center justify-center">
                            <Building2 className={`w-32 h-32 text-primary transition-all duration-500 ${buildingProgress >= 1 ? 'opacity-100 scale-100' : 'opacity-20 scale-90 blur-sm'}`} />
                        </div>
                        <div className={`absolute top-0 left-0 transition-opacity duration-300 ${buildingProgress >= 2 ? 'opacity-100' : 'opacity-0'}`}>
                            <Users className="w-12 h-12 text-primary/60" />
                        </div>
                        <div className={`absolute bottom-0 right-0 transition-opacity duration-300 ${buildingProgress >= 3 ? 'opacity-100' : 'opacity-0'}`}>
                            <MapPin className="w-12 h-12 text-primary/60" />
                        </div>
                        <div className={`absolute top-10 right-0 transition-opacity duration-300 ${buildingProgress >= 4 ? 'opacity-100' : 'opacity-0'}`}>
                            <Globe className="w-10 h-10 text-primary/40" />
                        </div>
                        <div className={`absolute inset-0 border-4 border-primary/20 rounded-full animate-ping ${buildingProgress >= 5 ? 'opacity-100' : 'opacity-0'}`} />
                    </div>
                    <h2 className="text-2xl font-bold mb-2 animate-pulse text-zinc-900">Estamos construindo seu ambiente!</h2>
                    <div className="w-full max-w-xs bg-zinc-100 rounded-full h-2 mt-4 overflow-hidden">
                        <div className="bg-primary h-full transition-all duration-700 ease-in-out" style={{ width: `${(buildingProgress / 6) * 100}%` }} />
                    </div>
                    <p className="text-sm text-zinc-500 mt-4">Configurando módulos... {Math.round((buildingProgress / 6) * 100)}%</p>
                </div>
            );
        }
        return null;
    };

    const getLayoutClassName = () => {
        if (step === 3) return "max-w-lg"; // Plan selection - Narrower
        if (step === 4) return "max-w-lg";  // Checkout
        if (step === 5) return "max-w-2xl text-center"; // Building
        return ""; // Default (max-w-[400px])
    };

    return (
        <AuthLayout
            testimonial={{
                quote: "Começar a usar o Churchfy mudou completamente a forma como nos organizamos. É intuitivo e poderoso.",
                author: "Pr. Carlos Mendes",
                role: "Comunidade da Fé"
            }}
            contentClassName={getLayoutClassName()}
        >
            {renderContent()}
        </AuthLayout>
    );
}

