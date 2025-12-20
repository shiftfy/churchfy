import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSuperAdmin } from '@/hooks/useSuperAdmin';
import type { AdminUserListItem } from '@/lib/supabase';
import { supabase } from '@/lib/supabase';

interface UserEditDialogProps {
    user: AdminUserListItem;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess: () => void;
}

interface Organization {
    id: string;
    name: string;
}

export function UserEditDialog({ user, open, onOpenChange, onSuccess }: UserEditDialogProps) {
    const { updateUser, loading } = useSuperAdmin();
    const [fullName, setFullName] = useState(user.full_name || '');
    const [email, setEmail] = useState(user.email || '');
    const [role, setRole] = useState(user.role || 'org_admin');
    const [organizationId, setOrganizationId] = useState(user.organization_id || '');
    const [organizationName, setOrganizationName] = useState(user.organization_name || '');
    const [organizations, setOrganizations] = useState<Organization[]>([]);

    console.log('UserEditDialog rendering with user:', user);

    useEffect(() => {
        console.log('UserEditDialog useEffect triggered. Open:', open);
        if (open && user) {
            loadOrganizations();
            // Reset form when dialog opens
            setFullName(user.full_name || '');
            setEmail(user.email || '');
            setRole(user.role || 'org_admin');
            setOrganizationId(user.organization_id || '');
            setOrganizationName(user.organization_name || '');
        }
    }, [open, user]);

    const loadOrganizations = async () => {
        const { data } = await supabase
            .from('organizations')
            .select('id, name')
            .order('name');
        if (data) setOrganizations(data);
    };

    const handleOrgChange = (orgId: string) => {
        setOrganizationId(orgId);
        const org = organizations.find(o => o.id === orgId);
        if (org) {
            setOrganizationName(org.name);
        } else {
            setOrganizationName('');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await updateUser(
            user.id,
            fullName,
            email,
            role,
            organizationId || null,
            organizationName
        );
        if (success) {
            onSuccess();
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Editar Usuário</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="fullName">Nome Completo</Label>
                            <Input
                                id="fullName"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="role">Role</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="super_admin">Super Admin</SelectItem>
                                    <SelectItem value="org_admin">Admin</SelectItem>
                                    <SelectItem value="branch_admin">Filial</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-4 pt-4 border-t">
                            <h4 className="font-medium text-sm text-gray-900">Configurações da Organização</h4>
                            <div className="space-y-2">
                                <Label htmlFor="organization">Vincular a Organização</Label>
                                <Select value={organizationId} onValueChange={handleOrgChange}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Selecione uma organização" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">Nenhuma</SelectItem>
                                        {organizations.map((org) => (
                                            <SelectItem key={org.id} value={org.id}>
                                                {org.name}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            {organizationId && (
                                <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                                    <Label htmlFor="orgName">Nome da Igreja (Edição)</Label>
                                    <Input
                                        id="orgName"
                                        value={organizationName}
                                        onChange={(e) => setOrganizationName(e.target.value)}
                                        placeholder="Nome da organização"
                                    />
                                    <p className="text-xs text-muted-foreground bg-yellow-50 text-yellow-800 p-2 rounded border border-yellow-200">
                                        ⚠️ Atenção: Editar este nome alterará o nome da organização para <strong>TODOS</strong> os usuários vinculados a ela.
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={loading}>
                            {loading ? 'Salvando...' : 'Salvar'}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
