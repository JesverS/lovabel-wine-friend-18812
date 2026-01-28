import { useState, useRef } from 'react';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, Loader2, Check, Instagram, Wine } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface WineNotice {
  rating: number;
  acidity: number;
  tannins: number;
  body: number;
  sweetness: number;
}

interface Wine {
  id: string;
  name: string;
  label_url?: string;
  color?: string;
  domain?: {
    name: string;
    region?: string;
  };
}

interface Author {
  full_name: string;
  logo_adress?: string;
}

interface ShareStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  post: {
    content?: string;
    image_url?: string;
    is_wine_notice?: boolean;
    wine_notice?: WineNotice;
  };
  wine?: Wine | null;
  author?: Author | null;
}

const PASTEL_COLORS = [
  { name: 'Taupe', value: '#A89F91' },
  { name: 'Rose', value: '#D4A5A5' },
  { name: 'Sauge', value: '#A5B5A5' },
  { name: 'Lavande', value: '#B5A5C5' },
];

// Decorative lines SVG component
const DecorativeLines = () => (
  <svg 
    className="absolute top-12 left-12" 
    width="120" 
    height="120" 
    viewBox="0 0 120 120" 
    fill="none"
  >
    <line x1="0" y1="80" x2="80" y2="0" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.6" />
    <line x1="0" y1="100" x2="100" y2="0" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.4" />
    <line x1="0" y1="120" x2="120" y2="0" stroke="white" strokeWidth="3" strokeLinecap="round" opacity="0.2" />
  </svg>
);

// Tasting bar component for card style
const TastingBarCard = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-2">
    <span className="text-base text-gray-500 italic block">{label}</span>
    <div className="h-3 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gray-800 rounded-full transition-all"
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
  </div>
);

// Unified Story Template Card
const StoryTemplateCard = ({
  wineName,
  domainName,
  imageUrl,
  wineNotice,
  content,
  backgroundColor,
}: {
  wineName: string;
  domainName?: string;
  imageUrl?: string;
  wineNotice?: WineNotice | null;
  content?: string;
  backgroundColor: string;
}) => (
  <div 
    className="relative w-[1080px] h-[1920px] overflow-hidden"
    style={{ backgroundColor }}
  >
    {/* Decorative lines */}
    <DecorativeLines />
    
    {/* White card */}
    <div 
      className="absolute bg-white rounded-[48px] flex flex-col"
      style={{
        left: '80px',
        right: '80px',
        top: '200px',
        bottom: '160px',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
        padding: '60px',
      }}
    >
      {/* Wine name and domain */}
      <div className="text-center mb-8">
        <h2 
          className="text-gray-900 font-serif uppercase tracking-wide leading-tight"
          style={{ fontSize: '52px', fontWeight: 600 }}
        >
          {wineName}
        </h2>
        {domainName && (
          <p className="text-gray-500 mt-3" style={{ fontSize: '28px' }}>
            {domainName}
          </p>
        )}
      </div>

      {/* Separator */}
      <div className="w-24 h-0.5 bg-gray-200 mx-auto mb-8" />

      {/* Main image */}
      <div className="flex-1 flex items-center justify-center mb-8">
        {imageUrl ? (
          <img 
            src={imageUrl} 
            alt={wineName}
            className="max-w-full max-h-full object-contain rounded-2xl"
            style={{ maxHeight: '600px' }}
          />
        ) : (
          <div 
            className="bg-gray-100 rounded-2xl flex items-center justify-center"
            style={{ width: '400px', height: '500px' }}
          >
            <Wine className="w-32 h-32 text-gray-300" />
          </div>
        )}
      </div>

      {/* Rating */}
      {wineNotice && (
        <>
          <div className="text-center mb-8">
            <span 
              className="text-gray-900 font-bold"
              style={{ fontSize: '80px', lineHeight: 1 }}
            >
              {wineNotice.rating}
            </span>
            <span 
              className="text-gray-400"
              style={{ fontSize: '40px' }}
            >
              /10
            </span>
          </div>

          {/* Tasting bars grid */}
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 mt-4">
            <TastingBarCard label="Acidité" value={wineNotice.acidity} />
            <TastingBarCard label="Tanins" value={wineNotice.tannins} />
            <TastingBarCard label="Corps" value={wineNotice.body} />
            <TastingBarCard label="Douceur" value={wineNotice.sweetness} />
          </div>
        </>
      )}

      {/* Content quote (if no wine notice) */}
      {!wineNotice && content && (
        <p 
          className="text-gray-600 text-center italic leading-relaxed mt-auto"
          style={{ fontSize: '28px' }}
        >
          "{content}"
        </p>
      )}
    </div>

    {/* Footer */}
    <div 
      className="absolute left-0 right-0 flex items-center justify-center gap-4"
      style={{ bottom: '60px' }}
    >
      <span className="text-white text-3xl font-medium">@winenote</span>
      <Wine className="w-8 h-8 text-white" />
    </div>
  </div>
);

export const ShareStoryDialog = ({ open, onOpenChange, post, wine, author }: ShareStoryDialogProps) => {
  const { toast } = useToast();
  const storyRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState(PASTEL_COLORS[0].value);

  // Determine the image to display (priority: post photo > wine label > none)
  const displayImage = post.image_url || wine?.label_url;
  
  // Get wine info
  const wineName = wine?.name || 'Dégustation';
  const domainName = wine?.domain?.name;
  const wineNotice = post.is_wine_notice ? post.wine_notice : null;

  const generateImage = async (): Promise<Blob | null> => {
    if (!storyRef.current) return null;
    try {
      const canvas = await html2canvas(storyRef.current, { 
        scale: 1, 
        useCORS: true, 
        allowTaint: true, 
        backgroundColor: null, 
        width: 1080, 
        height: 1920, 
        logging: false 
      });
      return new Promise((resolve) => { 
        canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0); 
      });
    } catch (error) { 
      console.error('Erreur génération image:', error); 
      return null; 
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Impossible de générer l\'image');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; 
      link.download = `winenote-story-${Date.now()}.png`;
      document.body.appendChild(link); 
      link.click(); 
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Téléchargé !', description: 'Votre story a été téléchargée.' });
    } catch { 
      toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de télécharger l\'image' }); 
    }
    finally { setIsGenerating(false); }
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Impossible de générer l\'image');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setIsCopied(true); 
      setTimeout(() => setIsCopied(false), 2000);
      toast({ title: 'Copié !', description: 'L\'image a été copiée.' });
    } catch { 
      toast({ variant: 'destructive', title: 'Copie non supportée', description: 'Utilisez le bouton télécharger' }); 
    }
    finally { setIsGenerating(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Créer une Story Instagram
          </DialogTitle>
          <DialogDescription>
            Format 9:16 • Choisissez une couleur et téléchargez
          </DialogDescription>
        </DialogHeader>

        {/* Color selector */}
        <div className="flex justify-center gap-3 py-2">
          {PASTEL_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-all hover:scale-105",
                selectedColor === color.value 
                  ? "border-primary ring-2 ring-primary/30 scale-110" 
                  : "border-white/50"
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={`Couleur ${color.name}`}
            />
          ))}
        </div>

        {/* Preview */}
        <div className="relative overflow-hidden rounded-xl bg-muted/50">
          <div 
            className="relative mx-auto overflow-hidden rounded-lg shadow-xl" 
            style={{ width: '270px', height: '480px' }}
          >
            <div 
              ref={storyRef} 
              style={{ 
                transform: 'scale(0.25)', 
                transformOrigin: 'top left', 
                position: 'absolute', 
                top: 0, 
                left: 0 
              }}
            >
              <StoryTemplateCard
                wineName={wineName}
                domainName={domainName}
                imageUrl={displayImage}
                wineNotice={wineNotice}
                content={post.content}
                backgroundColor={selectedColor}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            className="flex-1 gap-2" 
            onClick={handleCopy} 
            disabled={isGenerating}
          >
            {isCopied ? (
              <>
                <Check className="w-4 h-4" />
                Copié !
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copier
              </>
            )}
          </Button>
          <Button 
            className="flex-1 gap-2" 
            onClick={handleDownload} 
            disabled={isGenerating}
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
