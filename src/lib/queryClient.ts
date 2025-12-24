import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            // Dados ficam "fresh" por 2 minutos
            staleTime: 2 * 60 * 1000,
            // Cache persiste por 5 minutos
            gcTime: 5 * 60 * 1000,
            // Revalidação em background
            refetchOnWindowFocus: false,
            // Retry com delay exponencial
            retry: 1,
            retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        },
    },
});

// Query keys centralizadas para consistência
export const queryKeys = {
    // User & Auth
    user: (userId: string) => ['user', userId] as const,

    // Dashboard
    dashboardMetrics: (orgId: string) => ['dashboard', 'metrics', orgId] as const,
    dashboardRecent: (orgId: string) => ['dashboard', 'recent', orgId] as const,

    // Visitors
    visitors: (orgId: string) => ['visitors', orgId] as const,
    visitorsFlow: (orgId: string) => ['visitors', 'flow', orgId] as const,
    people: (orgId: string) => ['people', orgId] as const,
    disciplers: (orgId: string) => ['disciplers', orgId] as const,

    // Forms
    forms: (orgId: string) => ['forms', orgId] as const,
    form: (formId: string) => ['form', formId] as const,

    // Branches
    branches: (orgId: string) => ['branches', orgId] as const,

    // Journeys
    journeys: (orgId: string) => ['journeys', orgId] as const,

    // Settings
    organization: (orgId: string) => ['organization', orgId] as const,
    whatsappSettings: (orgId: string) => ['whatsapp', orgId] as const,
};
