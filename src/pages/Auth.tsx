import { useState, useEffect } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function Auth() {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Helper pour valider les redirections (sécurité open redirect)
  const isValidRedirect = (url: string | null): boolean => {
    if (!url) return false;
    return url.startsWith("/") && !url.startsWith("//");
  };

  const redirectUrl = searchParams.get("redirect");
  const safeRedirectUrl = isValidRedirect(redirectUrl) ? redirectUrl : null;

  useEffect(() => {
    // Vérifier si on est en mode reset password via les paramètres URL
    const type = searchParams.get("type");
    const accessToken = searchParams.get("access_token");

    if (type === "recovery" && accessToken) {
      console.log("Mode reset password détecté via URL params");
      setIsResetPassword(true);
      setIsForgotPassword(false);
      setIsLogin(false);
    }

    // Écouter les changements d'état d'authentification
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth event:", event);

      if (event === "PASSWORD_RECOVERY") {
        console.log("PASSWORD_RECOVERY event détecté");
        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsLogin(false);
      } else if (event === "SIGNED_IN" && session?.user && !isResetPassword) {
        // Récupérer la redirection stockée avant OAuth OU depuis l'URL
        const oauthRedirect = sessionStorage.getItem("oauth_redirect");
        const effectiveRedirect = oauthRedirect || safeRedirectUrl;
        
        // Nettoyer le storage OAuth
        if (oauthRedirect) {
          sessionStorage.removeItem("oauth_redirect");
        }
        
        const { data: profile } = await supabase
          .from("user_profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (!profile || !profile.full_name || !profile.last_name || !profile.city) {
          // Stocker la redirection pour après le complete-profile
          if (effectiveRedirect) {
            sessionStorage.setItem("post_profile_redirect", effectiveRedirect);
          }
          toast({ title: "Bienvenue!", description: "Veuillez compléter votre profil" });
          navigate("/complete-profile");
        } else {
          toast({ title: "Connexion réussie!" });
          navigate(effectiveRedirect || "/");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate, toast, searchParams, isResetPassword, safeRedirectUrl]);

  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      // Stocker la redirection AVANT l'appel OAuth (sera perdue après redirect)
      if (safeRedirectUrl) {
        sessionStorage.setItem("oauth_redirect", safeRedirectUrl);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleAppleAuth = async () => {
    setLoading(true);
    try {
      // Stocker la redirection AVANT l'appel OAuth (sera perdue après redirect)
      if (safeRedirectUrl) {
        sessionStorage.setItem("oauth_redirect", safeRedirectUrl);
      }
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "apple",
        options: {
          redirectTo: `${window.location.origin}/auth`,
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
      setLoading(false);
    }
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        if (password !== confirmPassword) {
          toast({ title: "Erreur", description: "Les mots de passe ne correspondent pas", variant: "destructive" });
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

        const { error } = await supabase.auth.updateUser({ password });

        if (error) throw error;

        toast({
          title: "Mot de passe changé! ✓",
          description: "Votre mot de passe a été mis à jour avec succès. Vous pouvez maintenant vous connecter.",
        });

        // Réinitialiser le formulaire et revenir à la connexion
        setIsResetPassword(false);
        setIsLogin(true);
        setPassword("");
        setConfirmPassword("");

        // Rediriger vers la page d'accueil après un court délai
        setTimeout(() => {
          navigate("/");
        }, 1500);
      } else if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({
          title: "Email envoyé! 📧",
          description: "Vérifiez votre boîte mail pour réinitialiser votre mot de passe.",
        });
        setIsForgotPassword(false);
        setIsLogin(true);
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        if (data.user) {
          const { data: profile } = await supabase
            .from("user_profiles")
            .select("*")
            .eq("id", data.user.id)
            .maybeSingle();
          if (!profile || !profile.full_name || !profile.last_name || !profile.city) {
            // Stocker la redirection pour après le complete-profile
            if (safeRedirectUrl) {
              sessionStorage.setItem("post_profile_redirect", safeRedirectUrl);
            }
            toast({ title: "Bienvenue!", description: "Veuillez compléter votre profil" });
            navigate("/complete-profile");
          } else {
            toast({ title: "Connexion réussie!" });
            navigate(safeRedirectUrl || "/");
          }
        }
      } else {
        // Inscription - Vérifier si l'email existe déjà via OAuth
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
          },
        });

        if (error) throw error;

        // Vérifier si c'est un "fake" signup (user existe déjà via OAuth)
        // Supabase retourne un user mais avec identities vide ou null
        if (data.user && (!data.user.identities || data.user.identities.length === 0)) {
          toast({
            title: "Compte existant détecté",
            description: "Cet email est déjà associé à un compte Google ou Apple. Utilisez ces options pour vous connecter, ou cliquez sur 'Mot de passe oublié' pour définir un mot de passe.",
            variant: "destructive",
          });
          setLoading(false);
          return;
        }

        // Nouvelle inscription réussie
        toast({
          title: "Vérifiez votre email",
          description: "Un email de confirmation vous a été envoyé. Cliquez sur le lien pour activer votre compte.",
        });
        setIsLogin(true);
        setPassword("");
      }
    } catch (error: any) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <Helmet>
        <title>Connexion | Wine Note</title>
        <meta name="description" content="Connectez-vous ou créez votre compte Wine Note pour accéder à vos caves, événements et cours d'œnologie." />
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <Link to="/" className="text-4xl font-bold text-primary mb-2 hover:opacity-80 transition-opacity inline-block">Wine Note</Link>
          <p className="text-muted-foreground">
            {isForgotPassword
              ? "Réinitialisation du mot de passe"
              : isResetPassword
                ? "Nouveau mot de passe"
                : isLogin
                  ? "Connectez-vous à votre compte"
                  : "Créez votre compte"}
          </p>
        </div>

        <h2 className="text-2xl font-bold text-center">
          {isForgotPassword
            ? "Mot de passe oublié"
            : isResetPassword
              ? "Réinitialiser le mot de passe"
              : isLogin
                ? "Se connecter"
                : "S'inscrire"}
        </h2>

        <div className="space-y-6 bg-card p-8 rounded-lg border">
          {!isResetPassword && !isForgotPassword && (
            <>
              <Button type="button" variant="outline" className="w-full" onClick={handleAppleAuth} disabled={loading}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"
                  />
                </svg>
                Continuer avec Apple
              </Button>
              <Button type="button" variant="outline" className="w-full" onClick={handleGoogleAuth} disabled={loading}>
                <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continuer avec Google
              </Button>
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">Ou</span>
                </div>
              </div>
            </>
          )}

          <form onSubmit={handleAuth} className="space-y-6">
            {!isResetPassword && (
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="votre@email.com"
                />
              </div>
            )}
            {!isForgotPassword && (
              <div>
                <Label htmlFor="password">{isResetPassword ? "Nouveau mot de passe" : "Mot de passe"}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!isForgotPassword}
                  placeholder="••••••••"
                  minLength={6}
                />
                {isResetPassword && <p className="text-xs text-muted-foreground mt-1">Minimum 6 caractères</p>}
              </div>
            )}
            {isResetPassword && (
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
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading
                ? "Chargement..."
                : isForgotPassword
                  ? "Envoyer le lien"
                  : isResetPassword
                    ? "Changer le mot de passe"
                    : isLogin
                      ? "Se connecter"
                      : "S'inscrire"}
            </Button>
          </form>

          {!isResetPassword && !isForgotPassword && (
            <div className="text-center space-y-2">
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="text-sm text-primary hover:underline"
              >
                {isLogin ? "Pas encore de compte ? S'inscrire" : "Déjà un compte ? Se connecter"}
              </button>
              {isLogin && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setIsLogin(false);
                  }}
                  className="block w-full text-sm text-muted-foreground hover:text-primary hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              )}
            </div>
          )}

          {(isForgotPassword || isResetPassword) && (
            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setIsResetPassword(false);
                setIsLogin(true);
              }}
              className="text-sm text-muted-foreground hover:text-primary hover:underline w-full text-center"
            >
              Retour à la connexion
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
