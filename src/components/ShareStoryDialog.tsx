import { useState, useRef, useCallback } from 'react';
import html2canvas from 'html2canvas';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, Copy, Loader2, Check, Instagram, Wine, Quote, MapPin, Grape } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

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

type TemplateType = 'tasting' | 'photo' | 'quote' | 'wine';

// Tasting bar component for story
const TastingBarStory = ({ label, value }: { label: string; value: number }) => (
  <div className="space-y-1">
    <div className="flex justify-between items-center">
      <span className="text-sm font-medium text-white/90">{label}</span>
      <span className="text-sm text-white/70">{value}/10</span>
    </div>
    <div className="h-2 bg-white/20 rounded-full overflow-hidden">
      <div 
        className="h-full bg-gradient-to-r from-amber-400 to-amber-500 rounded-full"
        style={{ width: `${(value / 10) * 100}%` }}
      />
    </div>
  </div>
);

// Template for tasting posts
const StoryTemplateTasting = ({ authorName, authorAvatar, wineName, domainName, wineLabel, wineNotice, content }: {
  authorName: string; authorAvatar?: string; wineName: string; domainName?: string; wineLabel?: string; wineNotice: WineNotice; content?: string;
}) => (
  <div className="relative w-[1080px] h-[1920px] overflow-hidden" style={{ background: 'linear-gradient(165deg, #6a1b2b 0%, #8c3042 40%, #4a1520 100%)' }}>
    <div className="absolute top-16 left-12 right-12 flex items-center gap-4">
      {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-16 h-16 rounded-full border-2 border-white/30 object-cover" /> : <div className="w-16 h-16 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center"><span className="text-2xl font-serif text-white">{authorName[0]}</span></div>}
      <div><p className="text-white/70 text-lg">Dégustation de</p><p className="text-white text-2xl font-semibold">{authorName}</p></div>
    </div>
    <div className="absolute top-52 left-0 right-0 flex justify-center">
      {wineLabel ? <img src={wineLabel} alt={wineName} className="w-80 h-[420px] object-cover rounded-2xl shadow-2xl" /> : <div className="w-80 h-[420px] bg-white/10 rounded-2xl flex items-center justify-center"><Wine className="w-24 h-24 text-white/30" /></div>}
    </div>
    <div className="absolute top-[720px] left-12 right-12 text-center">
      <h2 className="text-4xl font-serif text-white leading-tight">{wineName}</h2>
      {domainName && <p className="text-xl text-white/70 mt-2">{domainName}</p>}
    </div>
    <div className="absolute top-[850px] left-0 right-0 flex justify-center">
      <div className="w-32 h-32 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-xl">
        <span className="text-4xl font-bold text-white">{wineNotice.rating}</span><span className="text-xl text-white/80">/10</span>
      </div>
    </div>
    <div className="absolute top-[1040px] left-12 right-12 grid grid-cols-2 gap-x-8 gap-y-4">
      <TastingBarStory label="Acidité" value={wineNotice.acidity} />
      <TastingBarStory label="Tanins" value={wineNotice.tannins} />
      <TastingBarStory label="Corps" value={wineNotice.body} />
      <TastingBarStory label="Douceur" value={wineNotice.sweetness} />
    </div>
    {content && <div className="absolute top-[1280px] left-12 right-12 bg-white/10 backdrop-blur-sm rounded-2xl p-6"><p className="text-white/90 text-lg leading-relaxed italic line-clamp-4">"{content}"</p></div>}
    <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-3">
      <div className="flex items-center gap-3"><Wine className="w-8 h-8 text-amber-400" /><span className="text-2xl font-serif text-white">Wine Note</span></div>
    </div>
  </div>
);

// Template for photo posts
const StoryTemplatePhoto = ({ authorName, authorAvatar, imageUrl, content, wineName, domainName }: {
  authorName: string; authorAvatar?: string; imageUrl: string; content?: string; wineName?: string; domainName?: string;
}) => (
  <div className="relative w-[1080px] h-[1920px] overflow-hidden bg-black">
    <div className="absolute inset-0 scale-150 blur-3xl opacity-50" style={{ backgroundImage: `url(${imageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }} />
    <div className="absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(106,27,43,0.7) 0%, rgba(0,0,0,0.3) 30%, rgba(0,0,0,0.3) 70%, rgba(106,27,43,0.8) 100%)' }} />
    <div className="absolute top-16 left-12 right-12 flex items-center gap-4 z-10">
      {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-16 h-16 rounded-full border-2 border-white/40 object-cover" /> : <div className="w-16 h-16 rounded-full border-2 border-white/40 bg-white/10 flex items-center justify-center backdrop-blur-sm"><span className="text-2xl font-serif text-white">{authorName[0]}</span></div>}
      <div><p className="text-white text-2xl font-semibold">{authorName}</p></div>
    </div>
    <div className="absolute top-48 left-8 right-8 bottom-[480px] flex items-center justify-center z-10">
      <img src={imageUrl} alt="Post" className="w-full h-full object-contain rounded-2xl" />
    </div>
    {wineName && <div className="absolute bottom-[300px] left-12 right-12 z-10 bg-white/10 backdrop-blur-md rounded-2xl p-6 border border-white/10"><div className="flex items-center gap-4"><div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center"><Wine className="w-6 h-6 text-white" /></div><div><h3 className="text-2xl font-serif text-white">{wineName}</h3>{domainName && <p className="text-white/70 text-lg">{domainName}</p>}</div></div></div>}
    {content && <div className="absolute bottom-[120px] left-12 right-12 z-10"><p className="text-white text-xl leading-relaxed line-clamp-3">{content}</p></div>}
    <div className="absolute bottom-8 left-12 right-12 flex items-center justify-between z-10"><div className="flex items-center gap-2"><Wine className="w-6 h-6 text-amber-400" /><span className="text-xl font-serif text-white">Wine Note</span></div></div>
  </div>
);

// Template for quote/text posts
const StoryTemplateQuote = ({ authorName, authorAvatar, content }: { authorName: string; authorAvatar?: string; content: string; }) => (
  <div className="relative w-[1080px] h-[1920px] overflow-hidden" style={{ background: 'linear-gradient(165deg, #1a1a2e 0%, #16213e 50%, #0f0f23 100%)' }}>
    <div className="absolute top-32 left-12"><Quote className="w-24 h-24 text-amber-400/30 rotate-180" /></div>
    <div className="absolute top-56 left-12 right-12 bottom-[400px] flex items-center"><p className="text-white text-4xl leading-relaxed font-serif">{content}</p></div>
    <div className="absolute bottom-[200px] left-12 right-12">
      <div className="flex items-center gap-5">
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
        {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-20 h-20 rounded-full border-2 border-amber-400/50 object-cover" /> : <div className="w-20 h-20 rounded-full border-2 border-amber-400/50 bg-gradient-to-br from-amber-400/20 to-amber-600/20 flex items-center justify-center"><span className="text-3xl font-serif text-white">{authorName[0]}</span></div>}
        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
      </div>
      <p className="text-center text-2xl text-white/90 mt-4 font-medium">{authorName}</p>
    </div>
    <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-3"><div className="flex items-center gap-3"><Wine className="w-8 h-8 text-amber-400" /><span className="text-2xl font-serif text-white">Wine Note</span></div></div>
  </div>
);

// Template for wine posts without tasting notes
const StoryTemplateWine = ({ authorName, authorAvatar, wineName, domainName, region, wineLabel, wineColor, content }: {
  authorName: string; authorAvatar?: string; wineName: string; domainName?: string; region?: string; wineLabel?: string; wineColor?: string; content?: string;
}) => {
  const bg = wineColor?.toLowerCase() === 'blanc' ? 'linear-gradient(165deg, #d4a574 0%, #c49a6c 40%, #a67c52 100%)' : wineColor?.toLowerCase() === 'rosé' ? 'linear-gradient(165deg, #e8a4b0 0%, #d4909c 40%, #c07585 100%)' : 'linear-gradient(165deg, #6a1b2b 0%, #8c3042 40%, #4a1520 100%)';
  return (
    <div className="relative w-[1080px] h-[1920px] overflow-hidden" style={{ background: bg }}>
      <div className="absolute top-16 left-12 right-12 flex items-center gap-4">
        {authorAvatar ? <img src={authorAvatar} alt={authorName} className="w-16 h-16 rounded-full border-2 border-white/30 object-cover" /> : <div className="w-16 h-16 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center"><span className="text-2xl font-serif text-white">{authorName[0]}</span></div>}
        <div><p className="text-white text-2xl font-semibold">{authorName}</p><p className="text-white/70 text-lg">recommande</p></div>
      </div>
      {wineColor && <div className="absolute top-44 right-12"><div className="bg-white/20 backdrop-blur-sm rounded-full px-6 py-2 flex items-center gap-2"><Grape className="w-5 h-5 text-white" /><span className="text-white font-medium capitalize">{wineColor}</span></div></div>}
      <div className="absolute top-48 left-0 right-0 flex justify-center">
        {wineLabel ? <img src={wineLabel} alt={wineName} className="w-[400px] h-[540px] object-cover rounded-3xl shadow-2xl border border-white/10" /> : <div className="w-[400px] h-[540px] bg-white/10 rounded-3xl flex flex-col items-center justify-center gap-4 border border-white/10"><Wine className="w-32 h-32 text-white/30" /></div>}
      </div>
      <div className="absolute top-[880px] left-12 right-12 text-center space-y-4">
        <h2 className="text-5xl font-serif text-white leading-tight">{wineName}</h2>
        {domainName && <p className="text-2xl text-white/80">{domainName}</p>}
        {region && <div className="flex items-center justify-center gap-2 text-white/60"><MapPin className="w-5 h-5" /><span className="text-xl">{region}</span></div>}
      </div>
      {content && <div className="absolute top-[1150px] left-12 right-12 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/10"><p className="text-white/90 text-xl leading-relaxed text-center line-clamp-5">{content}</p></div>}
      <div className="absolute bottom-12 left-0 right-0 flex flex-col items-center gap-3"><div className="flex items-center gap-3"><Wine className="w-8 h-8 text-amber-400" /><span className="text-2xl font-serif text-white">Wine Note</span></div></div>
    </div>
  );
};

export const ShareStoryDialog = ({ open, onOpenChange, post, wine, author }: ShareStoryDialogProps) => {
  const { toast } = useToast();
  const storyRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  const getTemplateType = useCallback((): TemplateType => {
    if (post.is_wine_notice && post.wine_notice) return 'tasting';
    if (post.image_url) return 'photo';
    if (wine) return 'wine';
    return 'quote';
  }, [post, wine]);

  const templateType = getTemplateType();

  const generateImage = async (): Promise<Blob | null> => {
    if (!storyRef.current) return null;
    try {
      const canvas = await html2canvas(storyRef.current, { scale: 1, useCORS: true, allowTaint: true, backgroundColor: null, width: 1080, height: 1920, logging: false });
      return new Promise((resolve) => { canvas.toBlob((blob) => resolve(blob), 'image/png', 1.0); });
    } catch (error) { console.error('Erreur génération image:', error); return null; }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Impossible de générer l\'image');
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url; link.download = `winenote-story-${Date.now()}.png`;
      document.body.appendChild(link); link.click(); document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: 'Téléchargé !', description: 'Votre story a été téléchargée.' });
    } catch { toast({ variant: 'destructive', title: 'Erreur', description: 'Impossible de télécharger l\'image' }); }
    finally { setIsGenerating(false); }
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error('Impossible de générer l\'image');
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      setIsCopied(true); setTimeout(() => setIsCopied(false), 2000);
      toast({ title: 'Copié !', description: 'L\'image a été copiée.' });
    } catch { toast({ variant: 'destructive', title: 'Copie non supportée', description: 'Utilisez le bouton télécharger' }); }
    finally { setIsGenerating(false); }
  };

  const renderTemplate = () => {
    const authorName = author?.full_name || 'Utilisateur';
    const authorAvatar = author?.logo_adress;
    switch (templateType) {
      case 'tasting': return <StoryTemplateTasting authorName={authorName} authorAvatar={authorAvatar} wineName={wine?.name || 'Vin'} domainName={wine?.domain?.name} wineLabel={wine?.label_url} wineNotice={post.wine_notice!} content={post.content} />;
      case 'photo': return <StoryTemplatePhoto authorName={authorName} authorAvatar={authorAvatar} imageUrl={post.image_url!} content={post.content} wineName={wine?.name} domainName={wine?.domain?.name} />;
      case 'wine': return <StoryTemplateWine authorName={authorName} authorAvatar={authorAvatar} wineName={wine?.name || 'Vin'} domainName={wine?.domain?.name} region={wine?.domain?.region} wineLabel={wine?.label_url} wineColor={wine?.color} content={post.content} />;
      default: return <StoryTemplateQuote authorName={authorName} authorAvatar={authorAvatar} content={post.content || ''} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Instagram className="w-5 h-5 text-pink-500" />Créer une Story Instagram</DialogTitle>
          <DialogDescription>Format 9:16 • Téléchargez puis partagez sur Instagram</DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-xl bg-muted/50">
          <div className="relative mx-auto overflow-hidden rounded-lg shadow-xl" style={{ width: '270px', height: '480px' }}>
            <div ref={storyRef} style={{ transform: 'scale(0.25)', transformOrigin: 'top left', position: 'absolute', top: 0, left: 0 }}>{renderTemplate()}</div>
          </div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy} disabled={isGenerating}>
            {isCopied ? <><Check className="w-4 h-4" />Copié !</> : <><Copy className="w-4 h-4" />Copier</>}
          </Button>
          <Button className="flex-1 gap-2" onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
