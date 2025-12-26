import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { HubSidebar } from "./HubSidebar";
import { useLocation } from "react-router-dom";


import { Toaster } from "sonner";

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    const location = useLocation();

    return (
        <div className="min-h-screen bg-background">
            <HubSidebar />
            <Sidebar />

            {/* Main Content Area */}
            <main className="pl-[316px] min-h-screen">
                <div key={location.pathname} className="p-8 max-w-[1600px] mx-auto animate-page-enter">
                    {children}
                </div>
            </main>
            <Toaster />
        </div>
    );
}
