import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

interface VariableTextareaProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    variables?: { key: string; label: string; description?: string }[];
}

export function VariableTextarea({ value, onChange, placeholder, className, variables = [] }: VariableTextareaProps) {
    const [showSuggestions, setShowSuggestions] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Auto-resize logic
    useEffect(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;

        const adjustHeight = () => {
            textarea.style.height = 'auto';
            const newHeight = Math.max(100, textarea.scrollHeight);
            textarea.style.height = `${newHeight}px`;
            // Container grows with textarea
            if (containerRef.current) {
                containerRef.current.style.height = `${newHeight}px`;
            }
        };

        adjustHeight();
    }, [value]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const newValue = e.target.value;
        onChange(newValue);

        // Simple trigger detection
        const selectionEnd = e.target.selectionEnd;
        const textBeforeCursor = newValue.substring(0, selectionEnd);
        const lastAt = textBeforeCursor.lastIndexOf("@");

        if (lastAt !== -1) {
            const textAfterAt = textBeforeCursor.substring(lastAt + 1);
            if (!textAfterAt.includes(" ") && !textAfterAt.includes("\n")) {
                setShowSuggestions(true);
                return;
            }
        }
        setShowSuggestions(false);
    };

    const insertVariable = (variableKey: string) => {
        if (!textareaRef.current) return;

        const selectionEnd = textareaRef.current.selectionEnd;
        const text = value;
        const textBeforeCursor = text.substring(0, selectionEnd);
        const lastAt = textBeforeCursor.lastIndexOf("@");

        if (lastAt === -1) return;

        const newText = text.substring(0, lastAt) + variableKey + " " + text.substring(selectionEnd);
        onChange(newText);
        setShowSuggestions(false);

        // Focus back and set cursor
        setTimeout(() => {
            const newCursorPos = lastAt + variableKey.length + 1;
            if (textareaRef.current) {
                textareaRef.current.focus();
                textareaRef.current.setSelectionRange(newCursorPos, newCursorPos);
            }
        }, 0);
    };

    const renderHighlights = () => {
        const escapeHtml = (unsafe: string) => {
            return unsafe
                .replace(/&/g, "&amp;")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")
                .replace(/"/g, "&quot;")
                .replace(/'/g, "&#039;");
        };

        let html = escapeHtml(value);

        variables.forEach(v => {
            // Precise match for variable names to avoid partial coloring if needed, 
            // but simple regex is usually fine for @name
            const regex = new RegExp(`(${v.key})`, 'gi');
            html = html.replace(regex, '<span class="text-red-500 font-semibold bg-red-500/10 rounded-[2px] py-[1px]">$1</span>');
        });

        // Ensure trailing newlines render correctly in the backdrop div
        if (html.endsWith('\n')) {
            html += '<br/>';
        }

        return { __html: html };
    };

    // Shared styles for perfect alignment
    const typographyStyles = "font-sans text-sm leading-relaxed tracking-normal";
    const paddingStyles = "px-3 py-2";

    return (
        <div className={cn("relative w-full group isolate", className)}>
            {/* 
                Container for height matching. 
                We use a dedicated container to ensure backdrop and textarea share context.
             */}
            <div ref={containerRef} className="relative w-full min-h-[100px]">

                {/* Backdrop (Highlight Layer) */}
                <div
                    className={cn(
                        "absolute inset-0 z-0 whitespace-pre-wrap break-words overflow-hidden bg-transparent pointer-events-none",
                        "border border-transparent rounded-md", // Match borders
                        paddingStyles,
                        typographyStyles
                    )}
                    aria-hidden="true"
                >
                    <div
                        className="text-foreground/90 dark:text-foreground/90"
                        dangerouslySetInnerHTML={renderHighlights()}
                    />
                </div>

                {/* Textarea (Input Layer) */}
                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={handleInput}
                    style={{ caretColor: "hsl(var(--foreground))" }}
                    className={cn(
                        "absolute inset-0 z-10 block w-full h-full rounded-md border border-input bg-transparent shadow-sm",
                        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                        "resize-none overflow-hidden", // Disable scroll/resize to rely on auto-growth
                        "text-transparent selection:text-transparent selection:bg-blue-500/20 placeholder:text-muted-foreground",
                        paddingStyles,
                        typographyStyles
                    )}
                    placeholder={placeholder}
                    spellCheck={false}
                />
            </div>

            {/* Suggestions Popover */}
            {showSuggestions && (
                <div className="absolute left-0 top-full mt-1 w-56 rounded-md border bg-popover text-popover-foreground shadow-lg animate-in fade-in zoom-in-95 z-50">
                    <div className="p-1">
                        <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            Variáveis
                        </div>
                        {variables.map(v => (
                            <button
                                key={v.key}
                                onClick={() => insertVariable(v.key)}
                                className="relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none hover:bg-muted hover:text-accent-foreground transition-colors text-left"
                            >
                                <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border bg-background mr-2">
                                    <Sparkles className="h-3.5 w-3.5 text-primary" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-medium text-xs">{v.label}</span>
                                    <span className="text-[10px] text-muted-foreground">{v.key}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
