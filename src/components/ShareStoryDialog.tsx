import { useState, useCallback } from "react";
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

// Génère le HTML statique de la story
const generateStoryHTML = ({
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
}): string => {
  const migratedNotice = wineNotice ? migrateTastingDetails(wineNotice) : null;
  const sliders = getSlidersForWineType(wineTypeId);

  const isLightBackground = backgroundColor === "#C9A227" || backgroundColor === "#F5F0E8";
  const footerTextColor = isLightBackground ? "#1A1A1A" : "#FFFFFF";

  const tastingBar = (label: string, value: number) => `
    <div style="background-color: #FFFFFF;">
      <span style="color: #6B7280; font-size: 28px; font-style: italic; display: block; margin-bottom: 16px; background-color: #FFFFFF;">
        ${label}
      </span>
      <div style="height: 20px; border-radius: 10px; background-color: #E5E7EB; overflow: hidden;">
        <div style="height: 100%; border-radius: 10px; width: ${(value / 10) * 100}%; background-color: #1F2937;"></div>
      </div>
    </div>
  `;

  // SVG avec transform pour décaler vers le bas
  const wineIconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="${footerTextColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="transform: translateY(6px);"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>`;

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { margin: 0; padding: 0; }
      </style>
    </head>
    <body>
      <div style="width: 1080px; height: 1920px; background-color: ${backgroundColor}; position: relative; overflow: hidden;">
        <!-- White card -->
        <div style="position: absolute; left: 80px; top: 200px; width: 920px; height: 1540px; background-color: #FFFFFF; border-radius: 48px; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15); overflow: hidden;">
          <!-- Inner content avec flexbox pour pousser les sliders en bas -->
          <div style="position: absolute; top: 0; left: 0; right: 0; bottom: 0; padding: 48px; background-color: #FFFFFF; display: flex; flex-direction: column;">
            
            <!-- Wine name -->
            <div style="text-align: center; margin-bottom: 20px; background-color: #FFFFFF; flex-shrink: 0;">
              <h2 style="font-family: Georgia, Times, serif; text-transform: uppercase; letter-spacing: 0.05em; line-height: 1.1; font-size: 52px; font-weight: 700; color: #111827; margin: 0; word-break: break-word; background-color: #FFFFFF;">
                ${wineName}
              </h2>
              ${domainName ? `<p style="font-size: 28px; color: #6B7280; margin: 12px 0 0 0; background-color: #FFFFFF;">${domainName}</p>` : ""}
            </div>

            <!-- Separator -->
            <div style="width: 100px; height: 3px; background-color: #D1D5DB; margin: 0 auto 24px auto; flex-shrink: 0;"></div>

            <!-- Main image - prend l'espace disponible -->
            <div style="flex: 1; display: flex; align-items: center; justify-content: center; background-color: #FFFFFF; min-height: 0;">
              ${
                imageUrl
                  ? `<img src="${imageUrl}" alt="${wineName}" crossorigin="anonymous" style="max-width: 100%; max-height: 100%; object-fit: contain; border-radius: 16px;" />`
                  : `<div style="width: 350px; height: 350px; background-color: #F3F4F6; border-radius: 16px; display: flex; align-items: center; justify-content: center;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="#D1D5DB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>
                   </div>`
              }
            </div>

            <!-- Content quote -->
            ${content ? `<p style="text-align: center; font-style: italic; line-height: 1.5; margin: 24px 0; font-size: 32px; color: #4B5563; background-color: #FFFFFF; flex-shrink: 0;">"${content}"</p>` : ""}

            <!-- Rating and tasting bars - en bas -->
            ${
              migratedNotice
                ? `
              <div style="background-color: #FFFFFF; flex-shrink: 0; margin-top: auto; padding-top: 24px;">
                <div style="text-align: center; margin-bottom: 32px; background-color: #FFFFFF;">
                  <span style="font-size: 72px; line-height: 1; color: #111827; font-weight: bold;">${migratedNotice.rating}</span>
                  <span style="font-size: 48px; color: #9CA3AF;">/10</span>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 28px 40px; background-color: #FFFFFF;">
                  ${tastingBar(sliders.slot1.label, migratedNotice.slot1)}
                  ${tastingBar(sliders.slot2.label, migratedNotice.slot2)}
                  ${tastingBar(sliders.slot3.label, migratedNotice.slot3)}
                  ${tastingBar(sliders.slot4.label, migratedNotice.slot4)}
                </div>
              </div>
            `
                : ""
            }
          </div>
        </div>

        <!-- Footer -->
        <div style="position: absolute; bottom: 60px; left: 0; right: 0; display: flex; align-items: center; justify-content: center; gap: 10px;">
          <span style="font-size: 36px; font-weight: 500; color: ${footerTextColor};">@winenote</span>
          ${wineIconSvg}
        </div>
      </div>
    </body>
    </html>
  `;
};

// Story Template pour la preview (composant React)
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

  const TastingBar = ({ label, value }: { label: string; value: number }) => (
    <div style={{ backgroundColor: "#FFFFFF" }}>
      <span
        style={{
          color: "#6B7280",
          fontSize: "28px",
          fontStyle: "italic",
          display: "block",
          marginBottom: "16px",
          backgroundColor: "#FFFFFF",
        }}
      >
        {label}
      </span>
      <div style={{ height: "20px", borderRadius: "10px", backgroundColor: "#E5E7EB", overflow: "hidden" }}>
        <div
          style={{ height: "100%", borderRadius: "10px", width: `${(value / 10) * 100}%`, backgroundColor: "#1F2937" }}
        />
      </div>
    </div>
  );

  return (
    <div style={{ width: "1080px", height: "1920px", backgroundColor, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          left: "80px",
          top: "200px",
          width: "920px",
          height: "1540px",
          backgroundColor: "#FFFFFF",
          borderRadius: "48px",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.15)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            padding: "48px",
            backgroundColor: "#FFFFFF",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Wine name */}
          <div style={{ textAlign: "center", marginBottom: "20px", backgroundColor: "#FFFFFF", flexShrink: 0 }}>
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
                backgroundColor: "#FFFFFF",
              }}
            >
              {wineName}
            </h2>
            {domainName && (
              <p style={{ fontSize: "28px", color: "#6B7280", margin: "12px 0 0 0", backgroundColor: "#FFFFFF" }}>
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
              flexShrink: 0,
            }}
          />

          {/* Main image */}
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#FFFFFF",
              minHeight: 0,
            }}
          >
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={wineName}
                style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain", borderRadius: "16px" }}
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
                margin: "24px 0",
                fontSize: "32px",
                color: "#4B5563",
                backgroundColor: "#FFFFFF",
                flexShrink: 0,
              }}
            >
              "{content}"
            </p>
          )}

          {/* Rating and tasting bars */}
          {migratedNotice && (
            <div style={{ backgroundColor: "#FFFFFF", flexShrink: 0, marginTop: "auto", paddingTop: "24px" }}>
              <div style={{ textAlign: "center", marginBottom: "32px", backgroundColor: "#FFFFFF" }}>
                <span style={{ fontSize: "72px", lineHeight: 1, color: "#111827", fontWeight: "bold" }}>
                  {migratedNotice.rating}
                </span>
                <span style={{ fontSize: "48px", color: "#9CA3AF" }}>/10</span>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: "28px 40px",
                  backgroundColor: "#FFFFFF",
                }}
              >
                <TastingBar label={sliders.slot1.label} value={migratedNotice.slot1} />
                <TastingBar label={sliders.slot2.label} value={migratedNotice.slot2} />
                <TastingBar label={sliders.slot3.label} value={migratedNotice.slot3} />
                <TastingBar label={sliders.slot4.label} value={migratedNotice.slot4} />
              </div>
            </div>
          )}
        </div>
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
          gap: "10px",
        }}
      >
        <span style={{ fontSize: "36px", fontWeight: 500, color: footerTextColor }}>@winenote</span>
        <Wine style={{ width: "30px", height: "30px", color: footerTextColor, transform: "translateY(6px)" }} />
      </div>
    </div>
  );
};

export const ShareStoryDialog = ({ open, onOpenChange, post, wine }: ShareStoryDialogProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState(STORY_COLORS[0].value);

  const displayImage = post.image_url || wine?.label_url;
  const wineName = wine?.name || "Dégustation";
  const domainName = wine?.domain?.name;
  const wineNotice = post.is_wine_notice ? post.wine_notice : null;

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    try {
      const html2canvas = (await import("html2canvas")).default;

      // Créer un iframe invisible
      const iframe = document.createElement("iframe");
      iframe.style.cssText = `
        position: fixed;
        left: -9999px;
        top: -9999px;
        width: 1080px;
        height: 1920px;
        border: none;
        visibility: hidden;
        pointer-events: none;
      `;
      document.body.appendChild(iframe);

      await new Promise((resolve) => setTimeout(resolve, 100));

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) {
        document.body.removeChild(iframe);
        throw new Error("Cannot access iframe document");
      }

      const html = generateStoryHTML({
        wineName,
        domainName,
        imageUrl: displayImage,
        wineNotice,
        wineTypeId: wine?.type,
        content: post.content,
        backgroundColor: selectedColor,
      });

      iframeDoc.open();
      iframeDoc.write(html);
      iframeDoc.close();

      await new Promise((resolve) => setTimeout(resolve, 800));

      const target = iframeDoc.body.firstElementChild as HTMLElement;
      if (!target) {
        document.body.removeChild(iframe);
        throw new Error("No content in iframe");
      }

      const canvas = await html2canvas(target, {
        scale: 1,
        width: 1080,
        height: 1920,
        useCORS: true,
        allowTaint: true,
        backgroundColor: selectedColor,
        logging: false,
        imageTimeout: 15000,
      });

      document.body.removeChild(iframe);

      return new Promise((resolve) => {
        canvas.toBlob((blob) => resolve(blob), "image/png", 1.0);
      });
    } catch (error) {
      console.error("Erreur génération image:", error);
      return null;
    }
  }, [wineName, domainName, displayImage, wineNotice, wine?.type, post.content, selectedColor]);

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
