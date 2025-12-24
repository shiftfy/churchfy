import { useState, useRef } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Camera, Loader2, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PersonPhotoUploadProps {
    personId: string;
    photoUrl?: string | null;
    name: string;
    onPhotoUpdate: (url: string | null) => void;
    className?: string;
}

export function PersonPhotoUpload({ personId, photoUrl, name, onPhotoUpdate, className }: PersonPhotoUploadProps) {
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
        try {
            const file = event.target.files?.[0];
            if (!file) return;

            // Validate file size (max 5MB)
            if (file.size > 5 * 1024 * 1024) {
                toast.error("A imagem deve ter no máximo 5MB");
                return;
            }

            // Validate file type
            if (!file.type.startsWith("image/")) {
                toast.error("O arquivo deve ser uma imagem");
                return;
            }

            setUploading(true);

            const fileExt = file.name.split('.').pop();
            const fileName = `${personId}-${Math.random()}.${fileExt}`;
            const filePath = `${fileName}`;

            // Upload to Supabase Storage
            const { error: uploadError } = await supabase.storage
                .from('person-photos') // Ensure this bucket exists
                .upload(filePath, file);

            if (uploadError) throw uploadError;

            // Get public URL
            const { data: { publicUrl } } = supabase.storage
                .from('person-photos')
                .getPublicUrl(filePath);

            // Update person record
            const { error: updateError } = await supabase
                .from('people')
                .update({ photo_url: publicUrl })
                .eq('id', personId);

            if (updateError) throw updateError;

            onPhotoUpdate(publicUrl);
            toast.success("Foto atualizada com sucesso!");

        } catch (error: any) {
            console.error("Error uploading photo:", error);
            toast.error("Erro ao atualizar foto: " + error.message);
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleRemovePhoto = async () => {
        try {
            setUploading(true);

            const { error } = await supabase
                .from('people')
                .update({ photo_url: null })
                .eq('id', personId);

            if (error) throw error;

            onPhotoUpdate(null);
            toast.success("Foto removida com sucesso!");
        } catch (error) {
            console.error("Error removing photo:", error);
            toast.error("Erro ao remover foto");
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className={cn("relative group", className)}>
            <div className="relative inline-block">
                <Avatar className="h-32 w-32 border-4 border-background shadow-xl">
                    <AvatarImage src={photoUrl || undefined} className="object-cover" />
                    <AvatarFallback className="text-4xl bg-muted">
                        {name?.substring(0, 2).toUpperCase() || "??"}
                    </AvatarFallback>
                </Avatar>

                <div className="absolute bottom-0 right-0 flex gap-1">
                    <Button
                        size="icon"
                        variant="secondary"
                        className="h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-transform"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                    >
                        {uploading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Camera className="h-4 w-4" />
                        )}
                    </Button>

                    {photoUrl && (
                        <Button
                            size="icon"
                            variant="destructive"
                            className="h-8 w-8 rounded-full shadow-lg hover:scale-110 transition-transform"
                            onClick={handleRemovePhoto}
                            disabled={uploading}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    )}
                </div>
            </div>

            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*"
                onChange={handleFileSelect}
            />
        </div>
    );
}
