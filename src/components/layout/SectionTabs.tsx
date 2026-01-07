import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface TabItem {
    label: string;
    href: string;
}

interface SectionTabsProps {
    items: TabItem[];
    className?: string;
}

export function SectionTabs({ items, className }: SectionTabsProps) {
    const location = useLocation();

    return (
        <div className={cn("flex items-center gap-1 p-1 bg-zinc-100/80 rounded-full w-fit mb-8", className)}>
            {items.map((item) => {
                const isActive = location.pathname === item.href;

                return (
                    <Link
                        key={item.href}
                        to={item.href}
                        className={cn(
                            "relative px-4 py-1.5 rounded-full text-sm font-medium transition-colors z-10",
                            isActive
                                ? "text-zinc-900"
                                : "text-zinc-500 hover:text-zinc-600 hover:bg-zinc-200/50"
                        )}
                    >
                        {isActive && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-white rounded-full shadow-sm"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                                style={{ zIndex: -1 }}
                            />
                        )}
                        {item.label}
                    </Link>
                );
            })}
        </div>
    );
}
