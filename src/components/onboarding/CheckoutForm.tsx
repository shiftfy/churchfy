import { useState } from "react";
import { useStripe, useElements, PaymentElement } from "@stripe/react-stripe-js";
import { Button } from "@/components/ui/button";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import type { PlanType } from "./PlanSelection";

interface CheckoutFormProps {
    plan: PlanType;
    onSuccess: () => void;
    onBack: () => void;
}

export function CheckoutForm({ plan, onSuccess, onBack }: CheckoutFormProps) {
    const stripe = useStripe();
    const elements = useElements();
    const [loading, setLoading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();

        if (!stripe || !elements) {
            return;
        }

        console.log("Processing payment for plan:", plan);

        setLoading(true);
        setErrorMessage(null);

        // NOTE: In a real implementation with backend:
        // 1. We would trigger the confirmation using stripe.confirmSetup or confirmPayment
        // 2. The clientSecret would come from a backend call that creates the Subscription/SetupIntent

        // For Sandbox testing without backend responding yet, we simulate delay or catch error
        try {
            const { error } = await stripe.confirmSetup({
                elements,
                confirmParams: {
                    return_url: window.location.origin + "/dashboard", // Not used in this SPA flow if redirect is 'if_required'
                },
                redirect: 'if_required'
            });

            if (error) {
                setErrorMessage(error.message || "Erro ao processar cartão.");
                toast.error(error.message);
            } else {
                // Success!
                onSuccess();
            }
        } catch (err) {
            console.error(err);
            // For testing UI flow only (remove in prod)
            // onSuccess(); 
            setErrorMessage("Erro técnico. Verifique a integração com o backend.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="w-full max-w-md mx-auto space-y-6 animate-in fade-in slide-in-from-right-8 duration-500">
            <div className="text-center mb-6">
                <h2 className="text-2xl font-bold">Dados do Pagamento</h2>
                <p className="text-muted-foreground">
                    Você escolheu o plano <span className="font-semibold text-primary">ONE</span>.
                </p>
                <div className="mt-2 text-sm bg-green-50 text-green-700 py-1 px-3 rounded-full inline-flex items-center gap-1">
                    <Lock className="w-3 h-3" /> 7 dias • Cancelamento fácil
                </div>
            </div>

            <div className="bg-card border p-4 rounded-lg shadow-sm">
                <PaymentElement />
            </div>

            {errorMessage && (
                <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
                    {errorMessage}
                </div>
            )}

            <div className="flex gap-4">
                <Button type="button" variant="outline" onClick={onBack} disabled={loading} className="flex-1">
                    Voltar
                </Button>
                <Button type="submit" disabled={!stripe || loading} className="flex-1">
                    {loading ? (
                        <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Processando...
                        </>
                    ) : (
                        "Criar conta"
                    )}
                </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground mt-4">
                Seu período de teste termina em 7 dias. Você não será cobrado se cancelar antes.
            </p>
        </form>
    );
}
