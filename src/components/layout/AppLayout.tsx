import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";


import { Toaster } from "sonner";

interface AppLayoutProps {
    children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
    return (
        <div className="min-h-screen bg-background">
            <Sidebar />

            {/* Main Content Area */}
            <main className="pl-64 min-h-screen">
                <div className="p-8 max-w-[1600px] mx-auto">
                    {children}
                </div>
            </main>
            <Toaster />
        </div>
    );
}
