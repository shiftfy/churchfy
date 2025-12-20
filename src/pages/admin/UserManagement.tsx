import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import type { AdminUserListItem } from '@/lib/supabase';
import { Search, Pencil, Trash2, Shield, Building2 } from 'lucide-react';
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
import { UserEditDialog } from '@/components/admin/UserEditDialog';

export function UserManagement() {
    const { fetchAllUsers, deleteUser, loading } = useSuperAdmin();
    const [users, setUsers] = useState<AdminUserListItem[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<AdminUserListItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [userToDelete, setUserToDelete] = useState<string | null>(null);
    const [userToEdit, setUserToEdit] = useState<AdminUserListItem | null>(null);

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (searchTerm) {
            const filtered = users.filter(
                (user) =>
                    user.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                    user.organization_name?.toLowerCase().includes(searchTerm.toLowerCase())
            );
            setFilteredUsers(filtered);
        } else {
            setFilteredUsers(users);
        }
    }, [searchTerm, users]);

    const loadUsers = async () => {
        const data = await fetchAllUsers();
        setUsers(data);
        setFilteredUsers(data);
    };

    const handleDelete = async () => {
        if (!userToDelete) return;
        const success = await deleteUser(userToDelete);
        if (success) {
            await loadUsers();
        }
        setUserToDelete(null);
    };

    const handleEditSuccess = async () => {
        await loadUsers();
        setUserToEdit(null);
    };

    const getRoleBadge = (role: string) => {
        const styles = {
            super_admin: 'bg-purple-100 text-purple-800 border-purple-300',
            org_admin: 'bg-blue-100 text-blue-800 border-blue-300',
            branch_admin: 'bg-green-100 text-green-800 border-green-300',
        };
        const labels = {
            super_admin: 'Super Admin',
            org_admin: 'Admin',
            branch_admin: 'Filial',
        };
        return (
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${styles[role as keyof typeof styles] || 'bg-gray-100 text-gray-800'}`}>
                {labels[role as keyof typeof labels] || role}
            </span>
        );
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-purple-900">Gerenciamento de Usuários</h1>
                    <p className="text-muted-foreground">Visualize e gerencie todos os usuários da plataforma</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Buscar por nome, email ou organização..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10"
                            />
                        </div>
                        <div className="text-sm text-muted-foreground">
                            {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-3">
                            {Array.from({ length: 5 }).map((_, i) => (
                                <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                            ))}
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead>
                                    <tr className="border-b">
                                        <th className="text-left py-3 px-4 font-medium text-sm">Nome</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Email</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Organização</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Role</th>
                                        <th className="text-left py-3 px-4 font-medium text-sm">Cadastro</th>
                                        <th className="text-right py-3 px-4 font-medium text-sm">Ações</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="border-b hover:bg-muted/50 transition-colors">
                                            <td className="py-3 px-4">
                                                <div className="flex items-center gap-2">
                                                    {user.role === 'super_admin' && (
                                                        <Shield className="w-4 h-4 text-purple-600" />
                                                    )}
                                                    <span className="font-medium">{user.full_name}</span>
                                                </div>
                                            </td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">{user.email}</td>
                                            <td className="py-3 px-4">
                                                {user.organization_name ? (
                                                    <div className="flex items-center gap-2">
                                                        <Building2 className="w-4 h-4 text-muted-foreground" />
                                                        <span className="text-sm">{user.organization_name}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-sm text-muted-foreground">-</span>
                                                )}
                                            </td>
                                            <td className="py-3 px-4">{getRoleBadge(user.role)}</td>
                                            <td className="py-3 px-4 text-sm text-muted-foreground">
                                                {format(new Date(user.created_at), 'dd/MM/yyyy', { locale: ptBR })}
                                            </td>
                                            <td className="py-3 px-4">
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setUserToEdit(user)}
                                                    >
                                                        <Pencil className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => setUserToDelete(user.id)}
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            {filteredUsers.length === 0 && (
                                <div className="text-center py-12 text-muted-foreground">
                                    Nenhum usuário encontrado
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Deletar Usuário</AlertDialogTitle>
                        <AlertDialogDescription>
                            Tem certeza que deseja deletar este usuário? Esta ação não pode ser desfeita.
                            Todos os dados associados a este usuário serão removidos.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDelete}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            Deletar
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* Edit User Dialog */}
            {userToEdit && (
                <UserEditDialog
                    user={userToEdit}
                    open={!!userToEdit}
                    onOpenChange={(open) => !open && setUserToEdit(null)}
                    onSuccess={handleEditSuccess}
                />
            )}
        </div>
    );
}
