import { useState } from "react";
import { useDisciplers } from "@/hooks/useData";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AddDisciplerDialog } from "@/components/disciplers/AddDisciplerDialog";

interface Discipler {
    id: string;
    name: string;
    phone: string | null;
    birth_date: string | null;
    disciples_count?: number;
}

// Helper to calculate age from birth date
const calculateAge = (birthDate: string | null) => {
    if (!birthDate) return "-";
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
        age--;
    }
    return age;
};

// Skeleton para a tabela
function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/40 hover:bg-transparent">
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-12" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}

export function DisciplersList() {
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedDiscipler, setSelectedDiscipler] = useState<Discipler | null>(null);

    // React Query hook - dados cacheados
    const {
        data: disciplers = [],
        isLoading,
        refetch
    } = useDisciplers();

    const handleSuccess = () => {
        refetch();
    };

    const handleOpenAdd = () => {
        setSelectedDiscipler(null);
        setDialogOpen(true);
    };

    const handleRowClick = (discipler: Discipler) => {
        setSelectedDiscipler(discipler);
        setDialogOpen(true);
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight">Discipuladores</h1>
                    <p className="text-muted-foreground">
                        Gerencie os discipuladores da sua igreja.
                    </p>
                </div>
                <Button onClick={handleOpenAdd}>
                    <Plus className="mr-2 h-4 w-4" />
                    Novo Discipulador
                </Button>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Idade</TableHead>
                            <TableHead>Discípulos</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton />
                        ) : disciplers.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    Nenhum discipulador encontrado.
                                </TableCell>
                            </TableRow>
                        ) : (
                            disciplers.map((discipler: Discipler) => (
                                <TableRow
                                    key={discipler.id}
                                    className="hover:bg-muted/50 transition-colors cursor-pointer"
                                    onClick={() => handleRowClick(discipler)}
                                >
                                    <TableCell className="font-medium">
                                        {discipler.name}
                                    </TableCell>
                                    <TableCell>
                                        {calculateAge(discipler.birth_date)}
                                    </TableCell>
                                    <TableCell>{discipler.disciples_count || 0}</TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>

            <AddDisciplerDialog
                open={dialogOpen}
                onOpenChange={setDialogOpen}
                onSuccess={handleSuccess}
                editingDiscipler={selectedDiscipler}
            />
        </div>
    );
}
