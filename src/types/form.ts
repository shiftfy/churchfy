export type FormFieldType = 'text' | 'email' | 'phone' | 'date' | 'select' | 'checkbox' | 'textarea';

export interface FormField {
    id: string;
    type: FormFieldType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: string[]; // For select type
    width?: 'full' | 'half'; // Layout control
    isLocked?: boolean;
}

export interface FormSettings {
    background_color: string;
    button_color: string;
    text_color: string;
    button_text_color: string;
    finalization_title?: string;
    finalization_message?: string;
    finalization_action?: 'none' | 'redirect_auto' | 'redirect_button';
    finalization_redirect_url?: string;
    finalization_button_text?: string;
    show_church_name?: boolean;
    show_progress_bar?: boolean;
}

export interface Form {
    id: string;
    organization_id: string;
    branch_id?: string;
    journey_id?: string;
    title: string;
    description?: string;
    fields: FormField[];
    settings?: FormSettings;
    is_active: boolean;
    slug: string;
    created_at: string;
    updated_at: string;
    journeys?: { title: string };
    organizations?: { username: string; name: string; logo_url?: string };
    response_count?: { count: number }[];
}

export interface VisitorResponse {
    id: string;
    form_id: string;
    organization_id: string;
    branch_id?: string;
    responses: Record<string, any>; // Key is field id
    created_at: string;
}
