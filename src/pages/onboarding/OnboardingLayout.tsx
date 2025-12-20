import { Outlet } from "react-router-dom";

export function OnboardingLayout() {
    return (
        <div className="min-h-screen bg-muted/10 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-2xl mx-auto">
                {/* Simple Logo Header */}
                <div className="flex items-center justify-center mb-6">
                    <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center shadow-lg transition-transform hover:scale-105">
                        <span className="text-white font-bold text-2xl">C</span>
                    </div>
                </div>

                {/* Card Container: White background, standard border, subtle shadow */}
                <div className="bg-white dark:bg-card rounded-xl border border-border shadow-sm overflow-hidden relative">
                    <Outlet />
                </div>
            </div>
        </div>
    );
}
