import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Link } from 'react-router-dom';
import { Check, X, UserPlus } from 'lucide-react';
import { toast } from 'sonner';

interface UserItem {
  id: string;
  full_name: string | null;
  logo_adress: string | null;
  slug: string | null;
  is_public?: boolean;
}

interface FollowRequest {
  follower_id: string;
  followed_at: string;
  user: UserItem;
}

interface FollowDialogsProps {
  profileId: string;
  isOwnProfile: boolean;
  followersDialogOpen: boolean;
  setFollowersDialogOpen: (open: boolean) => void;
  followingDialogOpen: boolean;
  setFollowingDialogOpen: (open: boolean) => void;
  requestsDialogOpen: boolean;
  setRequestsDialogOpen: (open: boolean) => void;
  onRequestsUpdated?: () => void;
}

export function FollowDialogs({
  profileId,
  isOwnProfile,
  followersDialogOpen,
  setFollowersDialogOpen,
  followingDialogOpen,
  setFollowingDialogOpen,
  requestsDialogOpen,
  setRequestsDialogOpen,
  onRequestsUpdated,
}: FollowDialogsProps) {
  const [followers, setFollowers] = useState<UserItem[]>([]);
  const [following, setFollowing] = useState<UserItem[]>([]);
  const [pendingRequests, setPendingRequests] = useState<FollowRequest[]>([]);
  const [loadingFollowers, setLoadingFollowers] = useState(false);
  const [loadingFollowing, setLoadingFollowing] = useState(false);
  const [loadingRequests, setLoadingRequests] = useState(false);
  
  // État pour le follow back
  const [followingBackStatus, setFollowingBackStatus] = useState<Record<string, boolean>>({});
  const [followingBackLoading, setFollowingBackLoading] = useState<Record<string, boolean>>({});
  
  // État pour la popup de follow-back après acceptation
  const [followBackDialogOpen, setFollowBackDialogOpen] = useState(false);
  const [pendingFollowBackUser, setPendingFollowBackUser] = useState<UserItem | null>(null);

  // Fetch followers when dialog opens
  useEffect(() => {
    if (followersDialogOpen && profileId) {
      fetchFollowers();
    }
  }, [followersDialogOpen, profileId]);

  // Fetch following when dialog opens
  useEffect(() => {
    if (followingDialogOpen && profileId) {
      fetchFollowing();
    }
  }, [followingDialogOpen, profileId]);

  // Fetch pending requests when dialog opens
  useEffect(() => {
    if (requestsDialogOpen && profileId && isOwnProfile) {
      fetchPendingRequests();
    }
  }, [requestsDialogOpen, profileId, isOwnProfile]);

  const fetchFollowers = async () => {
    setLoadingFollowers(true);
    // Requête unique avec jointure - plus performant
    const { data } = await supabase
      .from('user_follow')
      .select(`
        follower:user_profiles_public!user_follow_follower_id_fkey1(
          id, full_name, logo_adress, slug, is_public
        )
      `)
      .eq('following_id', profileId)
      .eq('status', 'accepted');

    if (data) {
      const profiles = data
        .map((f: any) => f.follower)
        .filter(Boolean) as UserItem[];
      setFollowers(profiles);
    } else {
      setFollowers([]);
    }
    setLoadingFollowers(false);
  };

  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    // Requête unique avec jointure - plus performant
    const { data } = await supabase
      .from('user_follow')
      .select(`
        following:user_profiles_public!user_follow_following_id_fkey1(
          id, full_name, logo_adress, slug, is_public
        )
      `)
      .eq('follower_id', profileId)
      .eq('status', 'accepted');

    if (data) {
      const profiles = data
        .map((f: any) => f.following)
        .filter(Boolean) as UserItem[];
      setFollowing(profiles);
    } else {
      setFollowing([]);
    }
    setLoadingFollowing(false);
  };

  const fetchPendingRequests = async () => {
    setLoadingRequests(true);
    // Requête unique avec jointure - plus performant
    const { data } = await supabase
      .from('user_follow')
      .select(`
        follower_id, 
        followed_at,
        follower:user_profiles_public!user_follow_follower_id_fkey1(
          id, full_name, logo_adress, slug, is_public
        )
      `)
      .eq('following_id', profileId)
      .eq('status', 'pending');

    if (data && data.length > 0) {
      const followerIds = data.map((f: any) => f.follower_id);
      const requests = data.map((req: any) => ({
        follower_id: req.follower_id,
        followed_at: req.followed_at,
        user: req.follower || {
          id: req.follower_id,
          full_name: null,
          logo_adress: null,
          slug: null,
        },
      }));
      setPendingRequests(requests);
      
      // Vérifier si on suit déjà ces personnes
      await checkFollowingBack(followerIds);
    } else {
      setPendingRequests([]);
    }
    setLoadingRequests(false);
  };

  // Vérifier si on suit déjà les personnes qui nous suivent
  const checkFollowingBack = async (followerIds: string[]) => {
    const { data } = await supabase
      .from('user_follow')
      .select('following_id')
      .eq('follower_id', profileId)
      .in('following_id', followerIds)
      .eq('status', 'accepted');

    const status: Record<string, boolean> = {};
    followerIds.forEach(id => {
      status[id] = data?.some(f => f.following_id === id) || false;
    });
    setFollowingBackStatus(status);
  };

  // Fonction pour follow back
  const handleFollowBack = async (userId: string) => {
    setFollowingBackLoading(prev => ({ ...prev, [userId]: true }));
    
    const { error } = await supabase
      .from('user_follow')
      .insert({ follower_id: profileId, following_id: userId });

    if (error) {
      toast.error('Erreur lors du suivi');
    } else {
      setFollowingBackStatus(prev => ({ ...prev, [userId]: true }));
      toast.success('Vous suivez maintenant cet utilisateur');
    }
    
    setFollowingBackLoading(prev => ({ ...prev, [userId]: false }));
  };

  const handleAcceptRequest = async (followerId: string) => {
    // Stocker l'utilisateur AVANT de modifier la liste
    const request = pendingRequests.find(r => r.follower_id === followerId);
    const userToFollowBack = request?.user;
    const shouldShowFollowBack = !followingBackStatus[followerId] && userToFollowBack;

    const { error } = await supabase
      .from('user_follow')
      .update({ status: 'accepted' })
      .eq('follower_id', followerId)
      .eq('following_id', profileId);

    if (error) {
      toast.error('Erreur lors de l\'acceptation');
      return;
    }

    toast.success('Demande acceptée');
    
    // D'abord mettre à jour la liste
    setPendingRequests((prev) => prev.filter((r) => r.follower_id !== followerId));
    onRequestsUpdated?.();
    
    // PUIS afficher le popup de follow-back après fermeture du dialog des demandes
    if (shouldShowFollowBack) {
      setRequestsDialogOpen(false);
      setTimeout(() => {
        setPendingFollowBackUser(userToFollowBack);
        setFollowBackDialogOpen(true);
      }, 200);
    }
  };
  
  // Handler pour le follow-back depuis la popup
  const handleFollowBackFromDialog = async () => {
    if (!pendingFollowBackUser) return;
    
    const { error } = await supabase
      .from('user_follow')
      .insert({ follower_id: profileId, following_id: pendingFollowBackUser.id });

    if (error) {
      toast.error('Erreur lors du suivi');
    } else {
      setFollowingBackStatus(prev => ({ ...prev, [pendingFollowBackUser.id]: true }));
      toast.success(`Vous suivez maintenant ${pendingFollowBackUser.full_name || 'cet utilisateur'}`);
    }
    
    setFollowBackDialogOpen(false);
    setPendingFollowBackUser(null);
  };

  const handleRejectRequest = async (followerId: string) => {
    const { error } = await supabase
      .from('user_follow')
      .delete()
      .eq('follower_id', followerId)
      .eq('following_id', profileId);

    if (error) {
      toast.error('Erreur lors du refus');
      return;
    }

    toast.success('Demande refusée');
    setPendingRequests((prev) => prev.filter((r) => r.follower_id !== followerId));
    onRequestsUpdated?.();
  };

  const UserListItem = ({ user, onClose }: { user: UserItem; onClose: () => void }) => (
    <Link
      to={user.slug ? `/user/${user.slug}` : '#'}
      onClick={onClose}
      className="flex items-center gap-3 p-3 hover:bg-muted rounded-lg transition-colors"
    >
      <Avatar className="w-10 h-10">
        <AvatarImage src={user.logo_adress || undefined} />
        <AvatarFallback>{user.full_name?.[0] || 'U'}</AvatarFallback>
      </Avatar>
      <span className="font-medium">{user.full_name || 'Utilisateur'}</span>
    </Link>
  );

  return (
    <>
      {/* Followers Dialog */}
      <Dialog open={followersDialogOpen} onOpenChange={setFollowersDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abonnés</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {loadingFollowers ? (
              <p className="text-center py-4 text-muted-foreground">Chargement...</p>
            ) : followers.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Aucun abonné</p>
            ) : (
              <div className="space-y-1">
                {followers.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    onClose={() => setFollowersDialogOpen(false)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Following Dialog */}
      <Dialog open={followingDialogOpen} onOpenChange={setFollowingDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Abonnements</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[400px]">
            {loadingFollowing ? (
              <p className="text-center py-4 text-muted-foreground">Chargement...</p>
            ) : following.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground">Aucun abonnement</p>
            ) : (
              <div className="space-y-1">
                {following.map((user) => (
                  <UserListItem
                    key={user.id}
                    user={user}
                    onClose={() => setFollowingDialogOpen(false)}
                  />
                ))}
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Pending Requests Dialog (only for own profile) */}
      {isOwnProfile && (
        <Dialog open={requestsDialogOpen} onOpenChange={setRequestsDialogOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Demandes d'abonnement</DialogTitle>
            </DialogHeader>
            <ScrollArea className="max-h-[400px]">
              {loadingRequests ? (
                <p className="text-center py-4 text-muted-foreground">Chargement...</p>
              ) : pendingRequests.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">Aucune demande en attente</p>
              ) : (
                <div className="space-y-2">
                  {pendingRequests.map((request) => (
                    <div
                      key={request.follower_id}
                      className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg"
                    >
                      <Avatar className="w-10 h-10">
                        <AvatarImage src={request.user.logo_adress || undefined} />
                        <AvatarFallback>{request.user.full_name?.[0] || 'U'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">
                          {request.user.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(request.followed_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-green-600 hover:bg-green-50 hover:text-green-700"
                          onClick={() => handleAcceptRequest(request.follower_id)}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="outline"
                          className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                          onClick={() => handleRejectRequest(request.follower_id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                        {/* Bouton Follow Back */}
                        {!followingBackStatus[request.follower_id] && (
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-8 gap-1"
                            disabled={followingBackLoading[request.follower_id]}
                            onClick={() => handleFollowBack(request.follower_id)}
                          >
                            <UserPlus className="w-3 h-3" />
                            <span className="hidden sm:inline">Suivre</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}

      {/* Follow-Back Dialog après acceptation */}
      <Dialog open={followBackDialogOpen} onOpenChange={setFollowBackDialogOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {pendingFollowBackUser?.is_public 
                ? "Suivre en retour ?" 
                : "Demander à suivre en retour ?"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-4 py-4">
            <Avatar className="w-12 h-12">
              <AvatarImage src={pendingFollowBackUser?.logo_adress || undefined} />
              <AvatarFallback>{pendingFollowBackUser?.full_name?.[0] || 'U'}</AvatarFallback>
            </Avatar>
            <p className="text-sm">
              {pendingFollowBackUser?.is_public ? (
                <>Voulez-vous suivre <span className="font-semibold">{pendingFollowBackUser?.full_name || 'cet utilisateur'}</span> en retour ?</>
              ) : (
                <>Voulez-vous envoyer une demande d'abonnement à <span className="font-semibold">{pendingFollowBackUser?.full_name || 'cet utilisateur'}</span> ?</>
              )}
            </p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button 
              variant="outline" 
              onClick={() => {
                setFollowBackDialogOpen(false);
                setPendingFollowBackUser(null);
              }}
            >
              Non merci
            </Button>
            <Button onClick={handleFollowBackFromDialog}>
              <UserPlus className="w-4 h-4 mr-2" />
              {pendingFollowBackUser?.is_public ? "Suivre" : "Demander"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
