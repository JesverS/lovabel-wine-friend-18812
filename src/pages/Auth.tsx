import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [isResetPassword, setIsResetPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    // Vérifier si l'utilisateur arrive avec un token de réinitialisation
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPassword(true);
        setIsForgotPassword(false);
        setIsLogin(false);
      }
    });
  }, []);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isResetPassword) {
        if (password !== confirmPassword) {
          toast({
            title: 'Erreur',
            description: 'Les mots de passe ne correspondent pas',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.updateUser({
          password: password,
        });
        
        if (error) throw error;
        
        toast({ 
          title: 'Mot de passe changé!',
          description: 'Votre mot de passe a été mis à jour avec succès.'
        });
        setIsResetPassword(false);
        setIsLogin(true);
        setPassword('');
        setConfirmPassword('');
        navigate('/');
      } else if (isForgotPassword) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/auth`,
        });
        if (error) throw error;
        toast({ 
          title: 'Email envoyé!',
          description: 'Vérifiez votre boîte mail pour réinitialiser votre mot de passe.'
        });
        setIsForgotPassword(false);
        setIsLogin(true);
      } else if (isLogin) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        
        // Vérifier si le profil est complet
        if (data.user) {
          const { data: profile, error: profileError } = await supabase
            .from('user_profiles')
            .select('*')
            .eq('id', data.user.id)
            .maybeSingle();
          
          // Rediriger vers complete-profile si les champs obligatoires sont vides
          if (!profileError && profile) {
            const isComplete = profile.full_name && profile.last_name && profile.city;
            if (!isComplete) {
              toast({ 
                title: 'Bienvenue!',
                description: 'Veuillez compléter votre profil'
              });
              navigate('/complete-profile');
              return;
            }
          }
        }
        
        toast({ title: 'Connexion réussie!' });
        navigate('/');
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
          },
        });
        if (error) throw error;
        toast({ 
          title: 'Inscription réussie!',
          description: 'Vérifiez votre email pour confirmer votre compte.'
        });
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-primary mb-2">Lovabel</h1>
          <p className="text-muted-foreground">
            {isResetPassword
              ? 'Changez votre mot de passe'
              : isForgotPassword 
              ? 'Réinitialisez votre mot de passe' 
              : isLogin 
              ? 'Connectez-vous à votre compte' 
              : 'Créez votre compte'}
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-6 bg-card p-8 rounded-lg border">
          {!isResetPassword && (
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="password">{isResetPassword ? 'Nouveau mot de passe' : 'Mot de passe'}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          )}

          {isResetPassword && (
            <div className="space-y-2">
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
              ? 'Chargement...' 
              : isResetPassword
              ? 'Changer le mot de passe'
              : isForgotPassword 
              ? 'Envoyer le lien de réinitialisation'
              : isLogin 
              ? 'Se connecter' 
              : "S'inscrire"}
          </Button>

          {!isResetPassword && (
            <div className="text-center space-y-2">
              {isLogin && !isForgotPassword && (
                <button
                  type="button"
                  onClick={() => {
                    setIsForgotPassword(true);
                    setPassword('');
                  }}
                  className="text-sm text-primary hover:underline block w-full"
                >
                  Mot de passe oublié ?
                </button>
              )}
              
              <button
                type="button"
                onClick={() => {
                  setIsForgotPassword(false);
                  setIsLogin(!isLogin);
                  setPassword('');
                }}
                className="text-sm text-primary hover:underline block w-full"
              >
                {isForgotPassword
                  ? 'Retour à la connexion'
                  : isLogin
                  ? "Pas encore de compte ? S'inscrire"
                  : 'Déjà un compte ? Se connecter'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
