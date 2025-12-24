import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { HubSidebar } from "./HubSidebar";


import { Toaster } from "sonner";

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            <HubSidebar />
            <Sidebar />

            {/* Main Content Area */}
            <main className="pl-[316px] min-h-screen">
                <div className="p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
            <Toaster />
        </div>
    );
}
