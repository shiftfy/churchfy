import { useState, useCallback, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import {
    Home,
    Users,
    MessageSquare,
    Building2,
    Settings,
    LogOut,
    FileText,
    HelpCircle,
    User as UserIcon,
    ChevronDown,
    ChevronRight,
    Clock,
    GitMerge
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { CancelSubscriptionDialog } from "@/components/subscription/CancelSubscriptionDialog";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { usePrefetch } from "@/hooks/useData";
import { useSubscription } from "@/hooks/useSubscription";

interface NavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    prefetchKey?: 'dashboard' | 'branches' | 'people';
    subItems?: { title: string; href: string; prefetchKey?: 'people'; }[];
}

const navItems: NavItem[] = [
    { title: "Dashboard", href: "/dashboard", icon: Home, prefetchKey: 'dashboard' },
    { title: "Formulários", href: "/formularios", icon: FileText },
    { title: "Pessoas", href: "/visitantes/todos", icon: Users, prefetchKey: 'people' },
    { title: "Fluxo", href: "/visitantes/fluxo", icon: GitMerge, prefetchKey: 'people' },
    { title: "Discipuladores", href: "/discipuladores", icon: UserIcon },
];

const secondaryItems: NavItem[] = [
    { title: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
    { title: "Inputs e Tags", href: "/configuracoes/tags-campos", icon: Settings },
    { title: "Filiais", href: "/filiais", icon: Building2, prefetchKey: 'branches' },
];

export function Sidebar() {
    const location = useLocation();
    const { user, signOut } = useAuth();
    const [openMenus, setOpenMenus] = useState<Record<string, boolean>>({});
    const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
    const { prefetchDashboard, prefetchBranches, prefetchPeople } = usePrefetch();
    const { planId, subscriptionStatus, trialEndsAt } = useSubscription();

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

    const toggleMenu = (title: string) => {
        setOpenMenus(prev => ({
            ...prev,
            [title]: !prev[title]
        }));
    };

    // Prefetch on hover for faster navigation
    const handleMouseEnter = useCallback((prefetchKey?: string) => {
        if (!prefetchKey) return;

        switch (prefetchKey) {
            case 'dashboard':
                prefetchDashboard();
                break;
            case 'branches':
                prefetchBranches();
                break;
            case 'people':
                prefetchPeople();
                break;
        }
    }, [prefetchDashboard, prefetchBranches, prefetchPeople]);

    return (
        <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-[#efefef] flex flex-col z-40 shadow-[inset_-12px_0_30px_-15px_rgba(0,0,0,0.08)]">

            {/* Header */}
            <div className="h-16 flex items-center px-6">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">C</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">Churchfy</span>
                </div>
            </div>

            {/* Premium Minha Igreja Button */}
            <div className="px-4 mb-2">
                <Link
                    to="/configuracoes"
                    className={cn(
                        "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 border",
                        location.pathname === "/configuracoes"
                            ? "bg-primary text-primary-foreground border-primary shadow-md"
                            : "bg-muted/50 border-border hover:bg-muted hover:border-primary/20 hover:shadow-sm"
                    )}
                >
                    <div className={cn(
                        "flex items-center justify-center w-7 h-7 rounded-md transition-colors duration-200",
                        location.pathname === "/configuracoes"
                            ? "bg-white/20"
                            : "bg-background"
                    )}>
                        <Building2 className={cn(
                            "w-4 h-4 transition-colors duration-200",
                            location.pathname === "/configuracoes"
                                ? "text-primary-foreground"
                                : "text-muted-foreground group-hover:text-primary"
                        )} />
                    </div>

                    <div className="flex flex-col leading-tight">
                        <span className="font-semibold">Minha Igreja</span>
                        <span className={cn(
                            "text-[10px] font-normal",
                            location.pathname === "/configuracoes"
                                ? "text-primary-foreground/70"
                                : "text-muted-foreground"
                        )}>Configurações</span>
                    </div>

                    <ChevronRight className={cn(
                        "w-4 h-4 ml-auto transition-all duration-200",
                        location.pathname === "/configuracoes"
                            ? "text-primary-foreground/70"
                            : "text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5"
                    )} />
                </Link>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4">
                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Principal
                </div>
                <nav className="space-y-1 mb-8">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href ||
                            (item.subItems && item.subItems.some(sub => location.pathname === sub.href));
                        // Menu dropdown só fica aberto se estiver em uma das sub-rotas específicas
                        const isInSubRoute = item.subItems && item.subItems.some(sub => location.pathname === sub.href);
                        const isOpen = isInSubRoute || (openMenus[item.title] && isInSubRoute);

                        if (item.subItems) {
                            return (
                                <div key={item.title} className="space-y-1">
                                    <Link
                                        to={item.href}
                                        onClick={() => toggleMenu(item.title)}
                                        onMouseEnter={() => handleMouseEnter(item.prefetchKey)}
                                        className={cn(
                                            "w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                            isActive
                                                ? "bg-secondary text-secondary-foreground"
                                                : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                        )}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Icon className="w-4 h-4" />
                                            <span>{item.title}</span>
                                        </div>
                                        {isOpen ? (
                                            <ChevronDown className="w-4 h-4" />
                                        ) : (
                                            <ChevronRight className="w-4 h-4" />
                                        )}
                                    </Link>

                                    {isOpen && (
                                        <div className="pl-10 space-y-1">
                                            {item.subItems.map((subItem) => {
                                                const isSubActive = location.pathname === subItem.href;
                                                return (
                                                    <Link
                                                        key={subItem.href}
                                                        to={subItem.href}
                                                        onMouseEnter={() => handleMouseEnter(subItem.prefetchKey)}
                                                        className={cn(
                                                            "block px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                                            isSubActive
                                                                ? "text-primary bg-primary/10"
                                                                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                                                        )}
                                                    >
                                                        {subItem.title}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            );
                        }

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onMouseEnter={() => handleMouseEnter(item.prefetchKey)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-secondary text-secondary-foreground"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>

                <div className="mb-2 px-2 text-xs font-medium text-muted-foreground">
                    Ajustes
                </div>
                <nav className="space-y-1">
                    {secondaryItems.filter(item => {
                        if (item.href === "/filiais" && planId === 'one') {
                            return false;
                        }
                        return true;
                    }).map((item) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;

                        return (
                            <Link
                                key={item.href}
                                to={item.href}
                                onMouseEnter={() => handleMouseEnter(item.prefetchKey)}
                                className={cn(
                                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                                    isActive
                                        ? "bg-secondary text-secondary-foreground"
                                        : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                <span>{item.title}</span>
                            </Link>
                        );
                    })}
                </nav>
            </div>

            {/* Trial Status - Minimal Design */}
            {trialInfo && (
                <div className="px-4 mb-2">
                    <div className="group rounded-xl border border-border/40 bg-muted/30 p-3 transition-colors duration-300 hover:border-border/60 hover:bg-muted/50">
                        {/* Header with icon */}
                        <div className="flex items-center gap-2 mb-1">
                            <div className="flex h-5 w-5 items-center justify-center rounded-md bg-primary/10 text-primary">
                                <Clock className="h-3 w-3" strokeWidth={2} />
                            </div>
                            <span className="text-[13px] font-medium text-foreground/80">Período de teste</span>
                        </div>

                        {/* Days remaining */}
                        <p className="text-[12px] text-muted-foreground mb-3 ml-7">{trialInfo.daysLeft} dias restantes</p>

                        {/* Progress bar with laser effect */}
                        <div className="h-1 w-full bg-border/50 rounded-full overflow-hidden mb-3">
                            <div
                                className="relative h-full bg-primary/50 rounded-full transition-all duration-500"
                                style={{ width: `${trialInfo.progress}%` }}
                            >
                                {/* Laser glow sweep */}
                                <div className="absolute inset-0 rounded-full overflow-hidden">
                                    <div
                                        className="absolute inset-y-0 w-8 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[laser_2.5s_ease-in-out_infinite]"
                                        style={{ left: '-2rem' }}
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="w-full h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                            onClick={() => setCancelDialogOpen(true)}
                        >
                            Cancelar assinatura
                        </Button>
                    </div>
                </div>
            )}

            <CancelSubscriptionDialog
                open={cancelDialogOpen}
                onOpenChange={setCancelDialogOpen}
            />

            {/* Help Section */}
            <div className="px-4 pb-4">
                <Link
                    to="/ajuda"
                    className={cn(
                        "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors border",
                        location.pathname === "/ajuda"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "border-border hover:border-primary/50 hover:bg-primary/5 text-foreground"
                    )}
                >
                    <HelpCircle className="w-4 h-4" />
                    <span>Ajuda</span>
                </Link>
            </div>

            {/* User Profile */}
            <div className="p-4">
                <div className="flex items-center justify-between gap-2">
                    <Link to="/perfil" className="flex items-center gap-3 px-2 py-1.5 hover:bg-secondary/50 rounded-md transition-colors cursor-pointer flex-1 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center overflow-hidden shrink-0">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="User" className="w-full h-full object-cover" />
                            ) : (
                                <UserIcon className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{user?.full_name || 'Usuário'}</p>
                            <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                    </Link>
                    <button
                        onClick={handleLogout}
                        className="p-2 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors shrink-0"
                        title="Sair"
                    >
                        <LogOut className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </aside>
    );
}
