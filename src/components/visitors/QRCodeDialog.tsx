import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Download } from "lucide-react";

interface QRCodeDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    url: string;
    title: string;
}

export function QRCodeDialog({ open, onOpenChange, url, title }: QRCodeDialogProps) {

    const downloadQRCode = () => {
        const svg = document.getElementById("qr-code-svg");
        if (!svg) return;

        const svgData = new XMLSerializer().serializeToString(svg);
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        const img = new Image();

        img.onload = () => {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx?.drawImage(img, 0, 0);
            const pngFile = canvas.toDataURL("image/png");

            const downloadLink = document.createElement("a");
            downloadLink.download = `qrcode-${title.toLowerCase().replace(/\s+/g, "-")}.png`;
            downloadLink.href = pngFile;
            downloadLink.click();
        };

        img.src = "data:image/svg+xml;base64," + btoa(svgData);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>QR Code do Formulário</DialogTitle>
                    <DialogDescription>
                        Escaneie para acessar o formulário "{title}"
                    </DialogDescription>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center p-6 space-y-6">
                    <div className="bg-white p-4 rounded-lg shadow-sm border">
                        <QRCode
                            id="qr-code-svg"
                            value={url}
                            size={200}
                            level="H"
                        />
                    </div>
                    <div className="flex flex-col w-full gap-2">
                        <p className="text-sm text-center text-muted-foreground break-all">
                            {url}
                        </p>
                        <Button onClick={downloadQRCode} className="w-full">
                            <Download className="w-4 h-4 mr-2" />
                            Baixar QR Code
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
