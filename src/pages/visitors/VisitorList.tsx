import { useState } from "react";
import { usePeople } from "@/hooks/useData";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { User } from "lucide-react";
import { PersonDetailsDialog } from "@/components/visitors/PersonDetailsDialog";
import { Badge } from "@/components/ui/badge";
import type { FormField } from "@/types/form";

interface Person {
    id: string;
    name: string;
    phone: string | null;
    email: string | null;
    birthdate: string | null;
    stage_id: string | null;
    journey_id: string | null;
    created_at: string;
    is_archived?: boolean;
    visitor_responses?: {
        created_at: string;
        responses: Record<string, any>;
        forms?: {
            title: string;
            fields: FormField[];
        } | null;
    }[];
}

// Skeleton para a tabela
function TableSkeleton() {
    return (
        <>
            {Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i} className="border-b border-border/40">
                    <TableCell>
                        <div className="flex items-center gap-2">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <Skeleton className="h-4 w-32" />
                        </div>
                    </TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-28" /></TableCell>
                </TableRow>
            ))}
        </>
    );
}

export function VisitorList() {
    const [selectedPerson, setSelectedPerson] = useState<Person | null>(null);

    // React Query hook - dados cacheados
    const {
        data: people = [],
        isLoading,
        deletePerson,
        archivePerson
    } = usePeople();

    const handleDeletePerson = async (personId: string) => {
        await deletePerson.mutateAsync(personId);
        setSelectedPerson(null);
    };

    const handleArchivePerson = async (personId: string, isArchived: boolean) => {
        await archivePerson.mutateAsync({ id: personId, isArchived });
        if (selectedPerson?.id === personId) {
            setSelectedPerson({ ...selectedPerson, is_archived: isArchived });
        }
    };

    const getLatestFormTitle = (person: Person) => {
        if (!person.visitor_responses || person.visitor_responses.length === 0) return "-";
        const sortedResponses = [...person.visitor_responses].sort((a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        return sortedResponses[0].forms?.title || "-";
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-300">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Pessoas</h1>
                <p className="text-muted-foreground">
                    Lista completa de todas as pessoas cadastradas.
                </p>
            </div>

            <div className="border rounded-lg">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Nome</TableHead>
                            <TableHead>Formulário</TableHead>
                            <TableHead>Data de Criação</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {isLoading ? (
                            <TableSkeleton />
                        ) : people.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={3} className="text-center py-8 text-muted-foreground">
                                    Nenhuma pessoa encontrada.
                                </TableCell>
                            </TableRow>
                        ) : (
                            people.map((person: Person) => (
                                <TableRow
                                    key={person.id}
                                    className="cursor-pointer hover:bg-muted/50 transition-colors"
                                    onClick={() => setSelectedPerson(person)}
                                >
                                    <TableCell className="font-medium">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                                                <User className="h-4 w-4" />
                                            </div>
                                            {person.name}
                                            {person.is_archived && (
                                                <Badge variant="destructive" className="ml-2 text-[10px] px-1 py-0 h-5">
                                                    ARQUIVADO
                                                </Badge>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>{getLatestFormTitle(person)}</TableCell>
                                    <TableCell>
                                        {format(new Date(person.created_at), "dd/MM/yyyy HH:mm", {
                                            locale: ptBR,
                                        })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>


            <PersonDetailsDialog
                person={selectedPerson}
                open={!!selectedPerson}
                onOpenChange={(open) => !open && setSelectedPerson(null)}
                onDelete={handleDeletePerson}
                onArchive={handleArchivePerson}
                onJourneyChange={() => {
                    // React Query invalidará automaticamente
                }}
            />
        </div>
    );
}
