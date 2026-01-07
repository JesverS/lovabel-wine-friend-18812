import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Trash2, AlertTriangle, Check, X, Loader2, Info } from 'lucide-react';

interface AccountDeletionData {
  postsCount: number;
  followersCount: number;
  followingCount: number;
  likesCount: number;
  commentsCount: number;
  privateCellarsToDelete: { id: string; name: string }[];
  publicCellarsToDelete: { id: string; name: string }[];
  cellarsToLeave: { id: string; name: string }[];
}

type Step = 'info' | 'confirm' | 'cellar_warning';

export function DeleteAccountDialog() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<Step>('info');
  const [accountData, setAccountData] = useState<AccountDeletionData | null>(null);
  const [loading, setLoading] = useState(false);
  const [fetchingData, setFetchingData] = useState(false);
  const [confirmName, setConfirmName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open && user) {
      fetchAccountData();
    }
  }, [open, user]);

  useEffect(() => {
    if (!open) {
      // Reset state when dialog closes
      setStep('info');
      setConfirmName('');
      setError('');
    }
  }, [open]);

  const fetchAccountData = async () => {
    if (!user) return;
    setFetchingData(true);

    try {
      // Fetch user profile for full name
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('full_name, last_name')
        .eq('id', user.id)
        .single();
      
      const fullName = profile?.full_name 
        ? `${profile.full_name}${profile.last_name ? ' ' + profile.last_name : ''}`
        : '';
      setUserFullName(fullName);

      // Fetch posts count
      const { count: postsCount } = await supabase
        .from('post')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch followers count
      const { count: followersCount } = await supabase
        .from('user_follow')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', user.id);

      // Fetch following count
      const { count: followingCount } = await supabase
        .from('user_follow')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id);

      // Fetch likes count
      const { count: likesCount } = await supabase
        .from('post_like')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch comments count
      const { count: commentsCount } = await supabase
        .from('post_comment')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      // Fetch user's cellars with their roles
      const { data: userCellars } = await supabase
        .from('user_cellar')
        .select(`
          user_cellar_id,
          role,
          cellar:user_cellar_id (
            id,
            name,
            is_public
          )
        `)
        .eq('user_id', user.id);

      const privateCellarsToDelete: { id: string; name: string }[] = [];
      const publicCellarsToDelete: { id: string; name: string }[] = [];
      const cellarsToLeave: { id: string; name: string }[] = [];

      if (userCellars) {
        for (const uc of userCellars) {
          const cellar = uc.cellar as unknown as { id: string; name: string; is_public: boolean } | null;
          if (!cellar) continue;

          // Count other members in this cellar
          const { count: otherMembersCount } = await supabase
            .from('user_cellar')
            .select('*', { count: 'exact', head: true })
            .eq('user_cellar_id', cellar.id)
            .neq('user_id', user.id);

          if (otherMembersCount === 0) {
            // User is sole member
            if (cellar.is_public) {
              publicCellarsToDelete.push({ id: cellar.id, name: cellar.name });
            } else {
              privateCellarsToDelete.push({ id: cellar.id, name: cellar.name });
            }
          } else {
            // Other members exist
            cellarsToLeave.push({ id: cellar.id, name: cellar.name });
          }
        }
      }

      setAccountData({
        postsCount: postsCount || 0,
        followersCount: followersCount || 0,
        followingCount: followingCount || 0,
        likesCount: likesCount || 0,
        commentsCount: commentsCount || 0,
        privateCellarsToDelete,
        publicCellarsToDelete,
        cellarsToLeave,
      });
    } catch (err) {
      console.error('Error fetching account data:', err);
      toast.error('Erreur lors de la récupération des données');
    } finally {
      setFetchingData(false);
    }
  };

  const handleConfirmName = async () => {
    if (!user || !userFullName) return;
    setError('');

    // Verify the typed name matches
    if (confirmName.trim().toLowerCase() !== userFullName.trim().toLowerCase()) {
      setError('Le nom ne correspond pas');
      return;
    }

    // If user has public cellars to delete, show warning
    if (accountData && accountData.publicCellarsToDelete.length > 0) {
      setStep('cellar_warning');
    } else {
      // Proceed to deletion
      await handleDeleteAccount();
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('delete-account', {
        body: {
          cellarsToDelete: [
            ...(accountData?.privateCellarsToDelete.map(c => c.id) || []),
            ...(accountData?.publicCellarsToDelete.map(c => c.id) || []),
          ],
        },
      });

      if (fnError) {
        console.error('Delete account error:', fnError);
        setError('Erreur lors de la suppression du compte');
        setLoading(false);
        return;
      }

      // Sign out and redirect
      await supabase.auth.signOut();
      setOpen(false);
      toast.success('Votre compte a été supprimé définitivement');
      navigate('/');
    } catch (err) {
      console.error('Delete error:', err);
      setError('Erreur lors de la suppression');
      setLoading(false);
    }
  };

  const renderInfoStep = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-destructive">
          <AlertTriangle className="w-5 h-5" />
          Supprimer mon compte
        </AlertDialogTitle>
        <AlertDialogDescription className="text-left">
          Cette action est irréversible. Toutes vos données seront définitivement supprimées.
        </AlertDialogDescription>
      </AlertDialogHeader>

      {fetchingData ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : accountData ? (
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-destructive">
              Sera supprimé définitivement :
            </h4>
            <ul className="space-y-1 text-sm">
              <li className="flex items-center gap-2">
                <X className="w-4 h-4 text-destructive" />
                Votre profil et avatar
              </li>
              {accountData.postsCount > 0 && (
                <li className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  {accountData.postsCount} post{accountData.postsCount > 1 ? 's' : ''} et images associées
                </li>
              )}
              {accountData.likesCount > 0 && (
                <li className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  {accountData.likesCount} like{accountData.likesCount > 1 ? 's' : ''}
                </li>
              )}
              {accountData.commentsCount > 0 && (
                <li className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  {accountData.commentsCount} commentaire{accountData.commentsCount > 1 ? 's' : ''}
                </li>
              )}
              {(accountData.followersCount > 0 || accountData.followingCount > 0) && (
                <li className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  Vos abonnements ({accountData.followersCount} followers, {accountData.followingCount} following)
                </li>
              )}
              {accountData.privateCellarsToDelete.map((cellar) => (
                <li key={cellar.id} className="flex items-center gap-2">
                  <X className="w-4 h-4 text-destructive" />
                  Cave privée "{cellar.name}"
                </li>
              ))}
              {accountData.publicCellarsToDelete.map((cellar) => (
                <li key={cellar.id} className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Cave publique "{cellar.name}" (seul propriétaire)
                </li>
              ))}
            </ul>
          </div>

          {accountData.cellarsToLeave.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Sera conservé (autres membres présents) :
              </h4>
              <ul className="space-y-1 text-sm">
                {accountData.cellarsToLeave.map((cellar) => (
                  <li key={cellar.id} className="flex items-center gap-2">
                    <Info className="w-4 h-4 text-blue-500" />
                    Cave "{cellar.name}"
                  </li>
                ))
              }
              </ul>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg">
            <p className="text-xs text-muted-foreground">
              <strong>Note :</strong> Vos événements créés seront conservés pour les participants.
            </p>
          </div>
        </div>
      ) : null}

      <AlertDialogFooter>
        <AlertDialogCancel>Annuler</AlertDialogCancel>
        <Button
          variant="destructive"
          onClick={() => setStep('confirm')}
          disabled={fetchingData}
        >
          Je comprends, continuer
        </Button>
      </AlertDialogFooter>
    </>
  );

  const renderConfirmStep = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2">
          Confirmation finale
        </AlertDialogTitle>
        <AlertDialogDescription>
          Pour confirmer la suppression de votre compte, tapez votre nom complet ci-dessous.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-4 py-4">
        <div className="p-3 bg-muted rounded-lg text-center">
          <p className="text-sm text-muted-foreground mb-1">Votre nom :</p>
          <p className="font-semibold text-lg">{userFullName || 'Non renseigné'}</p>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="confirm-name">Tapez votre nom pour confirmer</Label>
          <Input
            id="confirm-name"
            type="text"
            value={confirmName}
            onChange={(e) => setConfirmName(e.target.value)}
            placeholder={userFullName || 'Votre nom complet'}
          />
        </div>
        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}
      </div>

      <AlertDialogFooter>
        <Button variant="outline" onClick={() => setStep('info')} disabled={loading}>
          Retour
        </Button>
        <Button
          variant="destructive"
          onClick={handleConfirmName}
          disabled={loading || !confirmName.trim() || !userFullName}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Suppression...
            </>
          ) : (
            'Supprimer mon compte'
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );

  const renderCellarWarningStep = () => (
    <>
      <AlertDialogHeader>
        <AlertDialogTitle className="flex items-center gap-2 text-amber-600">
          <AlertTriangle className="w-5 h-5" />
          Attention - Caves publiques
        </AlertDialogTitle>
        <AlertDialogDescription className="text-left">
          Vous êtes le seul propriétaire des caves publiques suivantes. Elles seront définitivement supprimées.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div className="space-y-2 py-4">
        <ul className="space-y-2">
          {accountData?.publicCellarsToDelete.map((cellar) => (
            <li key={cellar.id} className="flex items-center gap-2 p-2 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <span className="font-medium">{cellar.name}</span>
            </li>
          ))}
        </ul>
      </div>

      <AlertDialogFooter>
        <Button variant="outline" onClick={() => setStep('confirm')} disabled={loading}>
          Retour
        </Button>
        <Button
          variant="destructive"
          onClick={handleDeleteAccount}
          disabled={loading}
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Suppression...
            </>
          ) : (
            'Supprimer définitivement'
          )}
        </Button>
      </AlertDialogFooter>
    </>
  );

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="destructive" size="sm">
          <Trash2 className="w-4 h-4 mr-2" />
          Supprimer mon compte
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-md">
        {step === 'info' && renderInfoStep()}
        {step === 'confirm' && renderConfirmStep()}
        {step === 'cellar_warning' && renderCellarWarningStep()}
      </AlertDialogContent>
    </AlertDialog>
  );
}
