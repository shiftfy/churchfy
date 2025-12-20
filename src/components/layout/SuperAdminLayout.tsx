import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Shield, Users, Building2, BarChart3, LogOut } from 'lucide-react';

interface SuperAdminLayoutProps {
    children: React.ReactNode;
}

export function SuperAdminLayout({ children }: SuperAdminLayoutProps) {
    const { user, signOut } = useAuth();
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: '/super-admin', icon: BarChart3 },
        { name: 'Usuários', href: '/super-admin/users', icon: Users },
        { name: 'Organizações', href: '/super-admin/organizations', icon: Building2 },
    ];

    const isActive = (href: string) => {
        if (href === '/super-admin') {
            return location.pathname === href;
        }
        return location.pathname.startsWith(href);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-background to-purple-50/30">
            {/* Header */}
            <header className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
                <div className="container mx-auto px-6 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-600 to-purple-800 flex items-center justify-center shadow-lg">
                                <Shield className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-purple-900">Super Admin</h1>
                                <p className="text-xs text-muted-foreground">Painel de Administração</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-4">
                            <div className="text-right">
                                <p className="text-sm font-medium">{user?.full_name}</p>
                                <p className="text-xs text-muted-foreground">{user?.email}</p>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => signOut()}>
                                <LogOut className="w-4 h-4 mr-2" />
                                Sair
                            </Button>
                        </div>
                    </div>
                </div>
            </header>

            <div className="container mx-auto px-6 py-8">
                <div className="flex gap-8">
                    {/* Sidebar */}
                    <aside className="w-64 flex-shrink-0">
                        <nav className="space-y-1 bg-white rounded-lg border p-2 shadow-sm">
                            {navigation.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.href);
                                return (
                                    <Link
                                        key={item.href}
                                        to={item.href}
                                        className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${active
                                                ? 'bg-purple-100 text-purple-900 font-medium'
                                                : 'text-gray-700 hover:bg-gray-100'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 ${active ? 'text-purple-600' : 'text-gray-500'}`} />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </nav>
                    </aside>

                    {/* Main Content */}
                    <main className="flex-1 min-w-0">
                        {children}
                    </main>
                </div>
            </div>
        </div>
    );
}
