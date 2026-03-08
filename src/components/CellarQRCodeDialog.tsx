import { useState, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { QrCode, Download } from 'lucide-react';

interface CellarQRCodeDialogProps {
  cellarSlug: string;
  cellarName: string;
}

export const CellarQRCodeDialog = ({ cellarSlug, cellarName }: CellarQRCodeDialogProps) => {
  const [open, setOpen] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const cellarUrl = `https://winenote.me/cellar/${cellarSlug}`;

  const handleDownload = () => {
    const canvas = canvasRef.current?.querySelector('canvas');
    if (!canvas) return;

    const link = document.createElement('a');
    link.download = `qr-${cellarSlug}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <QrCode className="h-4 w-4" />
          QR Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>QR Code — {cellarName}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center gap-6 py-4">
          <div ref={canvasRef} className="bg-white p-4 rounded-lg">
            <QRCodeCanvas
              value={cellarUrl}
              size={256}
              level="H"
              marginSize={2}
            />
          </div>
          <p className="text-sm text-muted-foreground text-center break-all">
            {cellarUrl}
          </p>
          <Button onClick={handleDownload} className="w-full gap-2">
            <Download className="h-4 w-4" />
            Télécharger le QR Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
