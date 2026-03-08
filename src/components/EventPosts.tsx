import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { CreateEventPost } from '@/components/CreateEventPost';
import { EventPostCard } from '@/components/EventPostCard';
import { Newspaper } from 'lucide-react';

interface EventPostsProps {
  eventId: string;
  canPost: boolean;
  hasAccess: boolean;
}

export const EventPosts = ({ eventId, canPost, hasAccess }: EventPostsProps) => {
  const { user } = useAuth();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPosts = async () => {
    setLoading(true);

    const { data, error } = await supabase
      .from('event_post' as any)
      .select('*')
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error || !data) {
      setLoading(false);
      return;
    }

    // Filter: if not hasAccess, only show public posts
    const filteredPosts = hasAccess
      ? (data as any[])
      : (data as any[]).filter((p: any) => p.visibility === 'public');

    // Batch fetch authors
    const authorIds = [...new Set(filteredPosts.map((p: any) => p.author_id))];
    const { data: profiles } = authorIds.length > 0
      ? await supabase.from('user_profiles_public' as any).select('id, full_name, logo_adress, slug').in('id', authorIds)
      : { data: [] };

    // Fetch user's likes
    let userLikes: string[] = [];
    if (user) {
      const postIds = filteredPosts.map((p: any) => p.id);
      if (postIds.length > 0) {
        const { data: likes } = await supabase
          .from('event_post_like' as any)
          .select('event_post_id')
          .eq('user_id', user.id)
          .in('event_post_id', postIds);
        userLikes = (likes || []).map((l: any) => l.event_post_id);
      }
    }

    const profileMap = new Map((profiles || []).map((p: any) => [p.id, p]));

    const enriched = filteredPosts.map((post: any) => ({
      ...post,
      author: profileMap.get(post.author_id) || null,
      isLiked: userLikes.includes(post.id),
    }));

    setPosts(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPosts();
  }, [eventId, user, hasAccess]);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {canPost && (
        <CreateEventPost eventId={eventId} onPostCreated={fetchPosts} />
      )}

      {posts.length === 0 ? (
        <div className="text-center py-12">
          <Newspaper className="h-12 w-12 text-muted-foreground/50 mx-auto mb-3" />
          <p className="text-muted-foreground">
            {canPost
              ? 'Aucune actualité pour le moment. Publiez le premier post !'
              : 'Aucune actualité pour le moment.'}
          </p>
        </div>
      ) : (
        posts.map((post) => (
          <EventPostCard
            key={post.id}
            post={post}
            onDeleted={fetchPosts}
          />
        ))
      )}
    </div>
  );
};
