import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, UserPlus, Calendar } from "lucide-react";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { startOfMonth, subDays, format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

export function VisitorDashboard() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalVisitors: 0,
        visitorsThisMonth: 0,
        newVisitors: 0,
    });
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        if (user?.organization_id) {
            fetchDashboardData();
        }
    }, [user]);

    const fetchDashboardData = async () => {
        if (!user?.organization_id) return;

        setLoading(true);
        try {
            // Fetch all responses
            const { data: responses, error } = await supabase
                .from("visitor_responses")
                .select("created_at, responses")
                .eq("organization_id", user.organization_id);

            if (error) throw error;

            if (!responses) return;

            // Calculate stats
            const now = new Date();
            const startOfCurrentMonth = startOfMonth(now);

            const totalVisitors = responses.length;
            const visitorsThisMonth = responses.filter((r) =>
                new Date(r.created_at) >= startOfCurrentMonth
            ).length;

            // Simple "new visitors" logic (unique emails)
            // This assumes 'email' field exists in responses jsonb
            const uniqueEmails = new Set();
            responses.forEach(r => {
                const email = r.responses?.email || r.responses?.Email;
                if (email) uniqueEmails.add(email);
            });
            const newVisitors = uniqueEmails.size;

            setStats({
                totalVisitors,
                visitorsThisMonth,
                newVisitors,
            });

            // Prepare chart data (last 30 days)
            const last30Days = Array.from({ length: 30 }, (_, i) => {
                const date = subDays(now, 29 - i);
                return {
                    date,
                    dateStr: format(date, "dd/MM", { locale: ptBR }),
                    count: 0,
                };
            });

            responses.forEach((r) => {
                const responseDate = new Date(r.created_at);
                const dayStat = last30Days.find((d) => isSameDay(d.date, responseDate));
                if (dayStat) {
                    dayStat.count++;
                }
            });

            setChartData(last30Days);

        } catch (error) {
            console.error("Error fetching dashboard data:", error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="text-muted-foreground">Carregando dashboard...</div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard de Visitantes</h1>
                <p className="text-muted-foreground mt-1">
                    Acompanhe as métricas e o crescimento da sua igreja
                </p>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Total de Visitantes</CardTitle>
                        <Users className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.totalVisitors}</div>
                        <p className="text-xs text-muted-foreground">
                            Desde o início
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Visitantes este Mês</CardTitle>
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.visitorsThisMonth}</div>
                        <p className="text-xs text-muted-foreground">
                            No mês atual
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Visitantes Únicos</CardTitle>
                        <UserPlus className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">{stats.newVisitors}</div>
                        <p className="text-xs text-muted-foreground">
                            Baseado em e-mails únicos
                        </p>
                    </CardContent>
                </Card>
            </div>

            <Card className="col-span-4">
                <CardHeader>
                    <CardTitle>Visitantes nos últimos 30 dias</CardTitle>
                </CardHeader>
                <CardContent className="pl-2">
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis
                                    dataKey="dateStr"
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                />
                                <YAxis
                                    stroke="#888888"
                                    fontSize={12}
                                    tickLine={false}
                                    axisLine={false}
                                    tickFormatter={(value) => `${value}`}
                                    allowDecimals={false}
                                />
                                <Tooltip
                                    contentStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e2e8f0' }}
                                    cursor={{ fill: '#f1f5f9' }}
                                />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
