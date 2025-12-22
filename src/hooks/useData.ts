import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { queryKeys } from '@/lib/queryClient';
import { useAuth } from './useAuth';

// Hook para Dashboard Metrics
export function useDashboardMetrics() {
    const { user } = useAuth();
    const orgId = user?.organization_id;

    return useQuery({
        queryKey: queryKeys.dashboardMetrics(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('visitor_responses')
                .select('id, created_at, responses')
                .eq('organization_id', orgId);

            if (error) throw error;
            return data || [];
        },
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000, // 5 minutos
    });
}

// Hook para Recent Visitors no Dashboard
export function useDashboardRecent() {
    const { user } = useAuth();
    const orgId = user?.organization_id;

    return useQuery({
        queryKey: queryKeys.dashboardRecent(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('visitor_responses')
                .select('*, branches(name)')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false })
                .limit(15);

            if (error) throw error;
            return data || [];
        },
        enabled: !!orgId,
        staleTime: 2 * 60 * 1000, // 2 minutos
    });
}

// Hook para Branches
export function useBranches() {
    const { user } = useAuth();
    const orgId = user?.organization_id;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.branches(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('branches')
                .select('*')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000,
    });

    const createBranch = useMutation({
        mutationFn: async (data: {
            name: string;
            slug: string;
            address?: string;
            phone?: string;
            is_active: boolean;
        }) => {
            if (!orgId) throw new Error('No organization ID');

            const { error } = await supabase.from('branches').insert({
                ...data,
                organization_id: orgId,
            });

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.branches(orgId || '') });
        },
    });

    const updateBranch = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: any }) => {
            const { error } = await supabase
                .from('branches')
                .update(data)
                .eq('id', id);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.branches(orgId || '') });
        },
    });

    const deleteBranch = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('branches').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.branches(orgId || '') });
        },
    });

    return {
        ...query,
        createBranch,
        updateBranch,
        deleteBranch,
    };
}

// Hook para People (Visitantes)
export function usePeople() {
    const { user } = useAuth();
    const orgId = user?.organization_id;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.people(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('people')
                .select('*, visitor_responses(created_at, responses, forms(title, fields))')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        },
        enabled: !!orgId,
        staleTime: 2 * 60 * 1000,
    });

    const deletePerson = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('people').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.people(orgId || '') });
        },
    });

    const archivePerson = useMutation({
        mutationFn: async ({ id, isArchived }: { id: string; isArchived: boolean }) => {
            const { error } = await supabase
                .from('people')
                .update({ is_archived: isArchived })
                .eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.people(orgId || '') });
        },
    });

    return {
        ...query,
        deletePerson,
        archivePerson,
    };
}

// Hook para Forms
export function useForms() {
    const { user } = useAuth();
    const orgId = user?.organization_id;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.forms(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('forms')
                .select(`
                    *,
                    journeys:journey_id (id, name, color),
                    response_count:visitor_responses(count)
                `)
                .eq('organization_id', orgId)
                .order('created_at', { ascending: false });

            if (error) throw error;

            // Transform response_count from array to number
            return (data || []).map((form: any) => ({
                ...form,
                response_count: form.response_count?.[0]?.count || 0,
            }));
        },
        enabled: !!orgId,
        staleTime: 2 * 60 * 1000,
    });

    const deleteForm = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from('forms').delete().eq('id', id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.forms(orgId || '') });
        },
    });

    return {
        ...query,
        deleteForm,
    };
}

// Hook para Journeys
export function useJourneys() {
    const { user } = useAuth();
    const orgId = user?.organization_id;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.journeys(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('journeys')
                .select('*, stages(id, name, color, position)')
                .eq('organization_id', orgId)
                .order('created_at', { ascending: true });

            if (error) throw error;
            return data || [];
        },
        enabled: !!orgId,
        staleTime: 5 * 60 * 1000,
    });

    const invalidate = () => {
        queryClient.invalidateQueries({ queryKey: queryKeys.journeys(orgId || '') });
    };

    return {
        ...query,
        invalidate,
    };
}

// Hook para Organization Settings
export function useOrganization() {
    const { user } = useAuth();
    const orgId = user?.organization_id;
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: queryKeys.organization(orgId || ''),
        queryFn: async () => {
            if (!orgId) throw new Error('No organization ID');

            const { data, error } = await supabase
                .from('organizations')
                .select('*')
                .eq('id', orgId)
                .single();

            if (error) throw error;
            return data;
        },
        enabled: !!orgId,
        staleTime: 10 * 60 * 1000, // 10 minutos - dados mudam raramente
    });

    const updateOrganization = useMutation({
        mutationFn: async (data: {
            name?: string;
            address?: string;
            website?: string;
            logo_url?: string;
            church_metadata?: any;
        }) => {
            if (!orgId) throw new Error('No organization ID');

            const { error } = await supabase
                .from('organizations')
                .update(data)
                .eq('id', orgId);

            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: queryKeys.organization(orgId || '') });
        },
    });

    return {
        ...query,
        updateOrganization,
    };
}

// Prefetch functions para pré-carregar dados
export function usePrefetch() {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const orgId = user?.organization_id;

    const prefetchDashboard = async () => {
        if (!orgId) return;

        await Promise.all([
            queryClient.prefetchQuery({
                queryKey: queryKeys.dashboardMetrics(orgId),
                queryFn: async () => {
                    const { data } = await supabase
                        .from('visitor_responses')
                        .select('id, created_at, responses')
                        .eq('organization_id', orgId);
                    return data || [];
                },
            }),
            queryClient.prefetchQuery({
                queryKey: queryKeys.dashboardRecent(orgId),
                queryFn: async () => {
                    const { data } = await supabase
                        .from('visitor_responses')
                        .select('*, branches(name)')
                        .eq('organization_id', orgId)
                        .order('created_at', { ascending: false })
                        .limit(15);
                    return data || [];
                },
            }),
        ]);
    };

    const prefetchBranches = async () => {
        if (!orgId) return;

        await queryClient.prefetchQuery({
            queryKey: queryKeys.branches(orgId),
            queryFn: async () => {
                const { data } = await supabase
                    .from('branches')
                    .select('*')
                    .eq('organization_id', orgId)
                    .order('created_at', { ascending: false });
                return data || [];
            },
        });
    };

    const prefetchPeople = async () => {
        if (!orgId) return;

        await queryClient.prefetchQuery({
            queryKey: queryKeys.people(orgId),
            queryFn: async () => {
                const { data } = await supabase
                    .from('people')
                    .select('*, visitor_responses(created_at, responses, forms(title, fields))')
                    .eq('organization_id', orgId)
                    .order('created_at', { ascending: false });
                return data || [];
            },
        });
    };

    return {
        prefetchDashboard,
        prefetchBranches,
        prefetchPeople,
    };
}
