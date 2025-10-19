import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CreatePost } from '@/components/CreatePost';
import { PostCard } from '@/components/PostCard';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, UserCheck } from 'lucide-react';

export default function UserProfile() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);

  useEffect(() => {
    if (id) {
      fetchProfileData();
    }
  }, [id, user]);

  const fetchProfileData = async () => {
    setLoading(true);

    // Fetch profile
    const { data: profileData } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', id)
      .single();
    setProfile(profileData);

    // Fetch posts
    const { data: postsData } = await supabase
      .from('post')
      .select('*')
      .eq('user_id', id)
      .order('created_at', { ascending: false });
    setPosts(postsData || []);

    // Fetch followers count
    const { count } = await supabase
      .from('user_follow')
      .select('*', { count: 'exact', head: true })
      .eq('following_id', id);
    setFollowersCount(count || 0);

    // Check if following
    if (user && user.id !== id) {
      const { data } = await supabase
        .from('user_follow')
        .select('*')
        .eq('follower_id', user.id)
        .eq('following_id', id)
        .single();
      setIsFollowing(!!data);
    }

    setLoading(false);
  };

  const handleFollow = async () => {
    if (!user || user.id === id) return;

    if (isFollowing) {
      await supabase
        .from('user_follow')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', id);
      setIsFollowing(false);
      setFollowersCount((prev) => prev - 1);
    } else {
      await supabase
        .from('user_follow')
        .insert({ follower_id: user.id, following_id: id });
      setIsFollowing(true);
      setFollowersCount((prev) => prev + 1);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Chargement...</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Profil introuvable</p>
      </div>
    );
  }

  const isOwnProfile = user?.id === id;

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Profile Header */}
        <div className="bg-card rounded-lg border p-8 mb-8">
          <div className="flex items-start gap-6">
            <Avatar className="w-24 h-24">
              <AvatarImage src={profile.logo_adress || undefined} />
              <AvatarFallback className="text-3xl">
                {profile.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-2">
                <h1 className="text-3xl font-bold">{profile.full_name || 'Utilisateur'}</h1>
                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <EditProfileDialog profile={profile} onProfileUpdated={fetchProfileData} />
                  ) : user ? (
                    <Button onClick={handleFollow} variant={isFollowing ? 'outline' : 'default'}>
                      {isFollowing ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Abonné
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Suivre
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
              
              <p className="text-muted-foreground mb-2">{followersCount} abonné(s)</p>
              
              {profile.description && (
                <p className="text-foreground mb-4">{profile.description}</p>
              )}
              
              {profile.address && (
                <p className="text-sm text-muted-foreground">📍 {profile.address}</p>
              )}
            </div>
          </div>
        </div>

        {/* Create Post (only on own profile) */}
        {isOwnProfile && (
          <div className="mb-8">
            <CreatePost onPostCreated={fetchProfileData} />
          </div>
        )}

        {/* Posts List */}
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Posts</h2>
          {posts.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Aucun post pour le moment</p>
          ) : (
            posts.map((post) => <PostCard key={post.id} post={post} />)
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
