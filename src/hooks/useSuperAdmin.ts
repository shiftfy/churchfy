import { useState, useCallback } from 'react';
import { supabase, type PlatformStats, type OrganizationRanking, type AdminUserListItem } from '@/lib/supabase';
import { toast } from 'sonner';

export function useSuperAdmin() {
    const [loading, setLoading] = useState(false);

    // Fetch platform-wide statistics
    const fetchPlatformStats = useCallback(async (): Promise<PlatformStats | null> => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('platform_stats')
                .select('*')
                .single();

            if (error) throw error;
            return data as PlatformStats;
        } catch (error: any) {
            console.error('Error fetching platform stats:', error);
            toast.error('Erro ao carregar estatísticas da plataforma');
            return null;
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch all users with organization details
    const fetchAllUsers = useCallback(async (): Promise<AdminUserListItem[]> => {
        try {
            setLoading(true);
            const { data, error } = await supabase.rpc('get_all_users_admin');

            if (error) throw error;
            return (data || []) as AdminUserListItem[];
        } catch (error: any) {
            console.error('Error fetching users:', error);
            toast.error('Erro ao carregar usuários: ' + (error.message || 'Erro desconhecido'));
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Fetch organization rankings
    const fetchOrganizationRankings = useCallback(async (): Promise<OrganizationRanking[]> => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('organization_rankings')
                .select('*');

            if (error) throw error;
            return (data || []) as OrganizationRanking[];
        } catch (error: any) {
            console.error('Error fetching organization rankings:', error);
            toast.error('Erro ao carregar ranking de organizações');
            return [];
        } finally {
            setLoading(false);
        }
    }, []);

    // Update user details
    const updateUser = useCallback(async (
        userId: string,
        fullName: string,
        email: string,
        role: string,
        organizationId: string | null,
        organizationName?: string
    ): Promise<boolean> => {
        try {
            setLoading(true);
            const { error } = await supabase.rpc('update_user_admin', {
                p_user_id: userId,
                p_full_name: fullName,
                p_email: email,
                p_role: role,
                p_organization_id: organizationId,
                p_organization_name: organizationName || null
            });

            if (error) throw error;
            toast.success('Usuário atualizado com sucesso');
            return true;
        } catch (error: any) {
            console.error('Error updating user:', error);
            toast.error('Erro ao atualizar usuário: ' + error.message);
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete user
    const deleteUser = useCallback(async (userId: string): Promise<boolean> => {
        try {
            setLoading(true);
            const { error } = await supabase.rpc('delete_user_admin', {
                p_user_id: userId
            });

            if (error) throw error;
            toast.success('Usuário deletado com sucesso');
            return true;
        } catch (error: any) {
            console.error('Error deleting user:', error);
            toast.error('Erro ao deletar usuário: ' + (error.message || 'Erro desconhecido'));
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Block/Unblock organization
    const toggleOrganizationBlock = useCallback(async (
        organizationId: string,
        isBlocked: boolean
    ): Promise<boolean> => {
        try {
            setLoading(true);
            const { error } = await supabase.rpc('toggle_organization_block', {
                p_organization_id: organizationId,
                p_is_blocked: isBlocked
            });

            if (error) throw error;
            toast.success(isBlocked ? 'Organização bloqueada' : 'Organização desbloqueada');
            return true;
        } catch (error: any) {
            console.error('Error toggling organization block:', error);
            toast.error('Erro ao alterar status da organização: ' + (error.message || 'Erro desconhecido'));
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    // Delete organization
    const deleteOrganization = useCallback(async (organizationId: string): Promise<boolean> => {
        try {
            setLoading(true);
            const { error } = await supabase.rpc('delete_organization_admin', {
                p_organization_id: organizationId
            });

            if (error) throw error;
            toast.success('Organização deletada com sucesso');
            return true;
        } catch (error: any) {
            console.error('Error deleting organization:', error);
            toast.error('Erro ao deletar organização: ' + (error.message || 'Erro desconhecido'));
            return false;
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        fetchPlatformStats,
        fetchAllUsers,
        fetchOrganizationRankings,
        updateUser,
        deleteUser,
        toggleOrganizationBlock,
        deleteOrganization,
    };
}
