import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { useLocation } from "react-router-dom";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { Toaster } from "sonner";

interface AppLayoutProps {
    children: ReactNode;
}

function AppLayoutContent({ children }: AppLayoutProps) {
    const location = useLocation();
    const { isCollapsed } = useSidebar();

    return (
        <div className="min-h-screen bg-zinc-900">
            <Sidebar />

            {/* Main Content Area - with floating effect */}
            <main
                className={cn(
                    "min-h-screen bg-zinc-900 transition-all duration-300 ease-in-out",
                    isCollapsed ? "pl-[88px]" : "pl-72"
                )}
            >
                <div className="mt-4 min-h-[calc(100vh-1rem)] bg-background rounded-tl-3xl shadow-2xl">
                    <div key={location.pathname} className="p-8 max-w-[1600px] mx-auto animate-page-enter">
                        {children}
                    </div>
                </div>
            </main>
            <Toaster />
        </div>
    );
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <SidebarProvider>
            <AppLayoutContent>{children}</AppLayoutContent>
        </SidebarProvider>
    );
}
