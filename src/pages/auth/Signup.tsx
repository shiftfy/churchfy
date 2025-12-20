import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthContext } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/lib/supabase";
import { XCircle } from "lucide-react";
import { AuthLayout } from "@/components/auth/AuthLayout";

export function Signup() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [fullName, setFullName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [emailAvailable, setEmailAvailable] = useState<boolean | null>(null);
    const [isCheckingEmail, setIsCheckingEmail] = useState(false);
    const [emailTouched, setEmailTouched] = useState(false);
    const [passwordTouched, setPasswordTouched] = useState(false);
    const [confirmTouched, setConfirmTouched] = useState(false);

    const { signUpUserOnly, loading, error, isAuthenticated } = useAuthContext();
    const navigate = useNavigate();

    useEffect(() => {
        if (isAuthenticated) {
            navigate('/dashboard');
        }
    }, [isAuthenticated, navigate]);

    // Check email availability
    useEffect(() => {
        const checkEmail = async () => {
            if (!email || email.length < 5 || !email.includes('@')) {
                setEmailAvailable(null);
                return;
            }

            setIsCheckingEmail(true);
            try {
                const { data, error } = await supabase.rpc('check_email_availability', {
                    p_email: email.toLowerCase().trim()
                });

                if (error) throw error;
                setEmailAvailable(data as boolean);
            } catch (error) {
                console.error("Error checking email availability:", error);
                // Fail safe: assume available if RPC fails (migration might not be applied)
                setEmailAvailable(null);
            } finally {
                setIsCheckingEmail(false);
            }
        };

        const timeoutId = setTimeout(checkEmail, 500);
        return () => clearTimeout(timeoutId);
    }, [email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (password !== confirmPassword) {
            alert("As senhas não coincidem!");
            return;
        }

        if (emailAvailable === false) {
            alert("Este email já está em uso!");
            return;
        }

        setIsSubmitting(true);

        try {
            console.log('Signup form: Submitting simplified signup...');
            await signUpUserOnly({ email, password, fullName });
            console.log('Signup form: Signup completed successfully');
            // Navigation handled in AuthContext
        } catch (error: any) {
            console.error('Signup form error:', error);
            // Error is handled by AuthContext, but let's reset loading state here if needed
            setIsSubmitting(false);
        }
    };

    const isFormValid = fullName && email && password && confirmPassword && (password === confirmPassword) && emailAvailable !== false;

    return (
        <AuthLayout
            testimonial={{
                quote: "Desde que começamos a usar o Churchfy, nossa gestão ministerial ficou 10x mais eficiente. É simplesmente essencial.",
                author: "Pr. Ricardo Souza",
                role: "Igreja Videira"
            }}
        >
            <div className="flex flex-col space-y-2 text-center mb-8">
                <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                    Crie sua conta
                </h1>
                <p className="text-sm text-zinc-500">
                    Comece a transformar sua igreja hoje mesmo
                </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                {error && (
                    <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md">
                        {error.message}
                    </div>
                )}

                <div className="space-y-1">
                    <Label htmlFor="fullName" className="text-zinc-700">Nome Completo</Label>
                    <Input
                        id="fullName"
                        type="text"
                        placeholder="João Silva"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        disabled={loading || isSubmitting}
                        className="h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0"
                    />
                </div>

                <div className="space-y-1">
                    <Label htmlFor="email" className="text-zinc-700">Email</Label>
                    <div className="relative">
                        <Input
                            id="email"
                            type="email"
                            placeholder="seu@email.com"
                            value={email}
                            onChange={(e) => {
                                setEmail(e.target.value);
                                setEmailTouched(true);
                            }}
                            required
                            disabled={loading || isSubmitting}
                            className={`h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0 ${emailAvailable === false ? 'border-destructive focus:border-destructive' : emailAvailable === true ? 'border-green-500 focus:border-green-500' : ''}`}
                        />
                        {emailTouched && !isCheckingEmail && emailAvailable === true && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </div>
                        )}
                        {emailTouched && !isCheckingEmail && emailAvailable === false && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                                <XCircle className="w-4 h-4" />
                            </div>
                        )}
                        {isCheckingEmail && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                    {emailTouched && emailAvailable === false && (
                        <p className="text-xs text-destructive">Este email já está em uso em outra conta.</p>
                    )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                        <Label htmlFor="password" className="text-zinc-700">Senha</Label>
                        <div className="relative">
                            <Input
                                id="password"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    setPasswordTouched(true);
                                }}
                                required
                                disabled={loading || isSubmitting}
                                minLength={6}
                                className={`h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0 ${passwordTouched && password.length >= 6 ? 'border-green-500 focus:border-green-500' : ''}`}
                            />
                            {passwordTouched && password.length >= 6 && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <Label htmlFor="confirmPassword" className="text-zinc-700">Confirmar</Label>
                        <div className="relative">
                            <Input
                                id="confirmPassword"
                                type="password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    setConfirmTouched(true);
                                }}
                                required
                                disabled={loading || isSubmitting}
                                className={`h-11 bg-zinc-50 border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:border-primary focus-visible:ring-primary/20 focus-visible:ring-offset-0 ${confirmTouched && password !== confirmPassword ? 'border-destructive focus:border-destructive' : confirmTouched && password === confirmPassword && confirmPassword !== "" ? 'border-green-500 focus:border-green-500' : ''}`}
                            />
                            {confirmTouched && confirmPassword !== "" && password === confirmPassword && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                                </div>
                            )}
                            {confirmTouched && confirmPassword !== "" && password !== confirmPassword && (
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-destructive">
                                    <XCircle className="w-4 h-4" />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                {confirmTouched && confirmPassword !== "" && password !== confirmPassword && (
                    <p className="text-xs text-destructive">As senhas digitadas não coincidem.</p>
                )}

                <Button
                    type="submit"
                    className="w-full h-11 bg-primary text-primary-foreground hover:bg-primary/90 mt-6 font-semibold transition-all hover:scale-[1.02] shadow-lg shadow-primary/20"
                    disabled={loading || isSubmitting || !isFormValid}
                >
                    {isSubmitting || loading ? (
                        <>
                            <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
                            Criando conta...
                        </>
                    ) : (
                        "Criar Conta"
                    )}
                </Button>

                <p className="px-8 text-center text-sm text-zinc-500">
                    Ao clicar em criar conta, você concorda com nossos{" "}
                    <Link to="/termos" className="underline underline-offset-4 hover:text-primary transition-colors">
                        Termos de Serviço
                    </Link>{" "}
                    e{" "}
                    <Link to="/privacidade" className="underline underline-offset-4 hover:text-primary transition-colors">
                        Política de Privacidade
                    </Link>
                    .
                </p>

                <div className="text-center pt-4">
                    <p className="text-sm text-zinc-500">
                        Já tem uma conta?{" "}
                        <Link to="/login" className="text-primary hover:underline font-semibold">
                            Fazer login
                        </Link>
                    </p>
                </div>
            </form>
        </AuthLayout>
    );
}
