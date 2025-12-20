import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import type { PlatformStats } from '@/lib/supabase';
import { Users, Building2, Map, UserPlus, FileText, MessageSquare } from 'lucide-react';

export function SuperAdminDashboard() {
    const { fetchPlatformStats, loading } = useSuperAdmin();
    const [stats, setStats] = useState<PlatformStats | null>(null);

    useEffect(() => {
        loadStats();
    }, []);

    const loadStats = async () => {
        const data = await fetchPlatformStats();
        if (data) setStats(data);
    };

    const statCards = [
        {
            title: 'Total de Usuários',
            value: stats?.total_users || 0,
            icon: Users,
            color: 'text-blue-600',
            bgColor: 'bg-blue-100',
        },
        {
            title: 'Organizações',
            value: stats?.total_organizations || 0,
            icon: Building2,
            color: 'text-purple-600',
            bgColor: 'bg-purple-100',
        },
        {
            title: 'Jornadas',
            value: stats?.total_journeys || 0,
            icon: Map,
            color: 'text-green-600',
            bgColor: 'bg-green-100',
        },
        {
            title: 'Visitantes Cadastrados',
            value: stats?.total_visitors || 0,
            icon: UserPlus,
            color: 'text-orange-600',
            bgColor: 'bg-orange-100',
        },
        {
            title: 'Formulários',
            value: stats?.total_forms || 0,
            icon: FileText,
            color: 'text-pink-600',
            bgColor: 'bg-pink-100',
        },
        {
            title: 'Respostas Recebidas',
            value: stats?.total_responses || 0,
            icon: MessageSquare,
            color: 'text-teal-600',
            bgColor: 'bg-teal-100',
        },
    ];

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-purple-900">Dashboard</h1>
                <p className="text-muted-foreground">Visão geral da plataforma Churchfy</p>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <Card key={i}>
                            <CardHeader className="pb-3">
                                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
                            </CardHeader>
                            <CardContent>
                                <div className="h-8 w-20 bg-muted animate-pulse rounded" />
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {statCards.map((card) => {
                        const Icon = card.icon;
                        return (
                            <Card key={card.title} className="hover:shadow-lg transition-shadow">
                                <CardHeader className="flex flex-row items-center justify-between pb-2">
                                    <CardTitle className="text-sm font-medium text-muted-foreground">
                                        {card.title}
                                    </CardTitle>
                                    <div className={`p-2 rounded-lg ${card.bgColor}`}>
                                        <Icon className={`w-5 h-5 ${card.color}`} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-3xl font-bold">{card.value.toLocaleString('pt-BR')}</div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle>Ações Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <a
                            href="/super-admin/users"
                            className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                        >
                            <Users className="w-6 h-6 text-purple-600 mb-2" />
                            <h3 className="font-semibold">Gerenciar Usuários</h3>
                            <p className="text-sm text-muted-foreground">Ver, editar e deletar usuários</p>
                        </a>
                        <a
                            href="/super-admin/organizations"
                            className="p-4 border rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors"
                        >
                            <Building2 className="w-6 h-6 text-purple-600 mb-2" />
                            <h3 className="font-semibold">Gerenciar Organizações</h3>
                            <p className="text-sm text-muted-foreground">Ver ranking e bloquear acesso</p>
                        </a>
                        <div className="p-4 border rounded-lg bg-gray-50">
                            <Map className="w-6 h-6 text-gray-400 mb-2" />
                            <h3 className="font-semibold text-gray-600">Relatórios</h3>
                            <p className="text-sm text-muted-foreground">Em breve</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
