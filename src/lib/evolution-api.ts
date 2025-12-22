import { supabase } from './supabase';
import type { CreateInstanceResponse } from '@/types/whatsapp';

export const EvolutionApi = {
    /**
     * Creates a new instance via Edge Function
     */
    async createInstance(instanceName: string, webhookUrl?: string): Promise<CreateInstanceResponse | null> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            console.log('Session retrieved:', session ? 'YES' : 'NO');
            console.log('Access token first 20 chars:', session?.access_token?.substring(0, 20));
            if (!session) throw new Error("Usuário não autenticado via Supabase.");

            // Using fetch directly to get proper error response
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const response = await fetch(`${supabaseUrl}/functions/v1/whatsapp-manager`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`,
                },
                body: JSON.stringify({
                    action: 'create',
                    payload: { instanceName, webhookUrl }
                })
            });

            const data = await response.json();
            console.log('Response status:', response.status);
            console.log('Response data:', data);

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}: ${response.statusText}`);
            }


            return data;
        } catch (error) {
            console.error('Evolution API Create Error:', error);
            throw error;
        }
    },

    /**
     * Connects an instance (Generates QR Code)
     */
    async connectInstance(instanceName: string): Promise<{ base64?: string, code?: string } | null> {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error("Usuário não autenticado.");

            const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
                body: {
                    action: 'connect',
                    payload: { instanceName }
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                console.error('Edge Function Error:', error);
                // Try to parse error message
                let errorMsg = 'Unknown error';
                try {
                    errorMsg = error.message || JSON.stringify(error);
                } catch (e) { }
                throw new Error(errorMsg);
            }

            return data;
        } catch (error) {
            console.error('Evolution API Connect Error:', error);
            throw error;
        }
    },

    /**
     * Fetches instance status
     */
    async fetchInstance(instanceName: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return null;

            const { data, error } = await supabase.functions.invoke('whatsapp-manager', {
                body: {
                    action: 'fetch',
                    payload: { instanceName }
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) return null;
            return data;
        } catch (error) {
            return null;
        }
    },

    /**
     * Deletes an instance
     */
    async deleteInstance(instanceName: string) {
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return false;

            const { error } = await supabase.functions.invoke('whatsapp-manager', {
                body: {
                    action: 'delete',
                    payload: { instanceName }
                },
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });
            return !error;
        } catch (error) {
            return false;
        }
    },
};
