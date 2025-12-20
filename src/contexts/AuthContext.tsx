import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, type ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, type User, type Organization } from '@/lib/supabase';
import type { AuthError, Session } from '@supabase/supabase-js';

interface AuthState {
    user: User | null;
    session: Session | null;
    loading: boolean;
    error: AuthError | null;
}

interface SignUpData {
    email: string;
    password: string;
    fullName: string;
    organizationName: string;
    username: string;
}

interface SignUpUserOnlyData {
    email: string;
    password: string;
    fullName: string;
}

interface OrganizationData {
    name: string;
    username: string;
    membersCount?: string;
    address?: string;
    referralSource?: string;
}

interface SignInData {
    email: string;
    password: string;
}

interface AuthContextType extends AuthState {
    signUp: (data: SignUpData) => Promise<void>;
    signUpUserOnly: (data: SignUpUserOnlyData) => Promise<void>;
    createOrganization: (userId: string, data: OrganizationData) => Promise<void>;
    signIn: (data: SignInData) => Promise<void>;
    signOut: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    clearError: () => void;
    isAuthenticated: boolean;
    fetchUserData: (userId: string, retryCount?: number) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to check if there's a stored session synchronously
const hasStoredSession = (): boolean => {
    try {
        const url = import.meta.env.VITE_SUPABASE_URL;
        if (url) {
            const projectRef = url.split('//')[1]?.split('.')[0];
            if (projectRef) {
                const storageKey = `sb-${projectRef}-auth-token`;
                if (localStorage.getItem(storageKey)) {
                    return true;
                }
            }
        }

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.startsWith('sb-') && key?.includes('-auth-token')) {
                return true;
            }
        }

        return false;
    } catch {
        return false;
    }
};

export function AuthProvider({ children }: { children: ReactNode }) {
    const [state, setState] = useState<AuthState>(() => {
        const hasSession = hasStoredSession();
        console.log("AuthContext: Initializing - hasStoredSession:", hasSession);
        return {
            user: null,
            session: null,
            loading: hasSession,
            error: null,
        };
    });
    const navigate = useNavigate();
    const fetchingUserRef = useRef(false);

    useEffect(() => {
        let mounted = true;

        const initializeAuth = async () => {
            // Fast path: if no stored session, immediately set loading to false
            if (!hasStoredSession()) {
                console.log("AuthContext: No stored session, loading complete");
                if (mounted) setState(prev => ({ ...prev, loading: false }));
                return;
            }

            try {
                console.log("AuthContext: Validating token...");
                // Validate token with server - this is FAST (just validates JWT)
                const { data: { user }, error } = await supabase.auth.getUser();

                if (error || !user) {
                    console.error("AuthContext: Token invalid", error);
                    await supabase.auth.signOut();
                    localStorage.removeItem('churchfy-user-cache'); // Clear cache
                    if (mounted) {
                        setState({
                            user: null,
                            session: null,
                            loading: false,
                            error: null,
                        });
                    }
                    return;
                }

                // Token is valid! Get session
                const { data: { session } } = await supabase.auth.getSession();

                console.log("AuthContext: Token valid, setting session immediately");

                // Try to get cached user profile
                const cachedUserStr = localStorage.getItem('churchfy-user-cache');
                let cachedUser: User | null = null;
                if (cachedUserStr) {
                    try {
                        const parsed = JSON.parse(cachedUserStr);
                        if (parsed.id === user.id) {
                            // Security check: If this is the super admin email but role is not super_admin, invalidate cache
                            if (user.email === 'shitfy.gestao@gmail.com' && parsed.role !== 'super_admin') {
                                console.log("AuthContext: Invalidating cache for super admin (stale role)");
                                cachedUser = null;
                                localStorage.removeItem('churchfy-user-cache');
                            } else {
                                cachedUser = parsed;
                                console.log("AuthContext: Using cached user profile");
                            }
                        }
                    } catch (e) {
                        console.warn("AuthContext: Invalid cached user");
                    }
                }

                // CRITICAL: Set session and loading=false IMMEDIATELY
                // User is authenticated, they can access protected routes
                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        session: session,
                        user: cachedUser || prev.user, // Use cached user if available
                        loading: false,
                        error: null,
                    }));
                }

                // Fetch profile data in background (doesn't block UI)
                if (session) {
                    fetchUserData(session.user.id, 0, session.user);
                }

            } catch (error) {
                console.error("AuthContext: Error in initializeAuth", error);
                if (mounted) {
                    setState({
                        user: null,
                        session: null,
                        loading: false,
                        error: error as AuthError,
                    });
                }
            }
        };

        initializeAuth();

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log("AuthContext: Auth state changed:", event);

            if (event === 'SIGNED_IN' && session) {
                if (mounted) {
                    setState(prev => ({
                        ...prev,
                        session: session,
                        loading: false,
                        error: null,
                    }));
                }
                fetchUserData(session.user.id, 0, session.user);
            } else if (event === 'SIGNED_OUT') {
                localStorage.removeItem('churchfy-user-cache'); // Clear cache
                if (mounted) {
                    setState({
                        user: null,
                        session: null,
                        loading: false,
                        error: null,
                    });
                }
            } else if (event === 'TOKEN_REFRESHED' && session) {
                if (mounted) {
                    setState(prev => ({ ...prev, session }));
                }
            }
        });

        return () => {
            mounted = false;
            subscription.unsubscribe();
        };
    }, []);

    // Self-healing mechanism: If user is logged in but missing critical data (like organization_id),
    // keep trying to fetch the full profile in background until successful.
    useEffect(() => {
        let intervalId: ReturnType<typeof setInterval>;

        if (state.user && !state.user.organization_id && !state.loading) {
            console.log("AuthContext: User missing organization_id, starting polling...");
            intervalId = setInterval(() => {
                fetchUserData(state.user!.id, 0, state.user as User);
            }, 3000); // Retry every 3 seconds
        }

        return () => {
            if (intervalId) clearInterval(intervalId);
        };
    }, [state.user, state.loading]);

    const fetchUserData = async (userId: string, retryCount = 0, sessionUser?: any): Promise<void> => {
        // If we have a session user passed directly, update state immediately with what we have
        // This is crucial for signup flow to feel instant
        if (sessionUser && retryCount === 0) {
            console.log("AuthContext: Using provided session user as initial state");
        }

        if (fetchingUserRef.current && retryCount === 0) {
            console.log("AuthContext: Already fetching user data, skipping");
            return;
        }

        console.log(`AuthContext: Fetching user profile data... (attempt ${retryCount + 1})`);
        fetchingUserRef.current = true;

        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, full_name, role, organization_id, branch_id, avatar_url, phone, created_at, updated_at, organization:organizations(*)')
                .eq('id', userId)
                .maybeSingle();

            if (error) {
                console.error("AuthContext: Error fetching user data", error);

                // If user not found and we haven't retried too many times, retry
                if (retryCount < 3) {
                    const delay = (retryCount + 1) * 1000; // Increased delay: 1s, 2s, 3s
                    console.log(`AuthContext: Error fetching, retrying in ${delay}ms...`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchUserData(userId, retryCount + 1, sessionUser);
                }

                // Fallback: Use session user if available, or create a minimal user object
                console.warn("AuthContext: Failed to fetch user profile, using fallback");
                const fallbackUser: User = {
                    id: userId,
                    email: sessionUser?.email || "",
                    full_name: sessionUser?.user_metadata?.full_name || "",
                    role: 'org_admin', // Default safe assumption for signup flow
                    organization_id: undefined,
                    branch_id: undefined,
                    avatar_url: undefined,
                    phone: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                setState(prev => ({
                    ...prev,
                    user: fallbackUser,
                    // Don't set error to avoid showing error UI
                    // error: { ... }
                }));
                return;
            }

            if (!data) {
                console.warn("AuthContext: User data not found");

                // Retry if user not found and we haven't retried too many times
                if (retryCount < 3) {
                    const delay = (retryCount + 1) * 1000;
                    console.log(`AuthContext: User not found, retrying in ${delay}ms...`);

                    await new Promise(resolve => setTimeout(resolve, delay));
                    return fetchUserData(userId, retryCount + 1, sessionUser);
                }

                // Fallback: Create a synthetic user object so the app doesn't hang
                console.warn("AuthContext: User profile permanently not found, creating synthetic user");
                const syntheticUser: User = {
                    id: userId,
                    email: sessionUser?.email || "",
                    full_name: sessionUser?.user_metadata?.full_name || "",
                    role: 'org_admin',
                    organization_id: undefined,
                    branch_id: undefined,
                    avatar_url: undefined,
                    phone: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                setState(prev => ({
                    ...prev,
                    user: syntheticUser,
                    error: null
                }));
                return;
            }

            console.log("AuthContext: User profile loaded successfully", data);
            console.log("AuthContext: User role from database:", data?.role);

            // Cache user data
            localStorage.setItem('churchfy-user-cache', JSON.stringify(data));

            // Handle join which usually returns null, object, or array
            // Since it's a FK on user, it should be single, but Supabase types can be tricky
            const orgData = Array.isArray(data?.organization) ? data?.organization[0] : data?.organization;

            setState(prev => ({
                ...prev,
                user: {
                    ...(data as any),
                    organization: orgData as Organization
                },
                error: null,
            }));

            console.log("AuthContext: State updated with user role:", data?.role);

        } catch (error: any) {
            console.error("AuthContext: Error fetching user data", error);
            // Don't throw - user is still authenticated
        } finally {
            if (retryCount === 0 || retryCount >= 3) {
                fetchingUserRef.current = false;
            }
        }
    };

    const signUp = useCallback(async ({ email, password, fullName, organizationName, username }: SignUpData) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('User creation failed');

            console.log('SignUp: User created in auth, calling handle_signup...');

            const { error: signupFunctionError } = await supabase.rpc(
                'handle_signup',
                {
                    p_auth_user_id: authData.user.id,
                    p_email: email,
                    p_full_name: fullName,
                    p_organization_name: organizationName,
                    p_username: username,
                }
            );

            if (signupFunctionError) {
                console.error('SignUp: handle_signup failed:', signupFunctionError);
                throw signupFunctionError;
            }

            console.log('SignUp: handle_signup completed, signing in...');

            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.warn('Auto sign-in failed:', signInError);
                throw new Error('Conta criada! Por favor, confirme seu email antes de fazer login.');
            }

            console.log('SignUp: Sign-in successful, fetching user data...');

            // Set session FIRST
            if (signInData.session) {
                setState(prev => ({
                    ...prev,
                    session: signInData.session,
                    loading: false,
                    error: null,
                }));
            }

            // Wait for user data to be fetched before navigating
            // This ensures the user profile is loaded
            await fetchUserData(authData.user.id, 0, authData.user);

            console.log('SignUp: User data fetched, navigating to dashboard...');
            navigate('/dashboard');
        } catch (error) {
            console.error('SignUp: Error during signup:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error as AuthError,
            }));
            throw error;
        }
    }, [navigate]);

    const signUpUserOnly = useCallback(async ({ email, password, fullName }: SignUpUserOnlyData) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const { data: authData, error: signUpError } = await supabase.auth.signUp({
                email,
                password,
            });

            if (signUpError) throw signUpError;
            if (!authData.user) throw new Error('User creation failed');

            console.log('SignUpUserOnly: User created in auth, calling handle_new_user_signup...');

            const { error: signupFunctionError } = await supabase.rpc(
                'handle_new_user_signup',
                {
                    p_auth_user_id: authData.user.id,
                    p_email: email,
                    p_full_name: fullName,
                }
            );

            if (signupFunctionError) {
                console.error('SignUpUserOnly: handle_new_user_signup failed:', signupFunctionError);
                throw signupFunctionError;
            }

            console.log('SignUpUserOnly: handle_new_user_signup completed, signing in...');

            const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (signInError) {
                console.warn('Auto sign-in failed:', signInError);
                // Even if sign in fails (e.g. email confirmation required), we still redirect to onboarding (or login)
                // But for this flow, we might want to auto-login. Assuming email confirmation is disabled or handled.
                // If email confirmation IS enabled, this might be tricky.
                throw new Error('Conta criada! Por favor, verifique seu email.');
            }

            console.log('SignUpUserOnly: Sign-in successful, setting session...');

            if (signInData.session) {
                setState(prev => ({
                    ...prev,
                    session: signInData.session,
                    loading: false,
                    error: null,
                }));
            }

            // We do NOT wait for full user data or organization link here, 
            // because we know they don't have an org yet.
            // Just update user state with basic info
            setState(prev => ({
                ...prev,
                user: {
                    id: authData.user!.id,
                    email: email,
                    full_name: fullName,
                    role: 'org_admin',
                    organization_id: undefined,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                } as User
            }));

            // Navigate to onboarding
            navigate('/onboarding');

        } catch (error) {
            console.error('SignUpUserOnly: Error during signup:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error as AuthError,
            }));
            throw error;
        }
    }, [navigate]);

    const createOrganization = useCallback(async (userId: string, data: OrganizationData) => {
        try {
            // Do NOT set global loading here, as it unmounts the Onboarding component
            // setState(prev => ({ ...prev, loading: true, error: null }));

            console.log('CreateOrganization: Calling create_organization_and_link...');

            const { data: result, error: rpcError } = await supabase.rpc(
                'create_organization_and_link',
                {
                    p_user_id: userId,
                    p_org_name: data.name,
                    p_org_username: data.username,
                    p_members_count: data.membersCount,
                    p_address: data.address,
                    p_referral_source: data.referralSource
                }
            );

            if (rpcError) throw rpcError;

            console.log('CreateOrganization: Organization created successfully', result);

            // Re-fetch user data to get the new organization_id
            await fetchUserData(userId, 0);

            // Navigate to dashboard happens in the component after animation

        } catch (error) {
            console.error('CreateOrganization: Error:', error);
            setState(prev => ({
                ...prev,
                loading: false,
                error: error as AuthError,
            }));
            throw error;
        }
    }, [fetchUserData]);

    const signIn = useCallback(async ({ email, password }: SignInData) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) throw error;
            if (!data.user || !data.session) throw new Error('Sign in failed');

            // Set session IMMEDIATELY, don't wait for profile data
            setState(prev => ({
                ...prev,
                session: data.session,
                loading: false,
                error: null,
            }));

            // Fetch profile data in background
            fetchUserData(data.user.id, 0, data.user);
            navigate('/dashboard');
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error as AuthError,
            }));
            throw error;
        }
    }, [navigate]);

    const clearError = useCallback(() => {
        setState(prev => ({
            ...prev,
            error: null
        }));
    }, []);

    const signOut = useCallback(async () => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const { error } = await supabase.auth.signOut();
            if (error) throw error;

            localStorage.removeItem('churchfy-user-cache'); // Clear cache

            setState({
                user: null,
                session: null,
                loading: false,
                error: null,
            });
            navigate('/login');
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error as AuthError,
            }));
        }
    }, [navigate]);

    const resetPassword = useCallback(async (email: string) => {
        try {
            setState(prev => ({ ...prev, loading: true, error: null }));
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setState(prev => ({ ...prev, loading: false }));
        } catch (error) {
            setState(prev => ({
                ...prev,
                loading: false,
                error: error as AuthError,
            }));
            throw error;
        }
    }, []);

    const value = useMemo(() => ({
        ...state,
        signUp,
        signUpUserOnly,
        createOrganization,
        signIn,
        signOut,
        resetPassword,
        clearError,
        fetchUserData,
        // Authentication is based on SESSION, not user profile
        isAuthenticated: !!state.session,
    }), [state, signUp, signIn, signOut, resetPassword, clearError, fetchUserData]);

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuthContext() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuthContext must be used within an AuthProvider');
    }
    return context;
}
