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
  const [token, setToken] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"token" | "password">("token");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Si le token est dans l'URL, on passe directement à l'étape password
    const urlToken = searchParams.get("token");
    if (urlToken) {
      setToken(urlToken);
      setStep("password");
    }
  }, [searchParams]);

  const handleVerifyToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      toast({
        title: "Code requis",
        description: "Veuillez entrer le code reçu par email",
        variant: "destructive",
      });
      return;
    }
    setStep("password");
  };

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

      // Vérifier le token OTP et mettre à jour le mot de passe
      const { error } = await supabase.auth.verifyOtp({
        token_hash: token,
        type: "recovery",
      });

      if (error) {
        // Si verifyOtp échoue, essayer avec updateUser directement
        // (au cas où l'utilisateur serait déjà connecté)
        const { error: updateError } = await supabase.auth.updateUser({
          password: password,
        });

        if (updateError) throw updateError;
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
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", user.id)
          .maybeSingle();

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
        description: error.message || "Une erreur est survenue lors de la réinitialisation.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Wine Note</h1>
          <p className="text-muted-foreground">
            {step === "token"
              ? "Entrez votre code de vérification"
              : "Choisissez un nouveau mot de passe"}
          </p>
        </div>

        <div className="space-y-6 bg-card p-8 rounded-lg border">
          {step === "token" ? (
            <form onSubmit={handleVerifyToken} className="space-y-6">
              <div>
                <Label htmlFor="token">Code de vérification</Label>
                <Input
                  id="token"
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  required
                  placeholder="Entrez le code reçu par email"
                  className="text-center text-lg tracking-widest font-mono"
                  autoComplete="off"
                />
                <p className="text-xs text-muted-foreground mt-2">
                  Vérifiez votre boîte mail pour obtenir le code
                </p>
              </div>

              <Button type="submit" className="w-full">
                Continuer
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
          ) : (
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
                onClick={() => {
                  setStep("token");
                  setToken("");
                }}
                className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary hover:underline w-full"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
