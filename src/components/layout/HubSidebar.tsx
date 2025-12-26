import { Users, LayoutGrid, Settings, LogOut, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { Link } from "react-router-dom";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export function HubSidebar() {
    const { user, signOut } = useAuth();

    const handleLogout = async () => {
        await signOut();
    };

    // Extract first name for display
    const fullName = user?.full_name || 'Usuário';

    // Get initials for avatar fallback
    const initials = fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <aside className="fixed left-0 top-0 h-screen w-[60px] bg-[#2b354c] border-r border-white/5 flex flex-col items-center py-6 z-50">
            {/* Logo area */}
            <div className="mb-8 flex flex-col items-center">
                <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shadow-lg shadow-black/20 transform transition-transform hover:scale-105">
                    <span className="text-[#2b354c] font-bold text-lg">C</span>
                </div>
            </div>

            {/* Hub Services Menu */}
            <div className="flex flex-col gap-4 w-full px-2 items-center">

                {/* Persons Service (Active) - Connected Tab Style */}
                <div className="relative w-full flex justify-end">
                    <div className={cn(
                        "group flex items-center justify-center w-[68px] h-10 rounded-l-xl rounded-r-none cursor-pointer transition-all duration-200 mr-[-24px] z-10 hover:w-[72px]",
                        "bg-[#fcfcfc] text-[#2b354c] pr-6"
                    )}>
                        <Users className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                </div>

                {/* Other Services (Simulated) */}
                <div className="relative group px-1">
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl cursor-not-allowed transition-all duration-200",
                        "text-white/40 hover:text-white/60 hover:bg-white/5"
                    )}>
                        <LayoutGrid className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                </div>

                <div className="relative group px-1">
                    <div className={cn(
                        "flex items-center justify-center w-10 h-10 rounded-xl cursor-not-allowed transition-all duration-200",
                        "text-white/40 hover:text-white/60 hover:bg-white/5"
                    )}>
                        <Settings className="w-5 h-5 transition-transform duration-200 group-hover:scale-110" />
                    </div>
                </div>
            </div>

            {/* User Profile Area at Bottom */}
            <div className="mt-auto pb-0">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button className="relative group outline-none">
                            <div className="relative w-10 h-10 rounded-full border border-white/10 overflow-hidden transition-all duration-200 hover:border-white/30 hover:scale-105 active:scale-95">
                                {user?.avatar_url ? (
                                    <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-[#3b465c] flex items-center justify-center">
                                        <span className="text-white/80 font-medium text-xs">{initials}</span>
                                    </div>
                                )}
                            </div>

                            {/* Simple Online Dot */}
                            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-[#2b354c] flex items-center justify-center">
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            </div>
                        </button>
                    </DropdownMenuTrigger>

                    {/* Clean Minimalist Dropdown */}
                    <DropdownMenuContent
                        side="right"
                        align="end"
                        sideOffset={12}
                        className="w-60 ml-2 p-0 border-0 bg-transparent shadow-xl"
                    >
                        <div className="bg-[#2b354c] rounded-xl border border-white/10 overflow-hidden shadow-2xl shadow-black/40 ring-1 ring-white/5">

                            {/* Clean Header */}
                            <div className="p-3 flex items-center gap-3 border-b border-white/5">
                                <div className="w-9 h-9 rounded-full overflow-hidden bg-white/5 shrink-0 border border-white/10">
                                    {user?.avatar_url ? (
                                        <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                    ) : (
                                        <div className="w-full h-full flex items-center justify-center bg-white/10 text-white/50 text-xs font-medium">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <h3 className="text-white text-sm font-medium truncate leading-tight">
                                        {fullName}
                                    </h3>
                                    <p className="text-white/40 text-[10px] truncate mt-0.5 font-light tracking-wide">
                                        {user?.email}
                                    </p>
                                </div>
                            </div>

                            {/* Menu Items - Clean & Flat */}
                            <div className="p-1.5 flex flex-col gap-0.5">
                                <DropdownMenuItem asChild className="p-0 focus:bg-transparent focus:text-white outline-none ring-0 focus-visible:ring-0">
                                    <Link
                                        to="/perfil"
                                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-white focus:text-white hover:bg-white/10 focus:bg-white/10 transition-all duration-200 cursor-pointer group outline-none select-none hover:translate-x-1"
                                    >
                                        <UserIcon className="w-4 h-4 text-white/50 group-hover:text-white/90 group-focus:text-white/90 transition-colors group-hover:scale-110" />
                                        <span className="text-[13px] font-normal tracking-wide">Meu Perfil</span>
                                    </Link>
                                </DropdownMenuItem>

                                <DropdownMenuItem
                                    onClick={handleLogout}
                                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-white/70 hover:text-rose-300 focus:text-rose-300 hover:bg-rose-500/10 focus:bg-rose-500/10 transition-all duration-200 cursor-pointer group outline-none select-none hover:translate-x-1"
                                >
                                    <LogOut className="w-4 h-4 text-white/50 group-hover:text-rose-400 group-focus:text-rose-400 transition-colors group-hover:scale-110" />
                                    <span className="text-[13px] font-normal tracking-wide">Sair</span>
                                </DropdownMenuItem>
                            </div>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </aside>
    );
}
