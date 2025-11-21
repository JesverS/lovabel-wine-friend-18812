import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionChecked, setSessionChecked] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasCheckedSession = useRef(false);

  useEffect(() => {
    // Vérifier une seule fois que l'utilisateur est bien connecté
    const checkSession = async () => {
      if (hasCheckedSession.current) return;
      hasCheckedSession.current = true;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          toast({
            title: "Session expirée",
            description: "Veuillez redemander un lien de réinitialisation.",
            variant: "destructive",
          });
          navigate("/auth");
        } else {
          setSessionChecked(true);
        }
      } catch (error) {
        console.error("Erreur vérification session:", error);
        navigate("/auth");
      }
    };

    checkSession();
  }, []); // Pas de dépendances pour ne s'exécuter qu'une fois

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return; // Empêcher les doubles soumissions

    setLoading(true);

    try {
      if (password !== confirmPassword) {
        toast({
          title: "Erreur",
          description: "Les mots de passe ne correspondent pas",
          variant: "destructive",
        });
        return;
      }

      if (password.length < 6) {
        toast({
          title: "Erreur",
          description: "Le mot de passe doit contenir au moins 6 caractères",
          variant: "destructive",
        });
        return;
      }

      console.log("Mise à jour du mot de passe...");

      // L'utilisateur est déjà authentifié, on met juste à jour le mot de passe
      const { error } = await supabase.auth.updateUser({
        password: password,
      });

      if (error) {
        console.error("Erreur changement mot de passe:", error);
        throw error;
      }

      console.log("Mot de passe changé avec succès");

      toast({
        title: "Mot de passe changé! ✓",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });

      // Attendre 1 seconde avant de vérifier le profil
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Vérifier le profil et rediriger
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile } = await supabase.from("user_profiles").select("*").eq("id", user.id).maybeSingle();

        if (!profile || !profile.full_name || !profile.last_name || !profile.city) {
          navigate("/complete-profile");
        } else {
          navigate("/");
        }
      }
    } catch (error: any) {
      console.error("Erreur reset password:", error);
      toast({
        title: "Erreur",
        description: error.message || "Une erreur est survenue. Veuillez réessayer.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!sessionChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="text-muted-foreground">Vérification...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Wine Note</h1>
          <p className="text-muted-foreground">Choisissez votre nouveau mot de passe</p>
        </div>

        <h2 className="text-2xl font-bold text-center">Réinitialiser le mot de passe</h2>

        <div className="space-y-6 bg-card p-8 rounded-lg border">
          <form onSubmit={handleResetPassword} className="space-y-6">
            <div>
              <Label htmlFor="password">Nouveau mot de passe</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                autoFocus
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground mt-1">Minimum 6 caractères</p>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
                disabled={loading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Chargement..." : "Changer le mot de passe"}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline w-full"
              disabled={loading}
            >
              <ArrowLeft className="w-4 h-4" />
              Retour à la connexion
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
