import { useInfiniteQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const POSTS_PER_PAGE = 10;
const FRIENDS_RATIO = 0.7;
const FRIENDS_PER_PAGE = Math.ceil(POSTS_PER_PAGE * FRIENDS_RATIO); // 7
const DISCOVERY_PER_PAGE = POSTS_PER_PAGE - FRIENDS_PER_PAGE; // 3

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
    is_public: boolean | null;
  } | null;
  wine: {
    id: string;
    name: string;
    label_url: string | null;
    type: number | null;
    domain: {
      id: string;
      name: string;
    } | null;
  } | null;
  isLiked: boolean;
  feedSource?: 'friends' | 'discovery';
}

interface PageCursor {
  friendsCursor: string | null;
  discoveryCursor: string | null;
  friendsExhausted: boolean;
  discoveryExhausted: boolean;
  seenPostIds: string[];
}

interface HybridPageResult {
  posts: PostWithRelations[];
  nextCursor: PageCursor | null;
}

// Récupérer les IDs des personnes suivies
async function getFollowingIds(userId: string): Promise<string[]> {
  const { data } = await supabase
    .from('user_follow')
    .select('following_id')
    .eq('follower_id', userId)
    .eq('status', 'accepted');
  
  return data?.map(f => f.following_id) || [];
}

// Récupérer les posts des amis
async function fetchFriendsPosts(
  followingIds: string[],
  cursor: string | null,
  limit: number,
  excludeIds: string[]
): Promise<{ posts: any[]; hasMore: boolean }> {
  if (followingIds.length === 0) {
    return { posts: [], hasMore: false };
  }

  let query = supabase
    .from('post')
    .select('*')
    .in('user_id', followingIds)
    .order('created_at', { ascending: false })
    .limit(limit + 1); // +1 pour savoir s'il y en a plus

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching friends posts:', error);
    return { posts: [], hasMore: false };
  }

  const posts = data || [];
  const hasMore = posts.length > limit;
  
  return {
    posts: hasMore ? posts.slice(0, limit) : posts,
    hasMore
  };
}

// Récupérer les posts découverte (publics, non suivis)
async function fetchDiscoveryPosts(
  userId: string | undefined,
  followingIds: string[],
  cursor: string | null,
  limit: number,
  excludeIds: string[]
): Promise<{ posts: any[]; hasMore: boolean }> {
  // Récupérer les IDs des profils publics qui ne sont pas suivis
  let profilesQuery = supabase
    .from('user_profiles_public' as any)
    .select('id')
    .eq('is_public', true);

  // Exclure l'utilisateur connecté et les personnes suivies
  const excludeUserIds = userId ? [userId, ...followingIds] : followingIds;
  if (excludeUserIds.length > 0) {
    profilesQuery = profilesQuery.not('id', 'in', `(${excludeUserIds.join(',')})`);
  }

  const { data: publicProfiles } = await profilesQuery;
  const publicUserIds = publicProfiles?.map((p: any) => p.id) || [];

  if (publicUserIds.length === 0) {
    return { posts: [], hasMore: false };
  }

  let query = supabase
    .from('post')
    .select('*')
    .in('user_id', publicUserIds)
    .order('created_at', { ascending: false })
    .limit(limit + 1);

  if (cursor) {
    query = query.lt('created_at', cursor);
  }

  if (excludeIds.length > 0) {
    query = query.not('id', 'in', `(${excludeIds.join(',')})`);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching discovery posts:', error);
    return { posts: [], hasMore: false };
  }

  const posts = data || [];
  const hasMore = posts.length > limit;

  return {
    posts: hasMore ? posts.slice(0, limit) : posts,
    hasMore
  };
}

// Enrichir les posts avec auteur, vin, et like status
async function enrichPosts(
  posts: any[],
  userId: string | undefined,
  feedSourceMap: Map<string, 'friends' | 'discovery'>
): Promise<PostWithRelations[]> {
  if (posts.length === 0) return [];

  const userIds = [...new Set(posts.map(p => p.user_id))];
  const wineIds = [...new Set(posts.filter(p => p.wine_id).map(p => p.wine_id))];
  const postIds = posts.map(p => p.id);

  const [authorsResult, winesResult, likesResult] = await Promise.all([
    supabase
      .from('user_profiles_public' as any)
      .select('id, slug, full_name, logo_adress, is_public')
      .in('id', userIds),
    wineIds.length > 0
      ? supabase
          .from('wine' as any)
          .select('id, name, label_url, type, domain:domain!wine_domain_id_fkey(id, name)')
          .in('id', wineIds)
      : Promise.resolve({ data: [] }),
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

  return posts.map(post => ({
    ...post,
    author: authorsMap.get(post.user_id) || null,
    wine: post.wine_id ? winesMap.get(post.wine_id) || null : null,
    isLiked: likedPostIds.has(post.id),
    feedSource: feedSourceMap.get(post.id)
  }));
}

// Fetch une page hybride (70% amis, 30% découverte)
async function fetchHybridPage(
  cursor: PageCursor,
  userId: string | undefined
): Promise<HybridPageResult> {
  const followingIds = userId ? await getFollowingIds(userId) : [];
  const hasFollowing = followingIds.length > 0;

  let friendsNeeded = hasFollowing && !cursor.friendsExhausted ? FRIENDS_PER_PAGE : 0;
  let discoveryNeeded = !cursor.discoveryExhausted ? DISCOVERY_PER_PAGE : 0;

  // Si pas d'amis ou non connecté, 100% découverte
  if (!hasFollowing || !userId) {
    friendsNeeded = 0;
    discoveryNeeded = POSTS_PER_PAGE;
  }

  // Fetch les deux sources en parallèle
  const [friendsResult, discoveryResult] = await Promise.all([
    friendsNeeded > 0
      ? fetchFriendsPosts(followingIds, cursor.friendsCursor, friendsNeeded, cursor.seenPostIds)
      : Promise.resolve({ posts: [], hasMore: false }),
    discoveryNeeded > 0
      ? fetchDiscoveryPosts(userId, followingIds, cursor.discoveryCursor, discoveryNeeded, cursor.seenPostIds)
      : Promise.resolve({ posts: [], hasMore: false })
  ]);

  let allPosts = [...friendsResult.posts, ...discoveryResult.posts];
  const feedSourceMap = new Map<string, 'friends' | 'discovery'>();
  
  friendsResult.posts.forEach(p => feedSourceMap.set(p.id, 'friends'));
  discoveryResult.posts.forEach(p => feedSourceMap.set(p.id, 'discovery'));

  // Compléter si une source n'a pas assez de posts
  const totalFetched = allPosts.length;
  if (totalFetched < POSTS_PER_PAGE) {
    const needed = POSTS_PER_PAGE - totalFetched;
    const currentSeenIds = [...cursor.seenPostIds, ...allPosts.map(p => p.id)];

    // Si amis insuffisants, compléter avec découverte
    if (friendsResult.posts.length < friendsNeeded && discoveryResult.hasMore) {
      const { posts: extraDiscovery } = await fetchDiscoveryPosts(
        userId,
        followingIds,
        discoveryResult.posts.length > 0 
          ? discoveryResult.posts[discoveryResult.posts.length - 1].created_at 
          : cursor.discoveryCursor,
        needed,
        currentSeenIds
      );
      extraDiscovery.forEach(p => feedSourceMap.set(p.id, 'discovery'));
      allPosts = [...allPosts, ...extraDiscovery];
    }
    // Si découverte insuffisante, compléter avec amis
    else if (discoveryResult.posts.length < discoveryNeeded && friendsResult.hasMore) {
      const { posts: extraFriends } = await fetchFriendsPosts(
        followingIds,
        friendsResult.posts.length > 0
          ? friendsResult.posts[friendsResult.posts.length - 1].created_at
          : cursor.friendsCursor,
        needed,
        currentSeenIds
      );
      extraFriends.forEach(p => feedSourceMap.set(p.id, 'friends'));
      allPosts = [...allPosts, ...extraFriends];
    }
  }

  // Trier par date décroissante
  allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // Enrichir les posts
  const enrichedPosts = await enrichPosts(allPosts, userId, feedSourceMap);

  // Calculer les nouveaux curseurs
  const newFriendsCursor = friendsResult.posts.length > 0
    ? friendsResult.posts[friendsResult.posts.length - 1].created_at
    : cursor.friendsCursor;

  const newDiscoveryCursor = discoveryResult.posts.length > 0
    ? discoveryResult.posts[discoveryResult.posts.length - 1].created_at
    : cursor.discoveryCursor;

  const MAX_SEEN = 200;
  const newSeenPostIds = [...cursor.seenPostIds, ...allPosts.map(p => p.id)].slice(-MAX_SEEN);

  const friendsExhausted = cursor.friendsExhausted || !friendsResult.hasMore;
  const discoveryExhausted = cursor.discoveryExhausted || !discoveryResult.hasMore;

  // Si les deux sources sont épuisées, pas de page suivante
  const hasNextPage = !friendsExhausted || !discoveryExhausted;

  return {
    posts: enrichedPosts,
    nextCursor: hasNextPage
      ? {
          friendsCursor: newFriendsCursor,
          discoveryCursor: newDiscoveryCursor,
          friendsExhausted,
          discoveryExhausted,
          seenPostIds: newSeenPostIds
        }
      : null
  };
}

export function useSocialFeed() {
  const { user } = useAuth();

  return useInfiniteQuery({
    queryKey: ['social-feed', user?.id],
    queryFn: async ({ pageParam }) => {
      const cursor = pageParam as PageCursor;
      const result = await fetchHybridPage(cursor, user?.id);
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    initialPageParam: {
      friendsCursor: null,
      discoveryCursor: null,
      friendsExhausted: false,
      discoveryExhausted: false,
      seenPostIds: []
    } as PageCursor,
    staleTime: 30 * 1000,
    refetchOnWindowFocus: false,
  });
}
