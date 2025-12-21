export interface WhatsappConfig {
  id: string;
  organization_id: string;
  branch_id?: string;
  phone_number?: string;
  webhook_url?: string; // N8N Webhook or other
  openai_api_key?: string;
  use_churchfy_api: boolean;
  ai_model?: string;
  ai_temperature?: number;
  is_connected: boolean; // Legacy/Simple check
  last_connection?: string;
  
  // Evolution API fields
  instance_name?: string;
  instance_id?: string;
  api_token?: string;
  status: 'disconnected' | 'connecting' | 'connected';
  
  created_at: string;
  updated_at: string;
}

export type CreateInstanceResponse = {
  instance: {
    instanceName: string;
    instanceId: string;
    apikey: string;
    status: string;
  };
  hash: {
    apikey: string;
  };
};

export type EvolutionInstanceStatus = {
  instance: {
    instanceName: string;
    status: string;
  };
};
