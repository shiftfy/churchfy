import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthLayout } from "@/components/auth/AuthLayout";

export function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { signIn, loading, error, clearError, isAuthenticated } = useAuth();
    const navigate = useNavigate();

    // Clear any previous errors when component mounts
    useEffect(() => {
        clearError();
    }, [clearError]);

    // Redirect if already authenticated
    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);


    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await signIn({ email, password });
        } catch (error) {
            // Error handling already done in useAuth
            console.error('Login error:', error);
            setIsSubmitting(false);
        }
    };

    return (
        <AuthLayout>
            <div className="flex flex-col space-y-2 text-center mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                    Entrar na sua conta
                </h1>
                <p className="text-sm text-zinc-500">
                    Digite seu email e senha para acessar o sistema
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

                <div className="space-y-1">
                    <div className="flex items-center justify-between">
                        <Label htmlFor="password" className="text-zinc-700">Senha</Label>
                        <Link
                            to="/esqueci-senha"
                            className="text-sm text-zinc-500 hover:text-primary hover:underline bg-transparent border-none p-0 cursor-pointer transition-colors"
                        >
                            Esqueceu a senha?
                        </Link>
                    </div>
                    <Input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
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
                            Entrando...
                        </>
                    ) : (
                        "Entrar"
                    )}
                </Button>

                <div className="text-center pt-4">
                    <p className="text-sm text-zinc-500">
                        Não tem uma conta?{" "}
                        <Link
                            to="/cadastro"
                            className="text-primary hover:underline font-semibold"
                        >
                            Criar conta
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
