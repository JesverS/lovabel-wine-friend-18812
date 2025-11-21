import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function AuthConfirm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const verifyToken = async () => {
      const token_hash = searchParams.get("token_hash");
      const type = searchParams.get("type");
      const next = searchParams.get("next") || "/";

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
        // Vérifier le token OTP
        const { error } = await supabase.auth.verifyOtp({
          token_hash,
          type: type as any,
        });

        if (error) {
          console.error("Erreur vérification OTP:", error);
          throw error;
        }

        // Succès ! Rediriger vers la page de reset password
        if (type === "recovery") {
          navigate("/auth/reset-password");
        } else {
          navigate(next);
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
  }, [searchParams, navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="text-muted-foreground">Vérification en cours...</p>
      </div>
    </div>
  );
}
