import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface PageLoadingProps {
    message?: string;
    className?: string;
    variant?: "spinner" | "dots" | "pulse";
}

export function PageLoading({
    message = "Carregando...",
    className,
    variant = "spinner",
}: PageLoadingProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center min-h-[400px] gap-4",
                "animate-in fade-in duration-300",
                className
            )}
        >
            {variant === "spinner" && (
                <Loader2 className="h-8 w-8 animate-spin text-primary/60" />
            )}

            {variant === "dots" && (
                <div className="flex gap-1">
                    {[0, 1, 2].map((i) => (
                        <div
                            key={i}
                            className="h-2 w-2 rounded-full bg-primary/60 animate-bounce"
                            style={{ animationDelay: `${i * 150}ms` }}
                        />
                    ))}
                </div>
            )}

            {variant === "pulse" && (
                <div className="h-12 w-12 rounded-full bg-primary/20 animate-pulse" />
            )}

            {message && (
                <p className="text-sm text-muted-foreground">{message}</p>
            )}
        </div>
    );
}

// Full page loading overlay - usado para transições
export function PageTransition({
    isVisible,
    children,
}: {
    isVisible: boolean;
    children: React.ReactNode;
}) {
    return (
        <div
            className={cn(
                "transition-all duration-300 ease-out",
                isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-1"
            )}
        >
            {children}
        </div>
    );
}
