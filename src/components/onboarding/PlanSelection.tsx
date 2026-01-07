import { Check } from "lucide-react";
import { Card } from "@/components/ui/card";

export type PlanType = 'one';

interface PlanSelectionProps {
    onSelect: (plan: PlanType) => void;
    selectedPlan: PlanType | null;
}

export function PlanSelection({ onSelect, selectedPlan }: PlanSelectionProps) {
    const plans = [
        {
            id: 'one' as PlanType,
            name: "ONE",
            price: "R$ 69,90",
            period: "/mês",
            description: "Tudo o que sua igreja precisa em um só lugar.",
            features: [
                "Membros Ilimitados",
                "Visitantes Ilimitados",
                "Jornadas Ilimitadas",
                "WhatsApp IA",
                "Relatórios Avançados",
                "Gestão de Voluntários"
            ],
            highlight: true,
        }
    ];

    return (
        <div className="w-full animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="text-center mb-6 space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Escolha o plano ideal</h1>
                <p className="text-zinc-500 text-sm">
                    7 dias grátis. Cancele quando quiser.
                </p>
            </div>

            <div className="space-y-4">
                {plans.map((plan) => (
                    <Card
                        key={plan.id}
                        className={`relative flex flex-col md:flex-row items-start p-4 transition-all duration-200 cursor-pointer overflow-hidden border-2
                            ${selectedPlan === plan.id
                                ? "border-primary bg-primary/5 shadow-md"
                                : "border-zinc-200 hover:border-primary/30 hover:shadow-sm"
                            }`}
                        onClick={() => onSelect(plan.id)}
                    >
                        <div className="flex-1 w-full md:w-auto text-left space-y-2">
                            <div className="flex items-center gap-2">
                                <span className={`text-lg font-bold ${selectedPlan === plan.id ? 'text-primary' : 'text-zinc-900'}`}>{plan.name}</span>
                            </div>
                            <p className="text-xs text-zinc-500">{plan.description}</p>

                            <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                                {plan.features.slice(0, 4).map((feature, i) => (
                                    <div key={i} className="flex items-center gap-1.5 text-xs">
                                        <Check className="w-3.5 h-3.5 text-primary shrink-0" />
                                        <span className="text-zinc-600">{feature}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="mt-4 md:mt-0 md:ml-6 flex flex-row md:flex-col justify-between w-full md:w-auto gap-4 md:gap-1 border-t md:border-t-0 border-zinc-100 pt-3 md:pt-0 shrink-0 items-start">
                            <div className="flex items-baseline gap-1">
                                <span className="text-xl font-bold text-zinc-900">{plan.price}</span>
                                <span className="text-xs text-zinc-500 font-medium">{plan.period}</span>
                            </div>
                        </div>
                    </Card>
                ))}
            </div>
        </div>
    );
}
