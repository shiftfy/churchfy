import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import type { OrganizationRanking } from '@/lib/supabase';
import { Trophy, Users, Map, FileText, Ban, Trash2, Building2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function OrganizationManagement() {
    const { fetchOrganizationRankings, toggleOrganizationBlock, deleteOrganization, loading } = useSuperAdmin();
    const [organizations, setOrganizations] = useState<OrganizationRanking[]>([]);
    const [orgToDelete, setOrgToDelete] = useState<string | null>(null);

    useEffect(() => {
        loadOrganizations();
    }, []);

    const loadOrganizations = async () => {
        const data = await fetchOrganizationRankings();
        setOrganizations(data);
    };

    const handleToggleBlock = async (orgId: string, currentlyBlocked: boolean) => {
        const success = await toggleOrganizationBlock(orgId, !currentlyBlocked);
        if (success) {
            await loadOrganizations();
        }
    };

    const handleDelete = async () => {
        if (!orgToDelete) return;
        const success = await deleteOrganization(orgToDelete);
        if (success) {
            await loadOrganizations();
        }
        setOrgToDelete(null);
    };

    const getRankIcon = (index: number) => {
        if (index === 0) return <Trophy className="w-5 h-5 text-yellow-500" />;
        if (index === 1) return <Trophy className="w-5 h-5 text-gray-400" />;
        if (index === 2) return <Trophy className="w-5 h-5 text-orange-600" />;
        return <span className="text-sm text-muted-foreground">#{index + 1}</span>;
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-purple-900">Gerenciamento de Organizações</h1>
                <p className="text-muted-foreground">Ranking e controle de acesso das organizações</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Ranking por Visitantes Cadastrados</CardTitle>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-20 bg-muted animate-pulse rounded" />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {organizations.map((org, index) => (
                                <div
                                    key={org.id}
                                    className={`p-4 border rounded-lg ${org.is_blocked ? 'bg-red-50 border-red-200' : 'hover:bg-muted/50'
                                        } transition-colors`}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-purple-100">
                                                {getRankIcon(index)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <h3 className="font-semibold text-lg">{org.name}</h3>
                                                    {org.is_blocked && (
                                                        <span className="px-2 py-0.5 text-xs font-medium bg-red-100 text-red-800 rounded-full border border-red-300">
                                                            Bloqueado
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    @{org.username} • Criado em {format(new Date(org.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                                </p>
                                                <div className="grid grid-cols-4 gap-4">
                                                    <div className="flex items-center gap-2">
                                                        <Users className="w-4 h-4 text-blue-600" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Visitantes</p>
                                                            <p className="font-semibold">{org.visitor_count}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-purple-600" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Usuários</p>
                                                            <p className="font-semibold">{org.user_count}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <Map className="w-4 h-4 text-green-600" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Jornadas</p>
                                                            <p className="font-semibold">{org.journey_count}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <FileText className="w-4 h-4 text-orange-600" />
                                                        <div>
                                                            <p className="text-xs text-muted-foreground">Formulários</p>
                                                            <p className="font-semibold">{org.form_count}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center gap-2">
                                                <Ban className="w-4 h-4 text-muted-foreground" />
                                                <Switch
                                                    checked={org.is_blocked}
                                                    onCheckedChange={() => handleToggleBlock(org.id, org.is_blocked)}
                                                />
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => setOrgToDelete(org.id)}
                                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {organizations.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    Nenhuma organização encontrada
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!orgToDelete} onOpenChange={(open) => !open && setOrgToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Organização</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja deletar esta organização? Esta ação não pode ser desfeita.
                            Todos os dados associados (usuários, jornadas, formulários, visitantes) serão removidos permanentemente.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Deletar Permanentemente
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
