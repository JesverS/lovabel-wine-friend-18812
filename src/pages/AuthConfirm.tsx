import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const hasVerified = useRef(false);

  useEffect(() => {
    const verifyToken = async () => {
      // Empêcher les appels multiples
      if (hasVerified.current) return;
      hasVerified.current = true;

      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const next = searchParams.get("next") || "/";

      console.log("AuthConfirm - token_hash:", token_hash);
      console.log("AuthConfirm - type:", type);

      if (!token_hash || !type) {
        toast({
          title: "Lien invalide",
          description: "Le lien de réinitialisation est invalide.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      try {
        console.log("Appel verifyOtp...");

        // Vérifier le token OTP
        const { data, error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        console.log("Résultat verifyOtp:", { data, error });

        if (error) {
          console.error("Erreur vérification OTP:", error);
          throw error;
        }

        console.log("Token vérifié avec succès, session créée");

        // Attendre un peu pour que la session soit bien établie
        await new Promise((resolve) => setTimeout(resolve, 500));

        // Succès ! Rediriger vers la page de reset password
        if (type === "recovery") {
          console.log("Redirection vers /auth/reset-password");
          navigate("/auth/reset-password", { replace: true });
        } else {
          navigate(next, { replace: true });
        }
      } catch (error: any) {
        console.error("Erreur confirmation:", error);
        toast({
          title: "Lien expiré",
          description: "Ce lien a expiré. Veuillez en demander un nouveau.",
          variant: "destructive",
        });
        navigate("/auth");
      }
    };

    verifyToken();
  }, []); // Pas de dépendances pour ne s'exécuter qu'une fois

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Vérification en cours...</p>
      </div>
    </div>
  );
}
