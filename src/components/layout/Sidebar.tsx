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
    Clock
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
    {
        title: "Pessoas",
        href: "/visitantes/todos",
        icon: Users,
        prefetchKey: 'people',
        subItems: [
            { title: "Jornada", href: "/visitantes/fluxo", prefetchKey: 'people' },
            { title: "Todas as pessoas", href: "/visitantes/todos", prefetchKey: 'people' }
        ]
    },
    { title: "WhatsApp", href: "/whatsapp", icon: MessageSquare },
];

const secondaryItems: NavItem[] = [
    { title: "Minha Igreja", href: "/configuracoes", icon: Settings },
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
        <aside className="fixed left-0 top-0 h-screen w-64 bg-background border-r border-border flex flex-col z-40">
            {/* Header */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold text-sm">C</span>
                    </div>
                    <span className="font-bold text-lg tracking-tight">Churchfy</span>
                </div>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto py-6 px-4">
                <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
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

                <div className="mb-2 px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Igreja
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

            {/* Trial Status Widget */}
            {trialInfo && (
                <div className="px-4 mb-2">
                    <div className="rounded-lg border bg-card p-3 shadow-sm">
                        <div className="flex items-center gap-2 mb-2">
                            <Clock className="h-3 w-3 text-primary" />
                            <span className="text-xs font-semibold">Período de Teste</span>
                        </div>

                        <div className="space-y-1 mb-2">
                            <div className="flex justify-between text-[10px] text-muted-foreground">
                                <span>Progresso</span>
                                <span>Restam {trialInfo.daysLeft} dias</span>
                            </div>
                            <div className="h-1.5 w-full bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${trialInfo.progress}%` }}
                                />
                            </div>
                        </div>

                        <p className="text-[10px] text-muted-foreground mb-3 leading-tight">
                            Após 7 dias a assinatura será feita automaticamente.
                        </p>

                        <Button
                            variant="outline"
                            size="sm"
                            className="w-full h-7 text-xs border-destructive/20 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setCancelDialogOpen(true)}
                        >
                            Cancelar plano
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
            <div className="p-4 border-t border-border/50">
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
