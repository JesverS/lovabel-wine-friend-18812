import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Loader2, Check, Instagram, Wine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { getSlidersForWineType, migrateTastingDetails } from "@/lib/tastingSliderConfig";

interface WineNotice {
  rating: number;
  acidity?: number;
  tannins?: number;
  body?: number;
  sweetness?: number;
  slot1?: number;
  slot2?: number;
  slot3?: number;
  slot4?: number;
}

interface WineData {
  id: string;
  name: string;
  label_url?: string;
  color?: string;
  type?: number | null;
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
  wine?: WineData | null;
  author?: Author | null;
}

const STORY_COLORS = [
  { name: "Bordeaux", value: "#6A1B2B" },
  { name: "Bordeaux Clair", value: "#8B2438" },
  { name: "Or", value: "#C9A227" },
  { name: "Noir", value: "#1A1A1A" },
  { name: "Beige", value: "#F5F0E8" },
];

// Tasting bar component
const TastingBarCard = ({ label, value }: { label: string; value: number }) => (
  <div style={{ marginBottom: "8px" }}>
    <span
      style={{
        color: "#6B7280",
        fontSize: "28px",
        fontStyle: "italic",
        display: "block",
        marginBottom: "8px",
      }}
    >
      {label}
    </span>
    <div
      style={{
        height: "20px",
        borderRadius: "10px",
        backgroundColor: "#E5E7EB",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          height: "100%",
          borderRadius: "10px",
          width: `${(value / 10) * 100}%`,
          backgroundColor: "#1F2937",
        }}
      />
    </div>
  </div>
);

// Story Template - dimensions fixes, pas de flex dynamique
const StoryTemplateCard = ({
  wineName,
  domainName,
  imageUrl,
  wineNotice,
  wineTypeId,
  content,
  backgroundColor,
}: {
  wineName: string;
  domainName?: string;
  imageUrl?: string;
  wineNotice?: WineNotice | null;
  wineTypeId?: number | null;
  content?: string;
  backgroundColor: string;
}) => {
  const migratedNotice = wineNotice ? migrateTastingDetails(wineNotice) : null;
  const sliders = getSlidersForWineType(wineTypeId);

  const isLightBackground = backgroundColor === "#C9A227" || backgroundColor === "#F5F0E8";
  const footerTextColor = isLightBackground ? "#1A1A1A" : "#FFFFFF";

  // Dimensions fixes
  const CARD_LEFT = 80;
  const CARD_WIDTH = 920; // 1080 - 80*2
  const CARD_TOP = 200;
  const CARD_BOTTOM = 180;
  const CARD_HEIGHT = 1920 - CARD_TOP - CARD_BOTTOM; // 1540px

  return (
    <div
      style={{
        width: "1080px",
        height: "1920px",
        backgroundColor: backgroundColor,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* White card - position absolute mais bien contenue */}
      <div
        style={{
          position: "absolute",
          left: `${CARD_LEFT}px`,
          top: `${CARD_TOP}px`,
          width: `${CARD_WIDTH}px`,
          height: `${CARD_HEIGHT}px`,
          backgroundColor: "#FFFFFF",
          borderRadius: "48px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          padding: "48px",
          boxSizing: "border-box",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Wine name */}
        <div style={{ textAlign: "center", marginBottom: "16px" }}>
          <h2
            style={{
              fontFamily: "Georgia, Times, serif",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              lineHeight: 1.1,
              fontSize: "52px",
              fontWeight: 700,
              color: "#111827",
              margin: 0,
              wordBreak: "break-word",
            }}
          >
            {wineName}
          </h2>
          {domainName && (
            <p
              style={{
                fontSize: "28px",
                color: "#6B7280",
                margin: "12px 0 0 0",
              }}
            >
              {domainName}
            </p>
          )}
        </div>

        {/* Separator */}
        <div
          style={{
            width: "100px",
            height: "3px",
            backgroundColor: "#D1D5DB",
            margin: "0 auto 24px auto",
          }}
        />

        {/* Main image */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "300px",
            maxHeight: migratedNotice ? "550px" : "750px",
            marginBottom: "20px",
          }}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={wineName}
              crossOrigin="anonymous"
              style={{
                maxWidth: "100%",
                maxHeight: "100%",
                objectFit: "contain",
                borderRadius: "16px",
              }}
            />
          ) : (
            <div
              style={{
                width: "350px",
                height: "350px",
                backgroundColor: "#F3F4F6",
                borderRadius: "16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Wine style={{ width: "120px", height: "120px", color: "#D1D5DB" }} />
            </div>
          )}
        </div>

        {/* Content quote */}
        {content && (
          <p
            style={{
              textAlign: "center",
              fontStyle: "italic",
              lineHeight: 1.5,
              marginBottom: "16px",
              fontSize: "32px",
              color: "#4B5563",
            }}
          >
            "{content}"
          </p>
        )}

        {/* Rating and tasting bars */}
        {migratedNotice && (
          <div>
            <div style={{ textAlign: "center", marginBottom: "16px" }}>
              <span
                style={{
                  fontSize: "72px",
                  lineHeight: 1,
                  color: "#111827",
                  fontWeight: "bold",
                }}
              >
                {migratedNotice.rating}
              </span>
              <span style={{ fontSize: "48px", color: "#9CA3AF" }}>/10</span>
            </div>

            {/* Tasting bars - 2 colonnes */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "16px 32px",
              }}
            >
              <TastingBarCard label={sliders.slot1.label} value={migratedNotice.slot1} />
              <TastingBarCard label={sliders.slot2.label} value={migratedNotice.slot2} />
              <TastingBarCard label={sliders.slot3.label} value={migratedNotice.slot3} />
              <TastingBarCard label={sliders.slot4.label} value={migratedNotice.slot4} />
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        style={{
          position: "absolute",
          bottom: "60px",
          left: 0,
          right: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "16px",
        }}
      >
        <span
          style={{
            fontSize: "36px",
            fontWeight: 500,
            color: footerTextColor,
          }}
        >
          @winenote
        </span>
        <Wine style={{ width: "36px", height: "36px", color: footerTextColor }} />
      </div>
    </div>
  );
};

export const ShareStoryDialog = ({ open, onOpenChange, post, wine }: ShareStoryDialogProps) => {
  const { toast } = useToast();
  const storyRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState(STORY_COLORS[0].value);

  const displayImage = post.image_url || wine?.label_url;
  const wineName = wine?.name || "Dégustation";
  const domainName = wine?.domain?.name;
  const wineNotice = post.is_wine_notice ? post.wine_notice : null;

  const generateImage = async (): Promise<Blob | null> => {
    if (!storyRef.current) return null;

    try {
      // Import dynamique de html2canvas
      const html2canvas = (await import("html2canvas")).default;

      // Créer un conteneur temporaire DANS le body, visible
      const tempContainer = document.createElement("div");
      tempContainer.style.cssText = `
        position: fixed;
        left: 0;
        top: 0;
        width: 1080px;
        height: 1920px;
        z-index: 999999;
        background: ${selectedColor};
        overflow: hidden;
      `;

      // Cloner le contenu
      const clone = storyRef.current.cloneNode(true) as HTMLElement;
      clone.style.cssText = `
        position: relative;
        left: 0;
        top: 0;
        width: 1080px;
        height: 1920px;
        visibility: visible;
        opacity: 1;
      `;

      tempContainer.appendChild(clone);
      document.body.appendChild(tempContainer);

      // Attendre le rendu
      await new Promise((resolve) => setTimeout(resolve, 300));

      // Capturer
      const canvas = await html2canvas(tempContainer, {
        scale: 1,
        width: 1080,
        height: 1920,
        useCORS: true,
        allowTaint: true,
        backgroundColor: selectedColor,
        logging: false,
        imageTimeout: 15000,
      });

      // Nettoyer
      document.body.removeChild(tempContainer);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
      });
    } catch (error) {
      console.error("Erreur génération image:", error);
      return null;
    }
  };

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error("Impossible de générer l'image");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `winenote-story-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Téléchargé !", description: "Votre story a été téléchargée." });
    } catch {
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de télécharger l'image" });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopy = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error("Impossible de générer l'image");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
      toast({ title: "Copié !", description: "L'image a été copiée." });
    } catch {
      toast({ variant: "destructive", title: "Copie non supportée", description: "Utilisez le bouton télécharger" });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[480px] max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Instagram className="w-5 h-5 text-pink-500" />
            Créer une Story Instagram
          </DialogTitle>
          <DialogDescription>Format 9:16 • Choisissez une couleur et téléchargez</DialogDescription>
        </DialogHeader>

        {/* Color selector */}
        <div className="flex justify-center gap-3 py-2">
          {STORY_COLORS.map((color) => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-all hover:scale-105",
                selectedColor === color.value ? "border-primary ring-2 ring-primary/30 scale-110" : "border-white/50",
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
              aria-label={`Couleur ${color.name}`}
            />
          ))}
        </div>

        {/* Hidden source for cloning */}
        <div
          ref={storyRef}
          style={{
            position: "absolute",
            left: "-99999px",
            top: "-99999px",
            width: "1080px",
            height: "1920px",
            pointerEvents: "none",
          }}
        >
          <StoryTemplateCard
            wineName={wineName}
            domainName={domainName}
            imageUrl={displayImage}
            wineNotice={wineNotice}
            wineTypeId={wine?.type}
            content={post.content}
            backgroundColor={selectedColor}
          />
        </div>

        {/* Visible preview */}
        <div className="relative overflow-hidden rounded-xl bg-muted/50">
          <div
            className="relative mx-auto overflow-hidden rounded-lg shadow-xl"
            style={{ width: "270px", height: "480px" }}
          >
            <div
              style={{
                transform: "scale(0.25)",
                transformOrigin: "top left",
                position: "absolute",
                top: 0,
                left: 0,
              }}
            >
              <StoryTemplateCard
                wineName={wineName}
                domainName={domainName}
                imageUrl={displayImage}
                wineNotice={wineNotice}
                wineTypeId={wine?.type}
                content={post.content}
                backgroundColor={selectedColor}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy} disabled={isGenerating}>
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
          <Button className="flex-1 gap-2" onClick={handleDownload} disabled={isGenerating}>
            {isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Télécharger
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
