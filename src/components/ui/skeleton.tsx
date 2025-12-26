import { cn } from "@/lib/utils";

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-pulse rounded-md bg-muted/60",
                className
            )}
            {...props}
        />
    );
}

// Skeleton específico para Cards de métricas
function MetricCardSkeleton() {
    return (
        <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="flex items-center justify-between pb-2">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-6 w-12 rounded-full" />
            </div>
            <div className="mt-3 space-y-2">
                <Skeleton className="h-8 w-20" />
                <Skeleton className="h-3 w-32" />
            </div>
        </div>
    );
}

// Skeleton para linhas de tabela
function TableRowSkeleton({ columns = 5 }: { columns?: number }) {
    return (
        <div className="flex items-center gap-4 py-4 border-b border-border/40">
            {Array.from({ length: columns }).map((_, i) => (
                <Skeleton
                    key={i}
                    className={cn(
                        "h-4",
                        i === 0 ? "w-8" : i === 1 ? "w-32" : "w-20"
                    )}
                />
            ))}
        </div>
    );
}

// Skeleton para Chart
function ChartSkeleton() {
    return (
        <div className="h-[350px] w-full flex items-end justify-between gap-2 p-4">
            {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton
                    key={i}
                    className="flex-1 rounded-t-sm"
                    style={{
                        height: `${Math.random() * 60 + 20}%`,
                        animationDelay: `${i * 50}ms`,
                    }}
                />
            ))}
        </div>
    );
}

// Skeleton para Page completa
function PageSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>

            {/* Content */}
            <div className="space-y-4">
                <Skeleton className="h-64 w-full rounded-lg" />
                <div className="grid grid-cols-3 gap-4">
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                    <Skeleton className="h-32 rounded-lg" />
                </div>
            </div>
        </div>
    );
}

// Card Skeleton genérico
function CardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("rounded-lg border bg-card p-6 shadow-sm space-y-4", className)}>
            <div className="space-y-2">
                <Skeleton className="h-5 w-32" />
                <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-40 w-full rounded-md" />
        </div>
    );
}

// Kanban Column Skeleton
function KanbanColumnSkeleton() {
    return (
        <div className="flex-shrink-0 w-72 bg-card rounded-lg border p-3 space-y-3">
            <div className="flex items-center justify-between">
                <Skeleton className="h-5 w-24" />
                <Skeleton className="h-5 w-6 rounded-full" />
            </div>
            {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="bg-background rounded-lg border p-3 space-y-2">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="h-3 w-20" />
                </div>
            ))}
        </div>
    );
}

// Form Field Skeleton - para inputs de formulário
function FormFieldSkeleton() {
    return (
        <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
    );
}

// Settings Page Skeleton
function SettingsPageSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-72" />
            </div>

            {/* Card */}
            <div className="rounded-lg border bg-card p-6 space-y-6">
                {/* Logo section */}
                <div className="flex items-center gap-6">
                    <Skeleton className="h-24 w-24 rounded-lg" />
                    <div className="space-y-2">
                        <Skeleton className="h-5 w-32" />
                        <Skeleton className="h-4 w-48" />
                        <Skeleton className="h-9 w-32 rounded-md" />
                    </div>
                </div>

                {/* Form fields */}
                <div className="grid gap-4 md:grid-cols-2">
                    <div className="md:col-span-2">
                        <FormFieldSkeleton />
                    </div>
                    <FormFieldSkeleton />
                    <FormFieldSkeleton />
                    <div className="md:col-span-2">
                        <FormFieldSkeleton />
                    </div>
                </div>

                {/* Button */}
                <div className="flex justify-end">
                    <Skeleton className="h-10 w-40 rounded-md" />
                </div>
            </div>
        </div>
    );
}

// WhatsApp Settings Skeleton
function WhatsAppSettingsSkeleton() {
    return (
        <div className="space-y-8 animate-in fade-in duration-300">
            {/* Header */}
            <div className="space-y-2">
                <Skeleton className="h-9 w-64" />
                <Skeleton className="h-4 w-96 max-w-full" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Tabs & Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Tabs Header */}
                    <div className="flex gap-1 bg-muted p-1 rounded-lg w-full">
                        <Skeleton className="h-9 flex-1 rounded-md" />
                        <Skeleton className="h-9 flex-1 rounded-md" />
                    </div>

                    {/* Main Card Content */}
                    <div className="rounded-lg border bg-card p-6 space-y-8">
                        {/* Summary Section */}
                        <div className="grid gap-4 md:grid-cols-3">
                            <Skeleton className="h-32 rounded-lg" />
                            <Skeleton className="h-32 rounded-lg" />
                            <Skeleton className="h-32 rounded-lg" />
                        </div>

                        {/* Tip Section */}
                        <Skeleton className="h-16 w-full rounded-lg" />

                        {/* Form-like area (optional, if integration tab) */}
                        <div className="space-y-4 pt-4 border-t">
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-32" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column: Connection Card */}
                <div className="lg:col-span-1">
                    <div className="rounded-lg border bg-card overflow-hidden">
                        <div className="bg-muted/50 p-4 border-b">
                            <div className="flex justify-between items-center">
                                <Skeleton className="h-5 w-32" />
                                <Skeleton className="h-6 w-20 rounded-full" />
                            </div>
                        </div>
                        <div className="p-6 flex flex-col items-center space-y-6">
                            <Skeleton className="h-48 w-48 rounded-xl" />
                            <Skeleton className="h-10 w-full rounded-md" />
                            <Skeleton className="h-4 w-full" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Automation List Skeleton
function AutomationListSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-96 max-w-full" />
                </div>
                <Skeleton className="h-10 w-40 rounded-md" />
            </div>

            <div className="grid gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="rounded-lg border bg-card p-6 shadow-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-6 w-48" />
                                    <Skeleton className="h-5 w-16 rounded-full" />
                                </div>
                                <Skeleton className="h-4 w-32" />
                            </div>
                            <div className="flex items-center gap-2">
                                <Skeleton className="h-6 w-24 rounded-full" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </div>
                        <div className="mt-4 pt-4 border-t">
                            <Skeleton className="h-8 w-64 rounded-lg" />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

// Automation Builder Skeleton
function AutomationBuilderSkeleton() {
    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <div className="flex items-center gap-2">
                        <Skeleton className="h-8 w-8 rounded-md" />
                        <Skeleton className="h-8 w-48" />
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <Skeleton className="h-8 w-24" />
                    <Skeleton className="h-10 w-24 rounded-md" />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Left Column */}
                <div className="space-y-6">
                    <div className="rounded-lg border bg-card p-6 space-y-4">
                        <Skeleton className="h-6 w-40" />
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                    <div className="rounded-lg border bg-card p-6 space-y-4">
                        <div className="space-y-1">
                            <Skeleton className="h-6 w-32" />
                            <Skeleton className="h-4 w-48" />
                        </div>
                        <div className="space-y-2">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-10 w-full" />
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <Skeleton className="h-7 w-24" />
                        <div className="flex gap-2">
                            <Skeleton className="h-8 w-24 rounded-md" />
                            <Skeleton className="h-8 w-24 rounded-md" />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div className="rounded-lg border bg-card p-6 space-y-4">
                            <div className="flex justify-between">
                                <Skeleton className="h-6 w-32" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                            <div className="space-y-2">
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-10 w-full" />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export {
    Skeleton,
    MetricCardSkeleton,
    TableRowSkeleton,
    ChartSkeleton,
    PageSkeleton,
    CardSkeleton,
    KanbanColumnSkeleton,
    FormFieldSkeleton,
    SettingsPageSkeleton,
    WhatsAppSettingsSkeleton,
    AutomationListSkeleton,
    AutomationBuilderSkeleton,
};
