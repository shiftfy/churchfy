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

interface DeleteAccountDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
    const { signOut } = useAuth();
    const [loading, setLoading] = useState(false);

    const handleDeleteAccount = async () => {
        try {
            setLoading(true);
            const { data: { session } } = await supabase.auth.getSession();
            const token = session?.access_token;

            if (!token) throw new Error("Sessão expirada. Faça login novamente.");

            const { data, error } = await supabase.functions.invoke('purge-organization', {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success("Sua conta e todos os dados foram excluídos permanentemente.");
            onOpenChange(false);

            // Logout
            await signOut();

        } catch (error: any) {
            console.error("Error deleting account:", error);
            toast.error(error.message || "Erro ao excluir conta. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-destructive">Excluir Conta Permanentemente</DialogTitle>
                    <DialogDescription className="pt-2">
                        Esta ação é irreversível. Ao confirmar, sua organização, todos os usuários associados,
                        contatos, fluxos e configurações serão <strong>apagados e excluídos definitivamente</strong> de nossos servidores.
                        Sua assinatura no Stripe também será cancelada imediatamente.
                    </DialogDescription>
                </DialogHeader>
                <DialogFooter className="flex flex-row items-center justify-between gap-4 mt-6">
                    <Button
                        variant="destructive"
                        className="flex-1 bg-red-600 hover:bg-red-700"
                        onClick={handleDeleteAccount}
                        disabled={loading}
                    >
                        {loading ? "Excluindo..." : "APAGAR MINHA CONTA"}
                    </Button>

                    <Button
                        variant="ghost"
                        className="flex-1 text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => onOpenChange(false)}
                        disabled={loading}
                    >
                        CANCELAR
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
