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
};
