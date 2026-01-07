import { useState, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Home,
    Users,
    Building2,
    HelpCircle,
    User as UserIcon,
    LogOut,
    ChevronRight,
    Zap,
    HeartHandshake,
    Menu
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { CancelSubscriptionDialog } from "@/components/subscription/CancelSubscriptionDialog";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useAuth } from "@/hooks/useAuth";
import { useSidebar } from "@/contexts/SidebarContext";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip";

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    activeMatches?: string[];
}

const navItems: NavItem[] = [
    {
        title: "Dashboard",
        href: "/dashboard",
        icon: Home
    },
    {
        title: "Pessoas",
        href: "/visitantes/todos",
        icon: Users,
        activeMatches: ['/visitantes', '/discipuladores', '/pessoas']
    },
    {
        title: "Engajamento",
        href: "/formularios",
        icon: HeartHandshake,
        activeMatches: ['/formularios', '/engajamento/fluxos', '/engajamento/tags']
    },
    {
        title: "Automações",
        href: "/automacoes",
        icon: Zap,
        activeMatches: ['/automacoes', '/whatsapp']
    },
    {
        title: "Minha Igreja",
        href: "/configuracoes",
        icon: Building2,
        activeMatches: ['/configuracoes', '/filiais']
    },
];

export function Sidebar() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const { isCollapsed, toggleCollapsed } = useSidebar();
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const { subscriptionStatus, trialEndsAt } = useSubscription();

    const fullName = user?.full_name || 'Usuário';
    const initials = fullName
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    const trialInfo = useMemo(() => {
        if (subscriptionStatus !== 'trialing' || !trialEndsAt) return null;

        const end = parseISO(trialEndsAt);
        const now = new Date();
        const daysLeft = Math.max(0, differenceInDays(end, now));
        const totalDays = 7;
        const progress = Math.min(100, Math.max(0, ((totalDays - daysLeft) / totalDays) * 100));

        return { daysLeft, progress };
    }, [subscriptionStatus, trialEndsAt]);

    const handleLogout = async () => {
        await signOut();
    };

    function isItemActive(item: NavItem) {
        if (location.pathname === item.href) return true;
        if (item.activeMatches) {
            return item.activeMatches.some(match => location.pathname.startsWith(match));
        }
        return item.href !== '/dashboard' && location.pathname.startsWith(item.href);
    }

    // Calculate progress percentage for circular progress
    const progressPercentage = trialInfo ? Math.round((1 - trialInfo.daysLeft / 7) * 100) : 0;
    const circumference = 2 * Math.PI * 18;
    const strokeDashoffset = circumference - (progressPercentage / 100) * circumference;

    return (
        <TooltipProvider delayDuration={0}>
            <aside
                className={cn(
                    "fixed left-0 top-0 h-screen bg-zinc-950 flex flex-col z-50 font-sans p-4 transition-all duration-300 ease-in-out",
                    isCollapsed ? "w-[88px]" : "w-72"
                )}
            >
                {/* Main Container with rounded corners - Payflow style */}
                <div className="flex-1 flex flex-col bg-zinc-900 rounded-3xl overflow-hidden">
                    {/* Header */}
                    <div className={cn(
                        "py-5 flex items-center transition-all duration-300",
                        isCollapsed ? "px-4 justify-center" : "px-6 justify-between"
                    )}>
                        <div className={cn(
                            "flex items-center gap-3 transition-all duration-300",
                            isCollapsed && "gap-0"
                        )}>
                            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center shrink-0">
                                <span className="text-zinc-900 font-bold text-lg">✦</span>
                            </div>
                            <span className={cn(
                                "text-lg font-semibold tracking-tight text-white transition-all duration-300 overflow-hidden whitespace-nowrap",
                                isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                            )}>
                                churchfy
                            </span>
                        </div>
                        <button
                            onClick={toggleCollapsed}
                            className={cn(
                                "w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white transition-all duration-300 hover:bg-white/10 rounded-lg",
                                isCollapsed && "absolute -right-3 top-6 bg-zinc-800 border border-zinc-700 shadow-lg"
                            )}
                        >
                            {isCollapsed ? (
                                <ChevronRight className="w-4 h-4" strokeWidth={2} />
                            ) : (
                                <Menu className="w-5 h-5" strokeWidth={1.5} />
                            )}
                        </button>
                    </div>

                    {/* Navigation */}
                    <div className={cn(
                        "flex-1 py-2 space-y-1 transition-all duration-300",
                        isCollapsed ? "px-2" : "px-3"
                    )}>
                        {navItems.map((item) => {
                            const isActive = isItemActive(item);
                            const Icon = item.icon;

                            const linkContent = (
                                <Link
                                    key={item.title}
                                    to={item.href}
                                    className={cn(
                                        "flex items-center gap-3 rounded-2xl text-sm font-medium transition-all duration-200 group",
                                        isCollapsed ? "px-2 py-2 justify-center" : "px-4 py-3",
                                        isActive
                                            ? "bg-zinc-800 text-white"
                                            : "text-zinc-400 hover:text-white hover:bg-zinc-800/50"
                                    )}
                                >
                                    <div className={cn(
                                        "rounded-xl flex items-center justify-center transition-colors duration-200 shrink-0",
                                        isCollapsed ? "w-10 h-10" : "w-8 h-8",
                                        isActive
                                            ? "bg-white text-zinc-900"
                                            : "bg-zinc-800 text-zinc-400 group-hover:bg-zinc-700 group-hover:text-zinc-300"
                                    )}>
                                        <Icon className="w-4 h-4" strokeWidth={2} />
                                    </div>
                                    <span className={cn(
                                        "transition-all duration-300 overflow-hidden whitespace-nowrap",
                                        isCollapsed ? "w-0 opacity-0" : "w-auto opacity-100"
                                    )}>
                                        {item.title}
                                    </span>
                                </Link>
                            );

                            if (isCollapsed) {
                                return (
                                    <Tooltip key={item.title}>
                                        <TooltipTrigger asChild>
                                            {linkContent}
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                                            {item.title}
                                        </TooltipContent>
                                    </Tooltip>
                                );
                            }

                            return linkContent;
                        })}
                    </div>

                    {/* Divider line with gradient fade */}
                    {!isCollapsed && (
                        <div className="mx-6">
                            <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
                        </div>
                    )}

                    {/* Add Section Area - Glassmorphism style */}
                    <div className={cn(
                        "p-3 transition-all duration-300",
                        isCollapsed && "p-2"
                    )}>
                        <div className={cn(
                            "rounded-2xl bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 transition-all duration-300",
                            isCollapsed ? "p-2" : "p-4"
                        )}>
                            {isCollapsed ? (
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Link
                                            to="/ajuda"
                                            className="flex items-center justify-center text-zinc-400 hover:text-white transition-colors"
                                        >
                                            <div className="w-10 h-10 rounded-xl bg-zinc-700/50 flex items-center justify-center hover:bg-zinc-700">
                                                <HelpCircle className="w-4 h-4" strokeWidth={2} />
                                            </div>
                                        </Link>
                                    </TooltipTrigger>
                                    <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                                        Ajuda & Suporte
                                    </TooltipContent>
                                </Tooltip>
                            ) : (
                                <Link
                                    to="/ajuda"
                                    className="flex items-center gap-3 text-zinc-400 hover:text-white transition-colors group"
                                >
                                    <div className="w-8 h-8 rounded-xl bg-zinc-700/50 flex items-center justify-center group-hover:bg-zinc-700">
                                        <HelpCircle className="w-4 h-4" strokeWidth={2} />
                                    </div>
                                    <span className="text-sm font-medium">Ajuda & Suporte</span>
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Floating Card - Profile/Trial */}
                <div className="mt-4">
                    <div className={cn(
                        "bg-white rounded-3xl shadow-xl shadow-black/20 transition-all duration-300",
                        isCollapsed ? "p-2" : "p-4"
                    )}>
                        {trialInfo ? (
                            /* Trial Card + User Profile */
                            isCollapsed ? (
                                <div className="space-y-2">
                                    {/* Trial Progress - Collapsed */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <div className="flex items-center justify-center">
                                                <div className="relative w-10 h-10">
                                                    <svg className="w-10 h-10 transform -rotate-90">
                                                        <circle cx="20" cy="20" r="15" stroke="#e5e7eb" strokeWidth="2.5" fill="none" />
                                                        <circle
                                                            cx="20"
                                                            cy="20"
                                                            r="15"
                                                            stroke="#18181b"
                                                            strokeWidth="2.5"
                                                            fill="none"
                                                            strokeLinecap="round"
                                                            strokeDasharray={2 * Math.PI * 15}
                                                            strokeDashoffset={(2 * Math.PI * 15) - (progressPercentage / 100) * (2 * Math.PI * 15)}
                                                            className="transition-all duration-500"
                                                        />
                                                    </svg>
                                                    <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold text-zinc-900">
                                                        {progressPercentage}%
                                                    </span>
                                                </div>
                                            </div>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                                            <div>
                                                <p className="font-semibold">Período de Teste</p>
                                                <p className="text-xs text-zinc-400">{trialInfo.daysLeft} dias restantes</p>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Divider */}
                                    <div className="h-px bg-zinc-200 mx-1" />

                                    {/* Minha Igreja - Collapsed */}
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <Link
                                                to="/configuracoes"
                                                className="flex items-center justify-center"
                                            >
                                                <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center hover:bg-zinc-200 transition-colors">
                                                    <Building2 className="w-5 h-5 text-zinc-600" />
                                                </div>
                                            </Link>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                                            Minha Igreja
                                        </TooltipContent>
                                    </Tooltip>

                                    {/* Divider */}
                                    <div className="h-px bg-zinc-200 mx-1" />

                                    {/* User Profile - Collapsed */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <button className="flex items-center justify-center w-full outline-none">
                                                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm">
                                                            {user?.avatar_url ? (
                                                                <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                                            ) : (
                                                                <span className="text-white font-bold text-sm">{initials}</span>
                                                            )}
                                                        </div>
                                                    </button>
                                                </TooltipTrigger>
                                                <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                                                    <div>
                                                        <p className="font-semibold">{fullName}</p>
                                                        <p className="text-xs text-zinc-400">Admin</p>
                                                    </div>
                                                </TooltipContent>
                                            </Tooltip>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" side="right" className="w-56 p-2 rounded-xl bg-white shadow-xl border-zinc-200" sideOffset={8}>
                                            <DropdownMenuItem asChild>
                                                <Link to="/perfil" className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-zinc-100">
                                                    <UserIcon className="w-4 h-4 text-zinc-500" />
                                                    <span>Meu Perfil</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <div className="h-px bg-zinc-100 my-1" />
                                            <DropdownMenuItem
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 cursor-pointer rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Sair da conta</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {/* Trial Progress Section */}
                                    <div className="flex items-center gap-3">
                                        <div className="relative w-12 h-12">
                                            <svg className="w-12 h-12 transform -rotate-90">
                                                <circle cx="24" cy="24" r="18" stroke="#e5e7eb" strokeWidth="3" fill="none" />
                                                <circle
                                                    cx="24"
                                                    cy="24"
                                                    r="18"
                                                    stroke="#18181b"
                                                    strokeWidth="3"
                                                    fill="none"
                                                    strokeLinecap="round"
                                                    strokeDasharray={circumference}
                                                    strokeDashoffset={strokeDashoffset}
                                                    className="transition-all duration-500"
                                                />
                                            </svg>
                                            <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-zinc-900">
                                                {progressPercentage}%
                                            </span>
                                        </div>
                                        <div className="flex-1">
                                            <h4 className="text-sm font-semibold text-zinc-900">Período de Teste</h4>
                                            <p className="text-xs text-zinc-500">{trialInfo.daysLeft} dias restantes</p>
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="w-full h-9 bg-zinc-100 border-0 text-zinc-900 font-medium rounded-xl hover:bg-zinc-200 text-xs"
                                        onClick={() => setCancelDialogOpen(true)}
                                    >
                                        Gerenciar Assinatura
                                    </Button>

                                    {/* Elegant Divider */}
                                    <div className="relative">
                                        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                                    </div>

                                    {/* Minha Igreja Link */}
                                    <Link
                                        to="/configuracoes"
                                        className="flex items-center gap-3 w-full p-1 -m-1 rounded-xl hover:bg-zinc-50 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-xl bg-zinc-100 flex items-center justify-center shrink-0 group-hover:bg-zinc-200 transition-colors">
                                            <Building2 className="w-5 h-5 text-zinc-600" />
                                        </div>
                                        <div className="flex-1 text-left min-w-0">
                                            <h3 className="font-semibold text-sm text-zinc-900">Minha Igreja</h3>
                                            <p className="text-xs text-zinc-500">Configurações</p>
                                        </div>
                                        <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                                    </Link>

                                    {/* Elegant Divider */}
                                    <div className="relative">
                                        <div className="h-px bg-gradient-to-r from-transparent via-zinc-200 to-transparent" />
                                    </div>

                                    {/* User Profile Section */}
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <button className="flex items-center gap-3 w-full outline-none group p-1 -m-1 rounded-xl hover:bg-zinc-50 transition-colors">
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-rose-400 to-rose-600 flex items-center justify-center overflow-hidden ring-2 ring-white shadow-sm shrink-0">
                                                    {user?.avatar_url ? (
                                                        <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-white font-bold text-sm">{initials}</span>
                                                    )}
                                                </div>
                                                <div className="flex-1 text-left min-w-0">
                                                    <h3 className="font-semibold text-sm text-zinc-900 truncate">{fullName}</h3>
                                                    <p className="text-xs text-zinc-500 truncate flex items-center gap-1">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                                        Admin
                                                    </p>
                                                </div>
                                                <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                                            </button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end" side="right" className="w-56 p-2 rounded-xl bg-white shadow-xl border-zinc-200" sideOffset={8}>
                                            <DropdownMenuItem asChild>
                                                <Link to="/perfil" className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-zinc-100">
                                                    <UserIcon className="w-4 h-4 text-zinc-500" />
                                                    <span>Meu Perfil</span>
                                                </Link>
                                            </DropdownMenuItem>
                                            <div className="h-px bg-zinc-100 my-1" />
                                            <DropdownMenuItem
                                                onClick={handleLogout}
                                                className="flex items-center gap-2 cursor-pointer rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                            >
                                                <LogOut className="w-4 h-4" />
                                                <span>Sair da conta</span>
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            )
                        ) : (
                            /* User Profile Card */
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    {isCollapsed ? (
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <button className="flex items-center justify-center w-full outline-none">
                                                    <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden">
                                                        {user?.avatar_url ? (
                                                            <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-zinc-600 font-bold text-sm">{initials}</span>
                                                        )}
                                                    </div>
                                                </button>
                                            </TooltipTrigger>
                                            <TooltipContent side="right" className="bg-zinc-800 text-white border-zinc-700">
                                                <div>
                                                    <p className="font-semibold">{fullName}</p>
                                                    <p className="text-xs text-zinc-400">{user?.email}</p>
                                                </div>
                                            </TooltipContent>
                                        </Tooltip>
                                    ) : (
                                        <button className="flex items-center gap-3 w-full outline-none group">
                                            <div className="w-10 h-10 rounded-full bg-zinc-100 flex items-center justify-center overflow-hidden shrink-0">
                                                {user?.avatar_url ? (
                                                    <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                                                ) : (
                                                    <span className="text-zinc-600 font-bold text-sm">{initials}</span>
                                                )}
                                            </div>
                                            <div className="flex-1 text-left min-w-0">
                                                <h3 className="font-semibold text-sm text-zinc-900 truncate">{fullName}</h3>
                                                <p className="text-xs text-zinc-500 truncate">{user?.email}</p>
                                            </div>
                                            <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:translate-x-0.5 transition-transform" />
                                        </button>
                                    )}
                                </DropdownMenuTrigger>

                                <DropdownMenuContent align="end" side="right" className="w-56 p-2 rounded-xl" sideOffset={8}>
                                    <DropdownMenuItem asChild>
                                        <Link to="/perfil" className="flex items-center gap-2 cursor-pointer rounded-lg p-2 hover:bg-zinc-100">
                                            <UserIcon className="w-4 h-4 text-zinc-500" />
                                            <span>Meu Perfil</span>
                                        </Link>
                                    </DropdownMenuItem>
                                    <div className="h-px bg-zinc-100 my-1" />
                                    <DropdownMenuItem
                                        onClick={handleLogout}
                                        className="flex items-center gap-2 cursor-pointer rounded-lg p-2 text-red-600 hover:bg-red-50 hover:text-red-700"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        <span>Sair da conta</span>
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                <CancelSubscriptionDialog
                    open={cancelDialogOpen}
                    onOpenChange={setCancelDialogOpen}
                />
            </aside>
        </TooltipProvider>
    );
}
