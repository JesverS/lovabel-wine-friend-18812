import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const POSTS_PER_PAGE = 10;

export interface PostWithRelations {
  id: string;
  content: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string | null;
  user_id: string;
  wine_id: string | null;
  likes_count: number;
  comment_count: number;
  is_wine_notice: boolean;
  wine_notice: any;
  author: {
    id: string;
    slug: string | null;
    full_name: string | null;
    logo_adress: string | null;
  } | null;
  wine: {
    id: string;
    name: string;
    label_url: string | null;
    domain: {
      id: string;
      name: string;
    } | null;
  } | null;
  isLiked: boolean;
}

async function fetchPostsPage(pageParam: number, userId: string | undefined): Promise<PostWithRelations[]> {
  // Récupérer les posts avec auteur et vin en une seule requête
  const { data: posts, error } = await supabase
    .from('post')
    .select('*')
    .order('created_at', { ascending: false })
    .range(pageParam * POSTS_PER_PAGE, (pageParam + 1) * POSTS_PER_PAGE - 1);

  if (error) {
    console.error('Erreur lors du chargement des posts:', error);
    throw error;
  }

  if (!posts || posts.length === 0) {
    return [];
  }

  // Récupérer les user_ids et wine_ids uniques
  const userIds = [...new Set(posts.map(p => p.user_id))];
  const wineIds = [...new Set(posts.filter(p => p.wine_id).map(p => p.wine_id))];
  const postIds = posts.map(p => p.id);

  // Faire les requêtes en parallèle
  const [authorsResult, winesResult, likesResult] = await Promise.all([
    // Auteurs
    supabase
      .from('user_profiles_public' as any)
      .select('id, slug, full_name, logo_adress')
      .in('id', userIds),
    // Vins avec domaine
    wineIds.length > 0 
      ? supabase
          .from('wine' as any)
          .select('id, name, label_url, domain:domain!wine_domain_id_fkey(id, name)')
          .in('id', wineIds)
      : Promise.resolve({ data: [] }),
    // Likes de l'utilisateur courant
    userId 
      ? supabase
          .from('post_like')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', postIds)
      : Promise.resolve({ data: [] })
  ]);

  const authorsMap = new Map((authorsResult.data || []).map((a: any) => [a.id, a]));
  const winesMap = new Map((winesResult.data || []).map((w: any) => [w.id, w]));
  const likedPostIds = new Set((likesResult.data || []).map((l: any) => l.post_id));

  // Assembler les données
  return posts.map(post => ({
    ...post,
    author: authorsMap.get(post.user_id) || null,
    wine: post.wine_id ? winesMap.get(post.wine_id) || null : null,
    isLiked: likedPostIds.has(post.id)
  }));
}

export function useSocialFeed() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['social-feed', user?.id],
    queryFn: ({ pageParam = 0 }) => fetchPostsPage(pageParam, user?.id),
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === POSTS_PER_PAGE ? allPages.length : undefined;
    },
    initialPageParam: 0,
    staleTime: 30 * 1000, // Cache valide 30 secondes
    refetchOnWindowFocus: false,
  });
}
