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
    const { data } = await supabase
      .from('user_follow')
      .select('follower_id')
      .eq('following_id', profileId)
      .eq('status', 'accepted');

    if (data && data.length > 0) {
      const followerIds = data.map((f: any) => f.follower_id);
      const { data: profiles } = await supabase
        .from('user_profiles_public' as any)
        .select('id, full_name, logo_adress, slug')
        .in('id', followerIds);
      setFollowers((profiles as unknown as UserItem[]) || []);
    } else {
      setFollowers([]);
    }
    setLoadingFollowers(false);
  };

  const fetchFollowing = async () => {
    setLoadingFollowing(true);
    const { data } = await supabase
      .from('user_follow')
      .select('following_id')
      .eq('follower_id', profileId)
      .eq('status', 'accepted');

    if (data && data.length > 0) {
      const followingIds = data.map((f: any) => f.following_id);
      const { data: profiles } = await supabase
        .from('user_profiles_public' as any)
        .select('id, full_name, logo_adress, slug')
        .in('id', followingIds);
      setFollowing((profiles as unknown as UserItem[]) || []);
    } else {
      setFollowing([]);
    }
    setLoadingFollowing(false);
  };

  const fetchPendingRequests = async () => {
    setLoadingRequests(true);
    const { data } = await supabase
      .from('user_follow')
      .select('follower_id, followed_at')
      .eq('following_id', profileId)
      .eq('status', 'pending');

    if (data && data.length > 0) {
      const followerIds = data.map((f: any) => f.follower_id);
      const { data: profiles } = await supabase
        .from('user_profiles_public' as any)
        .select('id, full_name, logo_adress, slug')
        .in('id', followerIds);

      const profilesList = (profiles as unknown as UserItem[]) || [];
      const requests = data.map((req: any) => ({
        follower_id: req.follower_id,
        followed_at: req.followed_at,
        user: profilesList.find((p) => p.id === req.follower_id) || {
          id: req.follower_id,
          full_name: null,
          logo_adress: null,
          slug: null,
        },
      }));
      setPendingRequests(requests);
    } else {
      setPendingRequests([]);
    }
    setLoadingRequests(false);
  };

  const handleAcceptRequest = async (followerId: string) => {
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
    setPendingRequests((prev) => prev.filter((r) => r.follower_id !== followerId));
    onRequestsUpdated?.();
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
                      <div className="flex gap-2">
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
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
