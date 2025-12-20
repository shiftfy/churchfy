import { useMemo, useState } from "react";
import { useDashboardMetrics, useDashboardRecent } from "@/hooks/useData";
import { useSubscription } from "@/hooks/useSubscription";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    MetricCardSkeleton,
    ChartSkeleton,
    TableRowSkeleton,
} from "@/components/ui/skeleton";
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import {
    Calendar as CalendarIcon,
    TrendingUp,
    TrendingDown,
} from "lucide-react";
import {
    format,
    subDays,
    startOfMonth,
    eachDayOfInterval,
    isSameDay,
    parseISO,
    differenceInYears,
    subMonths,
    eachMonthOfInterval,
    isSameMonth,
    differenceInDays,
} from "date-fns";
// import { useState } from "react"; // Removed as it's now at the top
import DatePicker, { registerLocale } from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { ptBR } from "date-fns/locale";

registerLocale("pt-BR", ptBR);

// --- Types ---
interface ChartData {
    name: string;
    value: number;
}

// --- Components ---

function MetricCard({
    title,
    value,
    change,
    loading,
}: {
    title: string;
    value: string | number;
    change?: { value: number; label: string; trend: "up" | "down" | "neutral" };
    loading?: boolean;
}) {
    if (loading) {
        return <MetricCardSkeleton />;
    }

    return (
        <Card className="shadow-sm border-border/60">
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{title}</p>
                    {change && change.value > 0 && change.trend !== "neutral" && (
                        <div className={`flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${change.trend === "up"
                            ? "bg-green-600 text-white dark:bg-green-600"
                            : change.trend === "down"
                                ? "bg-red-600 text-white dark:bg-red-600"
                                : "bg-secondary text-secondary-foreground"
                            }`}>
                            {change.trend === "up" ? "+" : change.trend === "down" ? "-" : ""}
                            {change.value}%
                        </div>
                    )}
                </div>
                <div className="mt-3">
                    <div>
                        <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
                        {change && change.value > 0 && change.trend !== "neutral" && (
                            <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                                {change.trend === "up" ? (
                                    <TrendingUp className="w-3 h-3 text-green-600" />
                                ) : change.trend === "down" ? (
                                    <TrendingDown className="w-3 h-3 text-red-600" />
                                ) : null}
                                <span className={change.trend === "up" ? "text-green-600" : "text-red-600"}>
                                    {change.trend === "up" ? "Crescimento" : "Queda"}
                                </span>
                                {change.label && <span className="opacity-80">{change.label}</span>}
                            </p>
                        )}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

export function Dashboard() {
    const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
        subDays(new Date(), 30),
        new Date(),
    ]);
    const [startDate, endDate] = dateRange;

    // React Query hooks - dados são cacheados e compartilhados
    const { data: visitors = [], isLoading: loadingMetrics } = useDashboardMetrics();
    const { data: recentVisitors = [], isLoading: loadingRecent } = useDashboardRecent();
    const { planId } = useSubscription();

    const loading = loadingMetrics || loadingRecent;
    const isOnePlan = planId === 'one';

    // --- Metrics Calculations ---
    const metrics = useMemo(() => {
        if (!startDate || !endDate) return { total: 0, currentPeriod: 0, growth: 0, weeklyAvg: 0, retentionRate: 0 };

        const start = startDate;
        const end = endDate;
        const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;

        const previousStart = subDays(start, daysDiff);
        const previousEnd = subDays(end, daysDiff);

        const total = visitors.length;

        const currentPeriodCount = visitors.filter((v: any) => {
            try {
                if (!v.created_at) return false;
                const d = new Date(v.created_at);
                return d >= start && d <= end;
            } catch { return false; }
        }).length;

        const previousPeriodCount = visitors.filter((v: any) => {
            try {
                if (!v.created_at) return false;
                const d = new Date(v.created_at);
                return d >= previousStart && d <= previousEnd;
            } catch { return false; }
        }).length;

        const growth = previousPeriodCount > 0
            ? Math.round(((currentPeriodCount - previousPeriodCount) / previousPeriodCount) * 100)
            : currentPeriodCount > 0 ? 100 : 0;

        const weeks = Math.max(1, daysDiff / 7);
        const weeklyAvg = Math.round(currentPeriodCount / weeks);

        // Cálculo da Taxa de Retenção (Visitantes Recorrentes / Total de Visitantes Únicos)
        const visitorIdentities = new Set();
        const recurringIdentities = new Set();
        const seenIdentities = new Set();

        visitors.forEach((v: any) => {
            const email = v.responses?.email || v.responses?.field_email || v.responses?.Email;
            const phone = v.responses?.phone || v.responses?.field_phone || v.responses?.Telefone;
            const identity = email || phone || v.id; // Fallback para ID se não houver email/telefone

            if (seenIdentities.has(identity)) {
                recurringIdentities.add(identity);
            } else {
                seenIdentities.add(identity);
            }
            visitorIdentities.add(identity);
        });

        const retentionRate = visitorIdentities.size > 0
            ? Math.round((recurringIdentities.size / visitorIdentities.size) * 100)
            : 0;

        return {
            total,
            currentPeriod: currentPeriodCount,
            growth,
            weeklyAvg,
            retentionRate,
        };
    }, [visitors, startDate, endDate]);

    // --- Chart Data ---
    const chartData = useMemo(() => {
        if (!startDate || !endDate) return [];

        const start = startDate;
        const end = endDate;
        let data: ChartData[] = [];

        try {
            const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

            if (daysDiff <= 90) {
                const interval = eachDayOfInterval({ start, end });
                data = interval.map((date) => {
                    const count = visitors.filter((v: any) => {
                        try {
                            if (!v.created_at) return false;
                            return isSameDay(parseISO(v.created_at), date);
                        } catch { return false; }
                    }).length;
                    return {
                        name: format(date, "dd/MM", { locale: ptBR }),
                        value: count,
                    };
                });
            } else {
                const interval = eachMonthOfInterval({ start, end });
                data = interval.map((date) => {
                    const count = visitors.filter((v: any) => {
                        try {
                            if (!v.created_at) return false;
                            return isSameMonth(parseISO(v.created_at), date);
                        } catch { return false; }
                    }).length;
                    return {
                        name: format(date, "MMM/yy", { locale: ptBR }),
                        value: count,
                    };
                });
            }
        } catch (error) {
            console.error("Error generating chart data:", error);
        }

        return data;
    }, [visitors, startDate, endDate]);

    const calculateAge = (birthdate: string) => {
        if (!birthdate) return "-";
        try {
            const date = parseISO(birthdate);
            if (isNaN(date.getTime())) return "-";
            return differenceInYears(new Date(), date);
        } catch {
            return "-";
        }
    };

    const formatDate = (dateString: string) => {
        try {
            if (!dateString) return "-";
            return format(parseISO(dateString), "dd/MM/yyyy", { locale: ptBR });
        } catch {
            return "-";
        }
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Page Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/40 pb-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">Dashboard</h1>
                    <p className="text-muted-foreground mt-1">
                        Visão geral do crescimento da sua igreja.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <DatePicker
                                selectsRange={true}
                                startDate={startDate}
                                endDate={endDate}
                                onChange={(update) => {
                                    setDateRange(update);
                                }}
                                locale="pt-BR"
                                dateFormat="dd 'de' MMM, yyyy"
                                className="flex h-9 w-[300px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
                                isClearable={false}
                                customInput={
                                    <button className="flex items-center w-[300px] h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm hover:bg-accent hover:text-accent-foreground text-left font-normal">
                                        <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                                        {startDate ? (
                                            endDate ? (
                                                <>
                                                    {format(startDate, "dd 'de' MMM, yyyy", { locale: ptBR })} -{" "}
                                                    {format(endDate, "dd 'de' MMM, yyyy", { locale: ptBR })}
                                                </>
                                            ) : (
                                                format(startDate, "dd 'de' MMM, yyyy", { locale: ptBR })
                                            )
                                        ) : (
                                            <span className="text-muted-foreground">Selecione uma data</span>
                                        )}
                                    </button>
                                }
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total de Visitantes"
                    value={metrics.total}
                    loading={loading}
                />
                <MetricCard
                    title="Visitantes no Período"
                    value={metrics.currentPeriod}
                    loading={loading}
                    change={{
                        value: Math.abs(metrics.growth),
                        label: "vs prev. período",
                        trend: metrics.growth >= 0 ? (metrics.growth === 0 ? "neutral" : "up") : "down",
                    }}
                />
                <MetricCard
                    title="Média Semanal"
                    value={metrics.weeklyAvg}
                    loading={loading}
                    change={{
                        value: Math.abs(metrics.growth), // A média semanal segue o crescimento do período
                        label: "no período",
                        trend: metrics.growth >= 0 ? (metrics.growth === 0 ? "neutral" : "up") : "down",
                    }}
                />
                <MetricCard
                    title="Taxa de Retenção"
                    value={`${metrics.retentionRate}%`}
                    loading={loading}
                />
            </div>

            {/* Chart Section */}
            <Card className="col-span-3 shadow-sm border-border/60">
                <CardHeader className="flex flex-row items-center justify-between pb-8">
                    <div className="space-y-1">
                        <CardTitle className="text-xl font-bold">Total de Visitantes</CardTitle>
                        <p className="text-sm text-muted-foreground">Crescimento nos últimos meses</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setDateRange([subDays(new Date(), 30), new Date()])}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${startDate && endDate &&
                                differenceInDays(endDate, startDate) === 30
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            30 dias
                        </button>
                        <button
                            onClick={() => setDateRange([subDays(new Date(), 7), new Date()])}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${startDate && endDate &&
                                differenceInDays(endDate, startDate) === 7
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            7 dias
                        </button>
                        <button
                            onClick={() => setDateRange([startOfMonth(subMonths(new Date(), 11)), new Date()])}
                            className={`px-3 py-1 text-sm font-medium rounded-md transition-colors ${startDate && endDate &&
                                differenceInYears(endDate, startDate) >= 1
                                ? "bg-secondary text-foreground"
                                : "text-muted-foreground hover:text-foreground"
                                }`}
                        >
                            Ano
                        </button>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="h-[350px] w-full">
                        {loading ? (
                            <ChartSkeleton />
                        ) : (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart
                                    data={chartData}
                                    margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                                >
                                    <defs>
                                        <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                                            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                                        </linearGradient>
                                    </defs>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                                    <XAxis
                                        dataKey="name"
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                        dy={10}
                                    />
                                    <YAxis
                                        axisLine={false}
                                        tickLine={false}
                                        tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                    />
                                    <Tooltip
                                        contentStyle={{
                                            backgroundColor: "hsl(var(--popover))",
                                            border: "1px solid hsl(var(--border))",
                                            borderRadius: "8px",
                                            boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                                        }}
                                        itemStyle={{ color: "hsl(var(--foreground))", fontWeight: 600 }}
                                        cursor={{ stroke: "hsl(var(--primary))", strokeWidth: 1 }}
                                    />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke="hsl(var(--primary))"
                                        strokeWidth={3}
                                        fillOpacity={1}
                                        fill="url(#colorValue)"
                                        activeDot={{ r: 6, strokeWidth: 0, fill: "hsl(var(--primary))" }}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Recent Visitors List */}
            <Card className="shadow-sm border-border/60">
                <CardHeader>
                    <CardTitle className="text-xl font-bold">Últimos Visitantes</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-border/60">
                                <TableHead className="w-[50px]"></TableHead>
                                <TableHead>Nome</TableHead>
                                <TableHead>Idade</TableHead>
                                <TableHead>Gênero</TableHead>
                                {!isOnePlan && <TableHead>Filial</TableHead>}
                                <TableHead className="text-right">Data</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i} className="border-b border-border/40">
                                        <TableCell><TableRowSkeleton columns={1} /></TableCell>
                                        <TableCell><div className="h-4 w-32 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-8 bg-muted animate-pulse rounded" /></TableCell>
                                        <TableCell><div className="h-4 w-16 bg-muted animate-pulse rounded" /></TableCell>
                                        {!isOnePlan && <TableCell><div className="h-4 w-24 bg-muted animate-pulse rounded" /></TableCell>}
                                        <TableCell><div className="h-4 w-20 bg-muted animate-pulse rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : recentVisitors.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={isOnePlan ? 5 : 6} className="text-center py-8 text-muted-foreground">
                                        Nenhum visitante registrado ainda.
                                    </TableCell>
                                </TableRow>
                            ) : (
                                recentVisitors.map((visitor: any) => (
                                    <TableRow key={visitor.id} className="hover:bg-muted/30 border-b border-border/40 transition-colors">
                                        <TableCell>
                                            <div className="w-2 h-2 rounded-full bg-green-500" />
                                        </TableCell>
                                        <TableCell className="font-medium text-foreground">
                                            {visitor.responses["field_name"] || "-"}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {calculateAge(visitor.responses["field_birthdate"])}
                                        </TableCell>
                                        <TableCell className="text-muted-foreground">
                                            {visitor.responses["field_gender"] || "-"}
                                        </TableCell>
                                        {!isOnePlan && (
                                            <TableCell>
                                                {visitor.branches?.name ? (
                                                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-secondary text-secondary-foreground">
                                                        {visitor.branches.name}
                                                    </span>
                                                ) : (
                                                    <span className="text-muted-foreground italic text-xs">Sede</span>
                                                )}
                                            </TableCell>
                                        )}
                                        <TableCell className="text-right text-muted-foreground font-mono text-xs">
                                            {formatDate(visitor.created_at)}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
