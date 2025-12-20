import { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [submitted, setSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { resetPassword, loading, error } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await resetPassword(email);
            setSubmitted(true);
        } catch (error) {
            console.error('Password reset error:', error);
            setIsSubmitting(false);
        }
    };

    if (submitted) {
        return (
            <AuthLayout>
                <div className="flex flex-col items-center space-y-6 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mb-2">
                        <CheckCircle className="w-8 h-8 text-green-600" />
                    </div>

                    <div className="space-y-2">
                        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                            Email enviado!
                        </h1>
                        <p className="text-sm text-zinc-500 max-w-xs mx-auto">
                            Enviamos um link de recuperação para <strong className="text-zinc-900">{email}</strong>.
                            Verifique sua caixa de entrada e spam.
                        </p>
                    </div>

                    <Link to="/login" className="w-full">
                        <Button
                            variant="outline"
                            className="w-full h-11 border-zinc-200 text-zinc-900 hover:bg-zinc-50 hover:text-zinc-900 font-medium"
                        >
                            Voltar para login
                        </Button>
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout
            testimonial={{
                quote: "A recuperação de acesso foi super rápida e simples. O suporte do Churchfy é excelente!",
                author: "Pra. Maria Oliveira",
                role: "Assembleia de Deus"
            }}
        >
            <div className="flex flex-col space-y-2 text-center mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                    Recuperar senha
                </h1>
                <p className="text-sm text-zinc-500">
                    Digite seu email para receber um link de recuperação
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-red-500 bg-red-50 border border-red-200 rounded-md">
                        {error.message}
                    </div>
                )}

                <div className="space-y-1">
                    <Label htmlFor="email" className="text-zinc-700">Email</Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="seu@email.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={loading || isSubmitting}
                        className="h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0"
                    />
                </div>

                <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 mt-6 font-semibold transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-primary/20"
                    disabled={loading || isSubmitting}
                >
                    {isSubmitting || loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Enviando...
                        </>
                    ) : (
                        "Enviar link de recuperação"
                    )}
                </Button>

                <div className="text-center pt-4">
                    <Link to="/login" className="w-full">
                        <Button variant="ghost" className="w-full text-zinc-500 hover:text-zinc-900 hover:bg-transparent">
                            Voltar para login
                        </Button>
                    </Link>
                </div>
            </form>
        </AuthLayout>
    );
}
