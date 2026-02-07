import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useUserRole } from '@/hooks/useUserRole';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Crown, Sparkles, ScanLine, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export function InviteKeyRedemption() {
  const { hasRole, role, loading: roleLoading, refresh } = useUserRole();
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleRedeem = async () => {
    if (!code.trim()) return;
    
    setSubmitting(true);
    setError(null);
    setSuccess(false);

    try {
      const { data, error: fnError } = await supabase.functions.invoke('redeem-invite-key', {
        body: { code: code.trim() }
      });

      if (fnError) {
        setError('Erreur de connexion au serveur');
        return;
      }

      if (data?.error) {
        setError(data.error);
        return;
      }

      if (data?.success) {
        setSuccess(true);
        setCode('');
        refresh();
      }
    } catch (err) {
      console.error('Error redeeming key:', err);
      setError('Une erreur inattendue est survenue');
    } finally {
      setSubmitting(false);
    }
  };

  if (roleLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Status Card */}
      <Card className={hasRole ? 'border-primary/30 bg-primary/5' : ''}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Crown className="h-5 w-5 text-primary" />
            Fonctionnalités Premium
          </CardTitle>
          <CardDescription>
            {hasRole 
              ? 'Votre compte bénéficie des fonctionnalités premium.'
              : 'Entrez un code d\'invitation pour débloquer les fonctionnalités premium.'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {hasRole ? (
            <div className="flex items-center gap-2">
              <Badge className="bg-primary text-primary-foreground">
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Premium actif
              </Badge>
              <span className="text-sm text-muted-foreground">
                Rôle : {role}
              </span>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Entrez votre code d'invitation"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setError(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleRedeem()}
                  disabled={submitting}
                  className="font-mono tracking-wider"
                />
                <Button 
                  onClick={handleRedeem} 
                  disabled={submitting || !code.trim()}
                >
                  {submitting ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    'Activer'
                  )}
                </Button>
              </div>

              {error && (
                <div className="flex items-center gap-2 text-sm text-destructive">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-2 text-sm text-primary">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  Fonctionnalités premium activées !
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Features List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Fonctionnalités incluses
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-3">
            <li className="flex items-start gap-3">
              <ScanLine className="h-5 w-5 mt-0.5 text-primary shrink-0" />
              <div>
                <p className="font-medium">Scanner IA d'étiquettes de vin</p>
                <p className="text-sm text-muted-foreground">
                  Photographiez une étiquette pour identifier automatiquement le vin, le domaine et l'appellation.
                </p>
              </div>
            </li>
            <li className="flex items-start gap-3 opacity-50">
              <Sparkles className="h-5 w-5 mt-0.5 shrink-0" />
              <div>
                <p className="font-medium">Plus de fonctionnalités à venir...</p>
                <p className="text-sm text-muted-foreground">
                  De nouvelles fonctionnalités premium seront ajoutées régulièrement.
                </p>
              </div>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
