import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier qu'on a bien un token dans l'URL
    const tokenHash = searchParams.get("token_hash");
    const type = searchParams.get("type");

    if (!tokenHash || type !== "recovery") {
      toast({
        title: "Lien invalide",
        description: "Veuillez utiliser le lien reçu par email",
        variant: "destructive",
      });
      navigate("/auth");
    }
  }, [searchParams, navigate, toast]);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (password !== confirmPassword) {
        toast({
          title: "Erreur",
          description: "Les mots de passe ne correspondent pas",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      if (password.length < 6) {
        toast({
          title: "Erreur",
          description: "Le mot de passe doit contenir au moins 6 caractères",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      const tokenHash = searchParams.get("token_hash");

      // Vérifier le token OTP
      const { error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash!,
        type: "recovery",
      });

      if (verifyError) {
        console.error("Erreur vérification OTP:", verifyError);
        throw verifyError;
      }

      // Maintenant mettre à jour le mot de passe
      const { error: passwordError } = await supabase.auth.updateUser({
        password: password,
      });

      if (passwordError) throw passwordError;

      toast({
        title: "Mot de passe changé! ✓",
        description: "Votre mot de passe a été mis à jour avec succès.",
      });

      // Vérifier le profil
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
      } else {
        // Si pas d'utilisateur connecté, rediriger vers login
        navigate("/auth");
      }
    } catch (error: any) {
      console.error("Erreur reset password:", error);
      toast({
        title: "Erreur",
        description: error.message || "Le lien a expiré ou est invalide. Veuillez redemander un nouveau lien.",
        variant: "destructive",
      });

      // Rediriger vers la page d'auth après 2 secondes
      setTimeout(() => {
        navigate("/auth");
      }, 2000);
    } finally {
      setLoading(false);
    }
  };

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
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Chargement..." : "Changer le mot de passe"}
            </Button>

            <button
              type="button"
              onClick={() => navigate("/auth")}
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline w-full"
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
