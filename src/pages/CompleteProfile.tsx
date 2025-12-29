import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { geocodeAddress } from "@/lib/utils";
import { sanitizeSlugInput } from "@/lib/slugUtils";
import CGUDialog from "@/components/CGUDialog";
import { CGU_VERSION, CGU_TEXT } from "@/content/cgu-text";

export default function CompleteProfile() {
  const { user, session } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [formData, setFormData] = useState({
    full_name: "",
    last_name: "",
    city: "",
    address: "",
    phone_number: "",
  });
  const [slug, setSlug] = useState("");
  const [slugError, setSlugError] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  
  // CGU states
  const [cguAccepted, setCguAccepted] = useState(false);
  const [cguAlreadyAccepted, setCguAlreadyAccepted] = useState(false);
  const [showCGUDialog, setShowCGUDialog] = useState(false);

  // Déterminer la méthode d'authentification
  const getAcceptanceMethod = (): string => {
    if (!session?.user) return "unknown";
    const provider = session.user.app_metadata?.provider;
    if (provider === "google") return "google_oauth";
    if (provider === "email") return "email_password";
    return provider || "unknown";
  };

  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      // Charger le profil
      const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();
      if (profile) {
        setFormData({
          full_name: profile.full_name || "",
          last_name: profile.last_name || "",
          city: profile.city || "",
          address: profile.address || "",
          phone_number: profile.phone_number?.toString() || "",
        });
        if (profile.slug) {
          setSlug(profile.slug);
          setSlugTouched(true);
        }
      }

      // Vérifier si l'utilisateur a déjà accepté les CGU de cette version
      const { data: cguData } = await supabase
        .from("cgu_acceptance")
        .select("cgu_version")
        .eq("user_id", user.id)
        .eq("cgu_version", CGU_VERSION)
        .maybeSingle();

      if (cguData) {
        setCguAccepted(true);
        setCguAlreadyAccepted(true);
      }
    };
    loadProfile();
  }, [user]);

  useEffect(() => {
    if (!slugTouched && (formData.full_name || formData.last_name)) {
      setSlug(sanitizeSlugInput(`${formData.full_name} ${formData.last_name}`.trim()));
    }
  }, [formData.full_name, formData.last_name, slugTouched]);

  useEffect(() => {
    const checkSlugAvailability = async (slugValue: string) => {
      if (!slugValue || slugValue.length === 0) {
        setSlugError("Le nom de profil ne peut pas être vide");
        return;
      }
      if (!/^[a-z0-9-]+$/.test(slugValue)) {
        setSlugError("Slug invalide, veuillez utiliser uniquement lettres, chiffres et tirets.");
        return;
      }
      setCheckingSlug(true);
      try {
        const { data, error } = (await supabase
          .from("user_profiles_public")
          .select("id")
          .eq("slug", slugValue)
          .maybeSingle()) as { data: { id: string } | null; error: any };
        if (error) throw error;
        if (data && data.id !== user?.id) {
          setSlugError("Nom de profil déjà pris, veuillez choisir quelque chose d'autre.");
        } else {
          setSlugError("");
        }
      } catch (error) {
        setSlugError("Erreur lors de la vérification du nom de profil");
      } finally {
        setCheckingSlug(false);
      }
    };
    const timer = setTimeout(() => {
      if (slug) checkSlugAvailability(slug);
    }, 500);
    return () => clearTimeout(timer);
  }, [slug, user?.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.full_name || !formData.last_name || !formData.city) {
      toast({ title: "Erreur", description: "Veuillez remplir tous les champs obligatoires", variant: "destructive" });
      return;
    }
    if (!slug || slug.length === 0) {
      toast({ title: "Erreur", description: "Le nom de profil est requis", variant: "destructive" });
      setCurrentPage(1);
      return;
    }
    if (slugError) {
      toast({ title: "Erreur", description: "Le nom de profil est invalide ou déjà pris", variant: "destructive" });
      setCurrentPage(1);
      return;
    }
    if (!cguAccepted) {
      toast({ title: "Erreur", description: "Vous devez accepter les Conditions Générales d'Utilisation", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      // Si les CGU n'ont pas encore été acceptées pour cette version, les enregistrer
      if (!cguAlreadyAccepted) {
        const { error: cguError } = await supabase.functions.invoke('accept-cgu', {
          body: {
            acceptance_method: getAcceptanceMethod(),
            cgu_version: CGU_VERSION,
            cgu_text: CGU_TEXT
          }
        });

        if (cguError) {
          console.error('Error accepting CGU:', cguError);
          throw new Error("Erreur lors de l'enregistrement de l'acceptation des CGU");
        }
      }

      // Géocoder l'adresse si fournie
      let coordinates = null;
      if (formData.address) coordinates = await geocodeAddress(formData.address);
      
      // Mettre à jour le profil
      const { error } = await supabase
        .from("user_profiles")
        .update({
          full_name: formData.full_name,
          last_name: formData.last_name,
          slug,
          city: formData.city,
          address: formData.address || null,
          phone_number: formData.phone_number ? Number(formData.phone_number) : null,
          latitude: coordinates?.latitude || null,
          longitude: coordinates?.longitude || null,
        })
        .eq("id", user?.id);
        
      if (error) throw error;
      
      toast({ title: "Profil complété avec succès!" });
      navigate(`/user/${slug}`);
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl bg-card rounded-lg shadow-lg p-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-center mb-2">Compléter votre profil</h1>
          <p className="text-center text-muted-foreground">Page {currentPage} sur 2</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          {currentPage === 1 ? (
            <>
              <h2 className="text-xl font-semibold">Informations personnelles</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="full_name">
                    Prénom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="full_name"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="Jean"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="last_name">
                    Nom <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={formData.last_name}
                    onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                    placeholder="Dupont"
                    required
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="slug">
                  Nom de profil <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(sanitizeSlugInput(e.target.value));
                  }}
                  placeholder="mon-nom-de-profil"
                  className={slugError ? "border-destructive focus-visible:ring-destructive" : ""}
                  required
                />
                {checkingSlug && (
                  <p className="text-sm text-muted-foreground mt-1">Vérification de la disponibilité...</p>
                )}
                {slugError && <p className="text-sm text-destructive mt-1">{slugError}</p>}
              </div>
              <Button
                type="button"
                onClick={() => setCurrentPage(2)}
                disabled={!formData.full_name || !formData.last_name || !slug || !!slugError || checkingSlug}
                className="w-full"
              >
                Suivant
              </Button>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold">Contact et localisation</h2>
              <div>
                <Label htmlFor="city">
                  Ville <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="city"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  placeholder="Paris"
                  required
                />
              </div>
              <div>
                <Label htmlFor="phone_number">Téléphone</Label>
                <Input
                  id="phone_number"
                  type="tel"
                  value={formData.phone_number}
                  onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
                  placeholder="0123456789"
                />
              </div>
              <div>
                <Label htmlFor="address">Adresse</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="123 Rue de la République"
                />
              </div>

              {/* Section CGU */}
              <div className="border-t pt-6 mt-6">
                <div className="flex items-start space-x-3">
                  <Checkbox
                    id="cgu"
                    checked={cguAccepted}
                    onCheckedChange={(checked) => setCguAccepted(checked === true)}
                    disabled={cguAlreadyAccepted}
                  />
                  <div className="flex flex-col">
                    <label
                      htmlFor="cgu"
                      className="text-sm font-medium leading-none cursor-pointer peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      J'accepte les{" "}
                      <button
                        type="button"
                        onClick={() => setShowCGUDialog(true)}
                        className="text-primary underline hover:text-primary/80"
                      >
                        Conditions Générales d'Utilisation
                      </button>
                      <span className="text-destructive"> *</span>
                    </label>
                    {cguAlreadyAccepted && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Vous avez déjà accepté la version {CGU_VERSION} des CGU
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <Button type="button" onClick={() => setCurrentPage(1)} variant="outline" className="flex-1">
                  Précédent
                </Button>
                <Button type="submit" className="flex-1" disabled={loading || !formData.city || !cguAccepted}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Enregistrement...
                    </>
                  ) : (
                    "Enregistrer"
                  )}
                </Button>
              </div>
            </>
          )}
        </form>
      </div>

      <CGUDialog open={showCGUDialog} onOpenChange={setShowCGUDialog} />
    </div>
  );
}
