import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Copy, Loader2, Check, Instagram, Wine } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

interface PalaisStats {
  total: number;
  avgRating: number | null;
  likedCount: number;
  uniqueDomains: number;
  typeData: { label: string; count: number; fill: string }[];
  topRegions: { region: string; count: number }[];
}

interface SharePalaisStoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stats: PalaisStats;
  userName?: string;
}

const STORY_COLORS = [
  { name: "Bordeaux", value: "#6A1B2B" },
  { name: "Or", value: "#C9A227" },
  { name: "Noir", value: "#1A1A1A" },
  { name: "Beige", value: "#F5F0E8" },
];

const generatePalaisHTML = (stats: PalaisStats, backgroundColor: string, userName?: string): string => {
  const isLight = backgroundColor === "#C9A227" || backgroundColor === "#F5F0E8";
  const footerColor = isLight ? "#1A1A1A" : "#FFFFFF";
  const maxType = stats.typeData[0]?.count || 1;

  const typeBars = stats.typeData.slice(0, 5).map(t => `
    <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px; background-color: #FFFFFF;">
      <span style="font-size: 26px; color: #6B7280; width: 180px; text-align: right; background-color: #FFFFFF;">${t.label}</span>
      <div style="flex: 1; height: 28px; border-radius: 14px; background-color: #E5E7EB; overflow: hidden;">
        <div style="height: 100%; border-radius: 14px; width: ${(t.count / maxType) * 100}%; background-color: ${t.fill};"></div>
      </div>
      <span style="font-size: 26px; font-weight: 600; color: #111827; width: 60px; background-color: #FFFFFF;">${t.count}</span>
    </div>
  `).join('');

  const regionsList = stats.topRegions.slice(0, 5).map((r, i) => `
    <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 0; border-bottom: 1px solid #E5E7EB; background-color: #FFFFFF;">
      <span style="font-size: 28px; color: #111827; background-color: #FFFFFF;">${i + 1}. ${r.region}</span>
      <span style="font-size: 28px; font-weight: 600; color: #6B7280; background-color: #FFFFFF;">${r.count}</span>
    </div>
  `).join('');

  return `<!DOCTYPE html><html><head><style>*{margin:0;padding:0;box-sizing:border-box;}body{margin:0;}</style></head><body>
    <div style="width:1080px;height:1920px;background-color:${backgroundColor};position:relative;overflow:hidden;">
      <div style="position:absolute;left:80px;top:120px;width:920px;height:1640px;background-color:#FFFFFF;border-radius:48px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.15);overflow:hidden;">
        <div style="padding:56px;background-color:#FFFFFF;">
          <h1 style="font-family:Georgia,Times,serif;font-size:56px;font-weight:700;color:#111827;text-align:center;margin-bottom:8px;background-color:#FFFFFF;">Mon Palais</h1>
          ${userName ? `<p style="font-size:28px;color:#6B7280;text-align:center;margin-bottom:24px;background-color:#FFFFFF;">${userName}</p>` : ''}
          <div style="width:100px;height:3px;background-color:#D1D5DB;margin:0 auto 32px auto;"></div>

          <!-- Key metrics -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:40px;background-color:#FFFFFF;">
            <div style="text-align:center;padding:20px;border-radius:16px;background-color:#F9FAFB;">
              <div style="font-size:56px;font-weight:700;color:#111827;">${stats.total}</div>
              <div style="font-size:22px;color:#6B7280;">Dégustations</div>
            </div>
            <div style="text-align:center;padding:20px;border-radius:16px;background-color:#F9FAFB;">
              <div style="font-size:56px;font-weight:700;color:#111827;">${stats.avgRating ? stats.avgRating.toFixed(1) : '—'}</div>
              <div style="font-size:22px;color:#6B7280;">Note moyenne</div>
            </div>
            <div style="text-align:center;padding:20px;border-radius:16px;background-color:#F9FAFB;">
              <div style="font-size:56px;font-weight:700;color:#111827;">${stats.likedCount}</div>
              <div style="font-size:22px;color:#6B7280;">Vins aimés</div>
            </div>
            <div style="text-align:center;padding:20px;border-radius:16px;background-color:#F9FAFB;">
              <div style="font-size:56px;font-weight:700;color:#111827;">${stats.uniqueDomains}</div>
              <div style="font-size:22px;color:#6B7280;">Domaines</div>
            </div>
          </div>

          <!-- Type distribution -->
          <h3 style="font-size:30px;font-weight:600;color:#111827;margin-bottom:16px;background-color:#FFFFFF;">Répartition</h3>
          <div style="margin-bottom:36px;background-color:#FFFFFF;">
            ${typeBars}
          </div>

          <!-- Top regions -->
          ${stats.topRegions.length > 0 ? `
            <h3 style="font-size:30px;font-weight:600;color:#111827;margin-bottom:12px;background-color:#FFFFFF;">Top régions</h3>
            <div style="background-color:#FFFFFF;">
              ${regionsList}
            </div>
          ` : ''}
        </div>
      </div>

      <div style="position:absolute;bottom:60px;left:0;right:0;display:flex;align-items:center;justify-content:center;gap:16px;">
        <span style="font-size:36px;font-weight:500;color:${footerColor};">@winenote</span>
        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="${footerColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 22h8"/><path d="M7 10h10"/><path d="M12 15v7"/><path d="M12 15a5 5 0 0 0 5-5c0-2-.5-4-2-8H9c-1.5 4-2 6-2 8a5 5 0 0 0 5 5Z"/></svg>
      </div>
    </div>
  </body></html>`;
};

// Preview component
const PalaisPreviewCard = ({ stats, backgroundColor, userName }: { stats: PalaisStats; backgroundColor: string; userName?: string }) => {
  const maxType = stats.typeData[0]?.count || 1;

  return (
    <div style={{ width: "1080px", height: "1920px", backgroundColor, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", left: "80px", top: "120px", width: "920px", height: "1640px", backgroundColor: "#FFFFFF", borderRadius: "48px", boxShadow: "0 25px 50px -12px rgba(0,0,0,0.15)", overflow: "hidden" }}>
        <div style={{ padding: "56px", backgroundColor: "#FFFFFF" }}>
          <h1 style={{ fontFamily: "Georgia, Times, serif", fontSize: "56px", fontWeight: 700, color: "#111827", textAlign: "center", marginBottom: "8px", backgroundColor: "#FFFFFF" }}>Mon Palais</h1>
          {userName && <p style={{ fontSize: "28px", color: "#6B7280", textAlign: "center", marginBottom: "24px", backgroundColor: "#FFFFFF" }}>{userName}</p>}
          <div style={{ width: "100px", height: "3px", backgroundColor: "#D1D5DB", margin: "0 auto 32px auto" }} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "40px", backgroundColor: "#FFFFFF" }}>
            {[
              { value: stats.total, label: "Dégustations" },
              { value: stats.avgRating ? stats.avgRating.toFixed(1) : "—", label: "Note moyenne" },
              { value: stats.likedCount, label: "Vins aimés" },
              { value: stats.uniqueDomains, label: "Domaines" },
            ].map((m, i) => (
              <div key={i} style={{ textAlign: "center", padding: "20px", borderRadius: "16px", backgroundColor: "#F9FAFB" }}>
                <div style={{ fontSize: "56px", fontWeight: 700, color: "#111827" }}>{m.value}</div>
                <div style={{ fontSize: "22px", color: "#6B7280" }}>{m.label}</div>
              </div>
            ))}
          </div>

          <h3 style={{ fontSize: "30px", fontWeight: 600, color: "#111827", marginBottom: "16px", backgroundColor: "#FFFFFF" }}>Répartition</h3>
          <div style={{ marginBottom: "36px", backgroundColor: "#FFFFFF" }}>
            {stats.typeData.slice(0, 5).map((t, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "12px", backgroundColor: "#FFFFFF" }}>
                <span style={{ fontSize: "26px", color: "#6B7280", width: "180px", textAlign: "right", backgroundColor: "#FFFFFF" }}>{t.label}</span>
                <div style={{ flex: 1, height: "28px", borderRadius: "14px", backgroundColor: "#E5E7EB", overflow: "hidden" }}>
                  <div style={{ height: "100%", borderRadius: "14px", width: `${(t.count / maxType) * 100}%`, backgroundColor: t.fill }} />
                </div>
                <span style={{ fontSize: "26px", fontWeight: 600, color: "#111827", width: "60px", backgroundColor: "#FFFFFF" }}>{t.count}</span>
              </div>
            ))}
          </div>

          {stats.topRegions.length > 0 && (
            <>
              <h3 style={{ fontSize: "30px", fontWeight: 600, color: "#111827", marginBottom: "12px", backgroundColor: "#FFFFFF" }}>Top régions</h3>
              {stats.topRegions.slice(0, 5).map((r, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid #E5E7EB", backgroundColor: "#FFFFFF" }}>
                  <span style={{ fontSize: "28px", color: "#111827", backgroundColor: "#FFFFFF" }}>{i + 1}. {r.region}</span>
                  <span style={{ fontSize: "28px", fontWeight: 600, color: "#6B7280", backgroundColor: "#FFFFFF" }}>{r.count}</span>
                </div>
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export const SharePalaisStoryDialog = ({ open, onOpenChange, stats, userName }: SharePalaisStoryDialogProps) => {
  const { toast } = useToast();
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [selectedColor, setSelectedColor] = useState(STORY_COLORS[0].value);

  const generateImage = useCallback(async (): Promise<Blob | null> => {
    try {
      const html2canvas = (await import("html2canvas")).default;

      const iframe = document.createElement("iframe");
      iframe.style.cssText = `position:fixed;left:-9999px;top:-9999px;width:1080px;height:1920px;border:none;visibility:hidden;pointer-events:none;`;
      document.body.appendChild(iframe);

      await new Promise(r => setTimeout(r, 100));

      const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
      if (!iframeDoc) { document.body.removeChild(iframe); throw new Error("Cannot access iframe"); }

      iframeDoc.open();
      iframeDoc.write(generatePalaisHTML(stats, selectedColor, userName));
      iframeDoc.close();

      await new Promise(r => setTimeout(r, 500));

      const target = iframeDoc.body.firstElementChild as HTMLElement;
      if (!target) { document.body.removeChild(iframe); throw new Error("No content"); }

      const canvas = await html2canvas(target, {
        scale: 1, width: 1080, height: 1920, useCORS: true, allowTaint: true,
        backgroundColor: selectedColor, logging: false,
      });

      document.body.removeChild(iframe);

      return new Promise(resolve => canvas.toBlob(blob => resolve(blob), "image/png", 1.0));
    } catch (e) {
      console.error("Erreur génération image:", e);
      return null;
    }
  }, [stats, selectedColor, userName]);

  const handleDownload = async () => {
    setIsGenerating(true);
    try {
      const blob = await generateImage();
      if (!blob) throw new Error("Impossible de générer l'image");
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `winenote-mon-palais-${Date.now()}.png`;
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
            Partager Mon Palais
          </DialogTitle>
          <DialogDescription>Format 9:16 • Story Instagram</DialogDescription>
        </DialogHeader>

        <div className="flex justify-center gap-3 py-2">
          {STORY_COLORS.map(color => (
            <button
              key={color.value}
              onClick={() => setSelectedColor(color.value)}
              className={cn(
                "w-10 h-10 rounded-full border-2 transition-all hover:scale-105",
                selectedColor === color.value ? "border-primary ring-2 ring-primary/30 scale-110" : "border-white/50",
              )}
              style={{ backgroundColor: color.value }}
              title={color.name}
            />
          ))}
        </div>

        <div className="relative overflow-hidden rounded-xl bg-muted/50">
          <div className="relative mx-auto overflow-hidden rounded-lg shadow-xl" style={{ width: "270px", height: "480px" }}>
            <div style={{ transform: "scale(0.25)", transformOrigin: "top left", position: "absolute", top: 0, left: 0 }}>
              <PalaisPreviewCard stats={stats} backgroundColor={selectedColor} userName={userName} />
            </div>
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" className="flex-1 gap-2" onClick={handleCopy} disabled={isGenerating}>
            {isCopied ? <><Check className="w-4 h-4" />Copié !</> : <><Copy className="w-4 h-4" />Copier</>}
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
