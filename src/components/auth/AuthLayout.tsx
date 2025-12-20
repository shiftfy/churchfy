import type { ReactNode } from "react";
import { MessageSquareQuote } from "lucide-react";
import { cn } from "@/lib/utils";

interface AuthLayoutProps {
    children: ReactNode;
    testimonial?: {
        quote: string;
        author: string;
        role?: string;
    };
    contentClassName?: string;
}

export function AuthLayout({ children, testimonial, contentClassName }: AuthLayoutProps) {
    return (
        <div className="min-h-screen w-full lg:grid lg:grid-cols-2">
            {/* Left Column (Brand/Testimonial) - Hidden on mobile, visible on lg+ */}
            <div className="hidden lg:flex flex-col justify-between bg-zinc-50 p-10 dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-primary-foreground font-bold">C</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">Churchfy</span>
                </div>

                <div className="max-w-md mx-auto">
                    {testimonial ? (
                        <div className="space-y-4">
                            <MessageSquareQuote className="h-8 w-8 text-zinc-400" />
                            <blockquote className="text-2xl font-medium leading-tight text-zinc-900 dark:text-zinc-50">
                                "{testimonial.quote}"
                            </blockquote>
                            <div className="flex flex-col">
                                <cite className="text-sm font-semibold not-italic text-zinc-900 dark:text-zinc-50">
                                    {testimonial.author}
                                </cite>
                                {testimonial.role && (
                                    <span className="text-sm text-zinc-500">{testimonial.role}</span>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <h2 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                                Transforme a gestão da sua igreja hoje.
                            </h2>
                            <p className="text-zinc-500 dark:text-zinc-400">
                                Junte-se a milhares de líderes que estão modernizando seus ministérios com o Churchfy.
                            </p>
                        </div>
                    )}
                </div>

                <div className="text-sm text-zinc-500">
                    &copy; {new Date().getFullYear()} Churchfy. Todos os direitos reservados.
                </div>
            </div>

            {/* Right Column (Form) */}
            <div className="flex flex-col justify-center items-center p-6 bg-white min-h-screen lg:min-h-full">
                {/* Mobile Header (Brand) */}
                <div className="lg:hidden absolute top-6 left-6 flex items-center gap-2 text-zinc-900">
                    <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                        <span className="text-white font-bold">C</span>
                    </div>
                    <span className="text-xl font-bold tracking-tight">Churchfy</span>
                </div>

                <div className={cn("w-full max-w-[400px] animate-in fade-in slide-in-from-bottom-8 duration-500", contentClassName)}>
                    {children}
                </div>
            </div>
        </div>
    );
}
