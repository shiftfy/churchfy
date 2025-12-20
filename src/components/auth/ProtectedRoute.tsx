import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
    children: React.ReactNode;
    allowedRoles?: string[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
    const { session, user, loading } = useAuth();
    const location = useLocation();

    // Show loading state while checking authentication - with elegant animation
    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-4 animate-in fade-in duration-500">
                    {/* Animated logo */}
                    <div className="relative">
                        <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center mx-auto">
                            <span className="text-primary font-bold text-2xl">C</span>
                        </div>
                        <div className="absolute inset-0 w-16 h-16 mx-auto rounded-xl border-2 border-primary/20 animate-ping" />
                    </div>

                    <div className="space-y-2">
                        <p className="text-lg font-medium text-foreground">Churchfy</p>
                        <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            <span className="text-sm">Carregando...</span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Check session for authentication, not user
    if (!session) {
        return <Navigate to="/login" replace />;
    }

    // If we have session but no user profile yet, show subtle loading
    // This handles the case where profile data is still being fetched
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-background">
                <div className="text-center space-y-3 animate-in fade-in duration-300">
                    <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
                    <p className="text-sm text-muted-foreground">Carregando perfil...</p>
                </div>
            </div>
        );
    }

    // MANDATORY ONBOARDING CHECK
    // If user has no organization and is not on onboarding page, force redirect to onboarding
    if (!user.organization_id && location.pathname !== '/onboarding') {
        return <Navigate to="/onboarding" replace />;
    }

    // If specific roles are required, check if user has one of them
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center p-4 bg-background">
                <div className="text-center max-w-md animate-in fade-in duration-300">
                    <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                        <span className="text-destructive text-2xl">⚠️</span>
                    </div>
                    <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
                    <p className="text-muted-foreground">
                        Você não tem permissão para acessar esta página.
                    </p>
                </div>
            </div>
        );
    }

    return <>{children}</>;
}
