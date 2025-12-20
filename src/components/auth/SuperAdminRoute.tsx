import { Navigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { PageLoading } from '@/components/ui/page-loading';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

interface SuperAdminRouteProps {
    children: React.ReactNode;
}

// Define allowed super admin emails
const SUPER_ADMIN_EMAILS = ['shitfy.gestao@gmail.com'];

export function SuperAdminRoute({ children }: SuperAdminRouteProps) {
    const { user, loading } = useAuth();

    console.log('SuperAdminRoute: Checking access...', { user, loading });

    if (loading) {
        return <PageLoading />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    // Check by email (primary) OR by role (fallback)
    const isEmailMatch = SUPER_ADMIN_EMAILS.includes(user.email || '');
    const isRoleMatch = user.role === 'super_admin';

    // If email matches but role is not yet super_admin, wait for background update
    // This happens when cache has old role but fetchUserData is still running
    if (isEmailMatch && !isRoleMatch) {
        console.log('SuperAdminRoute: Email matches super admin, but role is pending. Waiting...');
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
                <PageLoading />
                <p className="mt-4 text-sm text-muted-foreground animate-pulse">Sincronizando permissões de administrador...</p>
            </div>
        );
    }

    const isSuperAdmin = isEmailMatch || isRoleMatch;

    if (!isSuperAdmin) {
        console.log('SuperAdminRoute: Access denied. User email:', user.email, 'role:', user.role);

        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
                <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full text-center">
                    <div className="flex justify-center mb-4">
                        <div className="p-3 bg-red-100 rounded-full">
                            <AlertTriangle className="w-8 h-8 text-red-600" />
                        </div>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-2">Acesso Negado</h1>
                    <p className="text-gray-600 mb-6">
                        Você não tem permissão para acessar o painel de Super Admin.
                    </p>

                    <div className="bg-gray-100 p-4 rounded-md text-left text-sm font-mono mb-6 overflow-x-auto">
                        <p><strong>Status Debug:</strong></p>
                        <p>Email Atual: {user.email || 'Não detectado'}</p>
                        <p>Role Atual: {user.role || 'Não detectado'}</p>
                        <p>ID: {user.id}</p>
                        <hr className="my-2 border-gray-300" />
                        <p>Esperado:</p>
                        <p>Email: shitfy.gestao@gmail.com</p>
                        <p>Role: super_admin</p>
                    </div>

                    <div className="flex gap-3 justify-center">
                        <Button variant="outline" onClick={() => window.location.href = '/dashboard'}>
                            Voltar ao Dashboard
                        </Button>
                        <Button variant="destructive" onClick={() => {
                            localStorage.clear();
                            window.location.href = '/login';
                        }}>
                            Sair e Limpar Cache
                        </Button>
                    </div>
                </div>
            </div>
        );
    }

    console.log('SuperAdminRoute: Access granted for super_admin');
    return <>{children}</>;
}
