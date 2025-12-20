import { Bell, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface HeaderProps {
    className?: string;
}

export function Header({ className }: HeaderProps) {
    return (
        <header
            className={cn(
                "fixed top-0 right-0 left-0 md:left-64 h-16 bg-white border-b border-border z-30 transition-all duration-300",
                className
            )}
        >
            <div className="h-full px-6 flex items-center justify-end gap-4">
                {/* Right Side - Notifications & User */}
                <div className="flex items-center gap-4">
                    {/* Notifications */}
                    <button className="relative p-2 rounded-md hover:bg-muted transition-smooth">
                        <Bell className="w-5 h-5 text-muted-foreground" />
                        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
                    </button>

                    {/* User Menu */}
                    <button className="flex items-center gap-3 p-1.5 rounded-md hover:bg-muted transition-smooth">
                        <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                            <User className="w-4 h-4 text-muted-foreground" />
                        </div>
                        <div className="hidden md:block text-left">
                            <p className="text-sm font-medium text-foreground">Admin</p>
                            <p className="text-xs text-muted-foreground">Igreja Principal</p>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
}
