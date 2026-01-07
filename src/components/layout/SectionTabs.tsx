import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface TabItem {
    label: string;
    href: string;
    icon?: LucideIcon;
}

interface SectionTabsProps {
    items: TabItem[];
    className?: string;
}

export function SectionTabs({ items, className }: SectionTabsProps) {
    const location = useLocation();

    return (
        <nav className={cn("flex items-center gap-1 mb-6", className)}>
            {items.map((item) => {
                const isActive = location.pathname === item.href;
                const Icon = item.icon;

                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "relative flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 group",
                            isActive
                                ? "bg-zinc-900 text-white shadow-sm"
                                : "text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100"
                        )}
                    >
                        {Icon && (
                            <div className={cn(
                                "w-7 h-7 rounded-lg flex items-center justify-center transition-colors duration-200 shrink-0",
                                isActive
                                    ? "bg-white/20 text-white"
                                    : "bg-zinc-100 text-zinc-500 group-hover:bg-zinc-200 group-hover:text-zinc-700"
                            )}>
                                <Icon className="w-4 h-4" strokeWidth={2} />
                            </div>
                        )}
                        <span>{item.label}</span>
                    </Link>
                );
            })}
        </nav>
    );
}
