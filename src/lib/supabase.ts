import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Missing Supabase environment variables. Please configure .env.local');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
    },
});

// Types for database tables
export type UserRole = 'super_admin' | 'org_admin' | 'branch_admin';

export interface User {
    id: string;
    email: string;
    full_name: string;
    role: UserRole;
    organization_id?: string;
    branch_id?: string;
    avatar_url?: string;
    phone?: string;
    created_at: string;
    updated_at: string;
    organization?: Organization;
}

export interface Organization {
    id: string;
    name: string;
    slug: string;
    username: string;
    email?: string;
    phone?: string;
    address?: string;
    website?: string;
    logo_url?: string;
    plan: 'free' | 'pro' | 'enterprise' | 'one' | 'campus' | 'custom';
    plan_id?: 'one' | 'campus' | 'custom';
    subscription_status?: 'trialing' | 'active' | 'past_due' | 'canceled' | 'incomplete' | 'unpaid';
    trial_ends_at?: string;
    created_at: string;
    updated_at: string;
}

export interface Branch {
    id: string;
    organization_id: string;
    name: string;
    slug: string;
    address?: string;
    phone?: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface Journey {
    id: string;
    organization_id: string;
    title: string;
    description?: string;
    is_default: boolean;
    created_at: string;
    updated_at: string;
}

// Super Admin Types
export interface PlatformStats {
    total_users: number;
    total_organizations: number;
    total_journeys: number;
    total_visitors: number;
    total_forms: number;
    total_responses: number;
}

export interface OrganizationRanking {
    id: string;
    name: string;
    username: string;
    slug: string;
    is_blocked: boolean;
    created_at: string;
    visitor_count: number;
    user_count: number;
    journey_count: number;
    form_count: number;
}

export interface AdminUserListItem {
    id: string;
    email: string;
    full_name: string;
    role: string;
    organization_id: string | null;
    organization_name: string | null;
    organization_username: string | null;
    branch_id: string | null;
    avatar_url: string | null;
    phone: string | null;
    created_at: string;
    updated_at: string;
}
