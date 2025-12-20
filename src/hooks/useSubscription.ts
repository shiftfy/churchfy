import { useAuthContext } from "@/contexts/AuthContext";

export function useSubscription() {
    const { user } = useAuthContext();
    const planId = user?.organization?.plan_id || 'one'; // Default to 'one' if missing

    const canCreateBranches = ['campus', 'custom'].includes(planId);

    // Other limits can be added here
    const maxBranches = planId === 'campus' ? 100 : planId === 'custom' ? 999 : 0;

    return {
        planId,
        canCreateBranches,
        maxBranches,
        subscriptionStatus: user?.organization?.subscription_status,
        trialEndsAt: user?.organization?.trial_ends_at
    };
}
