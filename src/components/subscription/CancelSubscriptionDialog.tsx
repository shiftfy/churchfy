import { useState } from "react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

interface CancelSubscriptionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function CancelSubscriptionDialog({ open, onOpenChange }: CancelSubscriptionDialogProps) {
    const { signOut } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleCancel = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("Sessão expirada. Faça login novamente.");

            console.log("CancelSubscription: Invocando 'cancel-subscription'...");
            const { data, error } = await supabase.functions.invoke('cancel-subscription', {
                body: {},
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (error) {
                console.error("CancelSubscription: Erro retornado pelo invoke:", error);
                throw error;
            }

            if (data?.error) {
                console.error("CancelSubscription: Erro nos dados da função:", data.error);
                throw new Error(data.error);
            }

            toast.success("Assinatura cancelada com sucesso.");
            onOpenChange(false);

            // Logout and deactivate (using signOut handles logout, deactivation is implied by backend state change + logout)
            await signOut();

        } catch (error: any) {
            console.error("Error canceling subscription:", error);
            toast.error(error.message || "Erro ao cancelar assinatura. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Cancelar plano</DialogTitle>
                    <DialogDescription>
                        Tem certeza que deseja cancelar sua assinatura?
                        <br /><br />
                        Ao confirmar, seu período de testes será encerrado imediatamente, sua conta será desativada e você <strong>não será cobrado</strong>.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row items-center justify-between sm:justify-between gap-4 mt-4">
                    <Button
                        variant="ghost"
                        className="text-foreground hover:bg-transparent p-0 h-auto font-normal"
                        onClick={handleCancel}
                        disabled={loading}
                    >
                        {loading ? "Cancelando..." : "Cancelar plano"}
                    </Button>

                    <Button
                        variant="destructive"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        Continuar na Churchfy
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
