import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { supabase } from "@/lib/supabase";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Activity,
    ArrowRight,
    Calendar,
    Edit,
    FileText,
    MapPin,
    UserPlus,
    Tag
} from "lucide-react";

interface HistoryEvent {
    id: string;
    action_type: string;
    description: string;
    metadata: Record<string, any>;
    created_at: string;
    created_by?: string;
    created_by_user?: {
        full_name: string;
        avatar_url: string;
    };
    is_form_response?: boolean;
}

interface PersonHistoryTimelineProps {
    personId: string;
    refreshTrigger?: number;
}

export function PersonHistoryTimeline({ personId, refreshTrigger = 0 }: PersonHistoryTimelineProps) {
    const [history, setHistory] = useState<HistoryEvent[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchHistory();
    }, [personId, refreshTrigger]);

    const fetchHistory = async () => {
        setLoading(true);
        try {
            // 1. Fetch from person_history
            const { data: historyData, error: historyError } = await supabase
                .from("person_history")
                .select("*")
                .eq("person_id", personId);

            if (historyError) throw historyError;

            // 2. Fetch from visitor_responses
            const { data: responseData, error: responseError } = await supabase
                .from("visitor_responses")
                .select(`
                    id,
                    created_at,
                    forms (
                        title
                    )
                `)
                .eq("person_id", personId);

            if (responseError) throw responseError;

            // 3. Combine initial list
            let combinedEvents: HistoryEvent[] = [
                ...(historyData || []).map((h: any) => ({
                    ...h,
                    is_form_response: false
                })),
                ...(responseData || []).map((r: any) => ({
                    id: r.id,
                    action_type: "form_submission",
                    description: `Respondeu ao formulário: ${r.forms?.title || "Sem título"}`,
                    created_at: r.created_at,
                    metadata: {},
                    is_form_response: true
                }))
            ];

            // 4. Client-side Join for User Details
            const userIds = [...new Set(combinedEvents.map(e => e.created_by).filter(Boolean))];

            if (userIds.length > 0) {
                const { data: users } = await supabase
                    .from("users")
                    .select("id, full_name, avatar_url")
                    .in("id", userIds);

                const userMap = (users || []).reduce((acc: any, user: any) => {
                    acc[user.id] = user;
                    return acc;
                }, {});

                combinedEvents = combinedEvents.map(e => ({
                    ...e,
                    created_by_user: e.created_by && userMap[e.created_by] ? {
                        full_name: userMap[e.created_by].full_name,
                        avatar_url: userMap[e.created_by].avatar_url
                    } : undefined
                }));
            }

            // 5. Sort
            combinedEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

            setHistory(combinedEvents);
        } catch (error) {
            console.error("Error fetching history:", error);
        } finally {
            setLoading(false);
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "stage_change":
                return <MapPin className="h-4 w-4 text-orange-500" />;
            case "journey_change":
                return <Activity className="h-4 w-4 text-purple-500" />;
            case "info_update":
                return <Edit className="h-4 w-4 text-blue-500" />;
            case "form_submission":
                return <FileText className="h-4 w-4 text-indigo-500" />;
            case "created":
                return <UserPlus className="h-4 w-4 text-green-500" />;
            case "note_added":
                return <FileText className="h-4 w-4 text-gray-500" />;
            case "tag_added":
                return <Tag className="h-4 w-4 text-emerald-500" />;
            case "tag_removed":
                return <Tag className="h-4 w-4 text-red-500" />;
            default:
                return <Activity className="h-4 w-4 text-gray-500" />;
        }
    };

    if (loading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex gap-4">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-2 flex-1">
                            <Skeleton className="h-4 w-l-[80%]" />
                            <Skeleton className="h-4 w-l-[60%]" />
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    if (history.length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
                <Activity className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Nenhum histórico registrado.</p>
            </div>
        );
    }

    return (
        <ScrollArea className="h-[600px] pr-4">
            <div className="relative border-l border-muted ml-4 space-y-8 py-2">
                {history.map((event) => (
                    <div key={event.id} className="relative pl-8">
                        <span className="absolute -left-[17px] top-1 flex h-8 w-8 items-center justify-center rounded-full bg-background border ring-4 ring-background shadow-sm">
                            {getIcon(event.action_type)}
                        </span>
                        <div className="flex flex-col gap-1">
                            <div className="text-sm font-medium">
                                {event.description}
                            </div>
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {format(new Date(event.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                {event.created_by_user && (
                                    <>
                                        <span>•</span>
                                        <span className="hover:text-foreground transition-colors">{event.created_by_user.full_name}</span>
                                    </>
                                )}
                            </div>
                            {event.metadata && Object.keys(event.metadata).length > 0 && (
                                <div className="mt-2 bg-muted/30 p-3 rounded-lg text-xs space-y-2 border border-border/50">
                                    {event.action_type === 'stage_change' && event.metadata.old_stage && event.metadata.new_stage && (
                                        <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{event.metadata.old_stage}</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">{event.metadata.new_stage}</span>
                                        </div>
                                    )}
                                    {event.action_type === 'journey_change' && event.metadata.old_journey && event.metadata.new_journey && (
                                        <div className="flex items-center gap-2">
                                            <span className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">{event.metadata.old_journey}</span>
                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                            <span className="px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 font-medium">{event.metadata.new_journey}</span>
                                        </div>
                                    )}
                                    {(event.action_type === 'tag_added' || event.action_type === 'tag_removed') && event.metadata.tag_name && (
                                        <div className="flex items-center gap-2">
                                            <div
                                                className="px-2 py-1 rounded-full text-white font-medium flex items-center gap-1.5"
                                                style={{ backgroundColor: event.metadata.tag_color || '#6b7280' }}
                                            >
                                                <Tag className="h-3 w-3" />
                                                {event.metadata.tag_name}
                                            </div>
                                        </div>
                                    )}
                                    {event.action_type === 'info_update' && !event.metadata.old_stage && !event.metadata.old_journey && (
                                        <div className="grid grid-cols-1 gap-1">
                                            {Object.entries(event.metadata).map(([key, value]) => (
                                                <div key={key} className="flex gap-2">
                                                    <span className="text-muted-foreground">{key}:</span>
                                                    <span className="font-medium text-foreground truncate">{String(value)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </ScrollArea>
    );
}
