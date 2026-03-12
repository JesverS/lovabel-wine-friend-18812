import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CreatePost } from '@/components/CreatePost';
import { PostCard } from '@/components/PostCard';
import { EditProfileDialog } from '@/components/EditProfileDialog';
import { CreateEventDialog } from '@/components/CreateEventDialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { UserPlus, UserCheck, Store, CalendarDays, Menu, FileText, MapPin, Wine, Heart, Settings, Globe, Lock, Users, Clock, BarChart3, LogOut } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { CreateCellarDialog } from '@/components/CreateCellarDialog';
import { UserFavorites } from '@/components/UserFavorites';
import { UserTastings } from '@/components/UserTastings';
import { UserDomains } from '@/components/UserDomains';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerClose } from '@/components/ui/drawer';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { OrganizerStripeSetup } from '@/components/OrganizerStripeSetup';
import { OrganizerRevenueDashboard } from '@/components/OrganizerRevenueDashboard';
import { useIsMobile } from '@/hooks/use-mobile';
import { Tabs as InnerTabs, TabsContent as InnerTabsContent, TabsList as InnerTabsList, TabsTrigger as InnerTabsTrigger } from '@/components/ui/tabs';
import { FollowDialogs } from '@/components/FollowDialogs';
import { TastingDashboard } from '@/components/TastingDashboard';
import { TastingComparison } from '@/components/TastingComparison';
import { UserBadgesSection } from '@/components/badges/UserBadgesSection';
import { PrivacySettings } from '@/components/PrivacySettings';
import { NotificationPreferences } from '@/components/NotificationPreferences';
import { InviteKeyRedemption } from '@/components/InviteKeyRedemption';
import { Separator } from '@/components/ui/separator';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { OpenInAppBanner } from '@/components/OpenInAppBanner';
import { getProfileDeepLink } from '@/lib/mobileAppUtils';
import { Helmet } from 'react-helmet-async';

export default function UserProfile() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [profile, setProfile] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [cellars, setCellars] = useState<any[]>([]);
  const [events, setEvents] = useState<any[]>([]);
  const [eventRoles, setEventRoles] = useState<Record<string, string>>({});
  const [eventFilter, setEventFilter] = useState<'all' | 'organizing' | 'participating'>('all');
  const [loading, setLoading] = useState(true);
  const [followStatus, setFollowStatus] = useState<'none' | 'pending' | 'accepted'>('none');
  const [isProfilePublic, setIsProfilePublic] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [followersDialogOpen, setFollowersDialogOpen] = useState(false);
  const [followingDialogOpen, setFollowingDialogOpen] = useState(false);
  const [requestsDialogOpen, setRequestsDialogOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('posts');
  const [compareOpen, setCompareOpen] = useState(false);

  useEffect(() => {
    if (slug) {
      fetchProfileData();
    }
  }, [slug, user]);

  const fetchProfileData = async (options?: { silent?: boolean }) => {
    // Mode silent : pas d'écran de chargement, pas de démontage des composants
    if (!options?.silent) {
      setLoading(true);
    }

    // Fetch profile - always use public view
    const { data: profileData } = await supabase
      .from('user_profiles_public' as any)
      .select('id, slug, full_name, last_name, logo_adress, description, city, address, level, phone_number, email, is_public')
      .eq('slug', slug)
      .maybeSingle();
    setProfile(profileData);
    setIsProfilePublic((profileData as any)?.is_public !== false);

    if (!profileData) {
      setLoading(false);
      return;
    }

    const userId = (profileData as any).id;
    const isOwnProfile = user?.id === userId;

    // Parallelize all independent queries
    const [
      postsResult,
      cellarsResult,
      followCountsResult,
      userEventsResult,
      followStatusResult,
      pendingCountResult,
    ] = await Promise.all([
      // Fetch posts
      supabase
        .from('post')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false }),
      // Fetch cellars
      supabase
        .from('user_cellar' as any)
        .select('user_cellar_id, cellar(*)')
        .eq('user_id', userId),
      // Fetch follow counts
      supabase
        .from('user_follow_counts')
        .select('followers_count, following_count')
        .eq('user_id', userId)
        .maybeSingle(),
      // Fetch events
      supabase
        .from('user_event')
        .select('event_id, role')
        .eq('user_id', userId),
      // Follow status (only if viewing someone else's profile)
      user && user.id !== userId
        ? supabase
            .from('user_follow')
            .select('status')
            .eq('follower_id', user.id)
            .eq('following_id', userId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      // Pending requests count (only for own profile)
      user && user.id === userId
        ? supabase
            .from('user_follow')
            .select('*', { count: 'exact', head: true })
            .eq('following_id', userId)
            .eq('status', 'pending')
        : Promise.resolve({ count: null }),
    ]);

    const rawPosts = postsResult.data || [];

    // Enrich posts with author, wine, and like data to avoid N+4 queries in PostCard
    if (rawPosts.length > 0) {
      const wineIds = [...new Set(rawPosts.filter((p: any) => p.wine_id).map((p: any) => p.wine_id))];
      const postIds = rawPosts.map((p: any) => p.id);

      const [winesResult, likesResult] = await Promise.all([
        wineIds.length > 0
          ? supabase
              .from('wine' as any)
              .select('id, name, label_url, type, domain:domain!wine_domain_id_fkey(id, name)')
              .in('id', wineIds)
          : Promise.resolve({ data: [] }),
        user
          ? supabase
              .from('post_like')
              .select('post_id')
              .eq('user_id', user.id)
              .in('post_id', postIds)
          : Promise.resolve({ data: [] }),
      ]);

      const winesMap = new Map((winesResult.data || []).map((w: any) => [w.id, w]));
      const likedPostIds = new Set((likesResult.data || []).map((l: any) => l.post_id));

      const enrichedPosts = rawPosts.map((post: any) => ({
        ...post,
        author: {
          id: userId,
          slug: (profileData as any).slug,
          full_name: (profileData as any).full_name,
          logo_adress: (profileData as any).logo_adress,
          is_public: (profileData as any).is_public,
        },
        wine: post.wine_id ? winesMap.get(post.wine_id) || null : null,
        isLiked: likedPostIds.has(post.id),
      }));

      setPosts(enrichedPosts);
    } else {
      setPosts([]);
    }

    if (cellarsResult.data) {
      const filteredCellars = (cellarsResult.data as any[])
        .filter((uc: any) => isOwnProfile || uc.cellar?.is_public)
        .map((uc: any) => uc.cellar);
      setCellars(filteredCellars);
    }

    setFollowersCount(followCountsResult.data?.followers_count || 0);
    setFollowingCount(followCountsResult.data?.following_count || 0);

    setPendingRequestsCount((pendingCountResult as any).count || 0);

    if (userEventsResult.data) {
      const eventIds = userEventsResult.data.map((ue: any) => ue.event_id);
      const rolesMap: Record<string, string> = {};
      userEventsResult.data.forEach((ue: any) => {
        rolesMap[ue.event_id] = ue.role;
      });
      setEventRoles(rolesMap);
      
      if (eventIds.length > 0) {
        const { data: eventsData } = await supabase
          .from('event')
          .select('id, name, slug, banner_url, start_date, city, description, is_public, private_token')
          .in('id', eventIds)
          .order('start_date', { ascending: false });
        setEvents(eventsData || []);
      } else {
        setEvents([]);
      }
    }

    if (user && user.id !== userId) {
      if (followStatusResult.data) {
        setFollowStatus((followStatusResult.data as any).status as 'pending' | 'accepted');
      } else {
        setFollowStatus('none');
      }
    }

    if (!options?.silent) {
      setLoading(false);
    }
  };

  // Refresh silencieux pour les mises à jour mineures (follow/unfollow)
  const handleSilentRefresh = () => {
    fetchProfileData({ silent: true });
  };

  const handleFollow = async () => {
    if (!user || !profile?.id) return;

    if (followStatus !== 'none') {
      // Unfollow
      await supabase
        .from('user_follow')
        .delete()
        .eq('follower_id', user.id)
        .eq('following_id', profile.id);
      setFollowStatus('none');
      if (followStatus === 'accepted') {
        setFollowersCount((prev) => Math.max(0, prev - 1));
      }
    } else {
      // Follow - le trigger auto_accept_public_follow gère le status
      const { data } = await supabase
        .from('user_follow')
        .insert({ follower_id: user.id, following_id: profile.id })
        .select('status')
        .single();
      
      if (data) {
        setFollowStatus(data.status as 'pending' | 'accepted');
        if (data.status === 'accepted') {
          setFollowersCount((prev) => prev + 1);
        }
      }
    }
  };

  // Calcul de la visibilité du contenu
  const isOwnProfile = user?.id === profile?.id;
  const canViewContent = isOwnProfile || isProfilePublic || followStatus === 'accepted';

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-12 max-w-4xl pt-32 flex-grow">
          <div className="bg-card rounded-lg border p-4 md:p-8 mb-8">
            <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
              <Skeleton className="w-20 h-20 md:w-24 md:h-24 rounded-full mx-auto md:mx-0" />
              <div className="flex-1 space-y-3">
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-64" />
              </div>
            </div>
          </div>
          <div className="grid grid-cols-6 gap-1">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-md" />
            ))}
          </div>
        </main>
        <Footer />
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

  

  // JSON-LD Person Schema pour SEO
  const personSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": profile.full_name || 'Utilisateur Wine Note',
    "description": profile.description || undefined,
    "image": profile.logo_adress || undefined,
    "url": `https://winenote.me/user/${profile.slug}`,
    "address": profile.city ? {
      "@type": "PostalAddress",
      "addressLocality": profile.city
    } : undefined
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>{profile.full_name || 'Utilisateur'} sur Wine Note | Profil Amateur de Vin</title>
        <meta name="description" content={profile.description?.slice(0, 155) || `Découvrez le profil de ${profile.full_name || 'cet amateur de vin'} sur Wine Note.`} />
        <link rel="canonical" href={`https://winenote.me/user/${profile.slug}`} />
        <meta property="og:title" content={`${profile.full_name || 'Utilisateur'} - Wine Note`} />
        <meta property="og:description" content={profile.description?.slice(0, 155) || 'Profil amateur de vin sur Wine Note'} />
        {profile.logo_adress && <meta property="og:image" content={profile.logo_adress} />}
        <meta property="og:url" content={`https://winenote.me/user/${profile.slug}`} />
        <meta property="og:type" content="profile" />
        <script type="application/ld+json">
          {JSON.stringify(personSchema)}
        </script>
      </Helmet>
      <OpenInAppBanner deepLink={getProfileDeepLink(profile.slug)} />
      <Header />
      
      <main className="container mx-auto px-4 py-12 max-w-4xl pt-32 flex-grow min-h-screen overflow-x-hidden">
        {/* Profile Header */}
        <div className="bg-card rounded-lg border p-4 md:p-8 mb-8">
          <div className="flex flex-col md:flex-row md:items-start gap-4 md:gap-6">
            <Avatar className="w-20 h-20 md:w-24 md:h-24 mx-auto md:mx-0">
              <AvatarImage src={profile.logo_adress ? `${profile.logo_adress.split('?')[0]}?t=${Date.now()}` : undefined} />
              <AvatarFallback className="text-2xl md:text-3xl">
                {profile.full_name?.[0] || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold break-words">{profile.full_name || 'Utilisateur'}</h1>
                <div className="flex gap-2 w-full sm:w-auto">
                  {isOwnProfile ? (
                    <div className="flex gap-2 w-full sm:w-auto">
                      <EditProfileDialog profile={profile} onProfileUpdated={fetchProfileData} />
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="icon">
                            <Settings className="w-4 h-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Paramètres du compte</DialogTitle>
                          </DialogHeader>
                          <InnerTabs defaultValue="privacy" className="mt-4">
                            <div className="overflow-x-auto -mx-2 px-2">
                              <InnerTabsList className="inline-flex w-auto min-w-full md:grid md:w-full md:grid-cols-5">
                                <InnerTabsTrigger value="privacy" className="whitespace-nowrap text-xs md:text-sm">Confidentialité</InnerTabsTrigger>
                                <InnerTabsTrigger value="notifications" className="whitespace-nowrap text-xs md:text-sm">Notifications</InnerTabsTrigger>
                                <InnerTabsTrigger value="stripe" className="whitespace-nowrap text-xs md:text-sm">Stripe</InnerTabsTrigger>
                                <InnerTabsTrigger value="revenue" className="whitespace-nowrap text-xs md:text-sm">Revenus</InnerTabsTrigger>
                                <InnerTabsTrigger value="premium" className="whitespace-nowrap text-xs md:text-sm">Premium</InnerTabsTrigger>
                              </InnerTabsList>
                            </div>
                            <InnerTabsContent value="privacy" className="mt-4">
                              <PrivacySettings />
                            </InnerTabsContent>
                            <InnerTabsContent value="notifications" className="mt-4">
                              <NotificationPreferences />
                            </InnerTabsContent>
                            <InnerTabsContent value="stripe" className="mt-4">
                              <OrganizerStripeSetup />
                            </InnerTabsContent>
                            <InnerTabsContent value="revenue" className="mt-4">
                              <OrganizerRevenueDashboard />
                            </InnerTabsContent>
                            <InnerTabsContent value="premium" className="mt-4">
                              <InviteKeyRedemption />
                            </InnerTabsContent>
                          </InnerTabs>
                        </DialogContent>
                      </Dialog>
                    </div>
                  ) : user ? (
                    <Button onClick={handleFollow} variant={followStatus !== 'none' ? 'outline' : 'default'} className="w-full sm:w-auto">
                      {followStatus === 'accepted' ? (
                        <>
                          <UserCheck className="w-4 h-4 mr-2" />
                          Abonné
                        </>
                      ) : followStatus === 'pending' ? (
                        <>
                          <Clock className="w-4 h-4 mr-2" />
                          En attente
                        </>
                      ) : isProfilePublic ? (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          S'abonner
                        </>
                      ) : (
                        <>
                          <UserPlus className="w-4 h-4 mr-2" />
                          Demander à s'abonner
                        </>
                      )}
                    </Button>
                  ) : null}
                </div>
              </div>
              
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <button 
                  onClick={() => setFollowersDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  <span className="font-semibold text-foreground">{followersCount}</span> abonné(s)
                </button>
                <span className="text-muted-foreground">·</span>
                <button 
                  onClick={() => setFollowingDialogOpen(true)}
                  className="text-muted-foreground hover:text-foreground hover:underline transition-colors"
                >
                  <span className="font-semibold text-foreground">{followingCount}</span> abonnement(s)
                </button>
                {isOwnProfile && pendingRequestsCount > 0 && (
                  <>
                    <span className="text-muted-foreground">·</span>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setRequestsDialogOpen(true)}
                      className="h-7 px-2 gap-1"
                    >
                      <Users className="w-3 h-3" />
                      {pendingRequestsCount} demande(s)
                    </Button>
                  </>
                )}
              </div>
              
              {profile.description && (
                <p className="text-foreground mb-4 break-words">{profile.description}</p>
              )}
              
              {/* Informations de contact - affichées si disponibles */}
              <div className="space-y-1 mb-2">
                {profile.email && (
                  <p className="text-sm text-muted-foreground break-words">
                    📧 {profile.email}
                  </p>
                )}
                
                {profile.phone_number && (
                  <p className="text-sm text-muted-foreground break-words">
                    📞 {profile.phone_number}
                  </p>
                )}
                
                {profile.address && (
                  <p className="text-sm text-muted-foreground break-words">
                    📍 {profile.address}
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section Badges */}
        <div className="mb-8">
          <UserBadgesSection userId={profile.id} maxDisplay={8} showViewAll={true} />
        </div>

        {/* Navigation mobile et desktop */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          {isMobile ? (
            <>
              {/* Bouton hamburger mobile */}
              <div className="mb-6">
                <Button 
                  onClick={() => setDrawerOpen(true)}
                  variant="outline"
                  className="w-full justify-between h-12"
                >
                  <span className="flex items-center gap-2">
                    <Menu className="w-5 h-5" />
                    <span className="font-medium">
                      {activeTab === 'posts' && 'Posts'}
                      {activeTab === 'cellars' && (isOwnProfile ? 'Mes caves' : 'Caves')}
                      {activeTab === 'domains' && (isOwnProfile ? 'Mes domaines' : 'Domaines')}
                      {activeTab === 'events' && (isOwnProfile ? 'Mes événements' : 'Événements')}
                      {activeTab === 'tastings' && (isOwnProfile ? 'Mes dégustations' : 'Dégustations')}
                      {activeTab === 'favorites' && (isOwnProfile ? 'Mes favoris' : 'Favoris')}
                      {activeTab === 'palais' && 'Mon Palais'}
                    </span>
                  </span>
                  <span className="text-muted-foreground text-sm">Changer</span>
                </Button>
              </div>

              {/* Drawer mobile */}
              <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
                <DrawerContent>
                  <DrawerHeader>
                    <DrawerTitle>Navigation</DrawerTitle>
                  </DrawerHeader>
                  <div className="p-4 space-y-2">
                    <button
                      onClick={() => { setActiveTab('posts'); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        activeTab === 'posts' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <FileText className="w-6 h-6" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">Posts</div>
                        <div className="text-sm opacity-80">{posts.length} publication(s)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('cellars'); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        activeTab === 'cellars' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <Store className="w-6 h-6" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{isOwnProfile ? 'Mes caves' : 'Caves'}</div>
                        <div className="text-sm opacity-80">{cellars.length} cave(s)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('domains'); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        activeTab === 'domains' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <MapPin className="w-6 h-6" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{isOwnProfile ? 'Mes domaines' : 'Domaines'}</div>
                        <div className="text-sm opacity-80">{isOwnProfile ? 'Gérer mes domaines' : 'Domaines viticoles'}</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('events'); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        activeTab === 'events' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <CalendarDays className="w-6 h-6" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{isOwnProfile ? 'Mes événements' : 'Événements'}</div>
                        <div className="text-sm opacity-80">{events.length} événement(s)</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('tastings'); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        activeTab === 'tastings' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <Wine className="w-6 h-6" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{isOwnProfile ? 'Mes dégustations' : 'Dégustations'}</div>
                        <div className="text-sm opacity-80">Historique</div>
                      </div>
                    </button>

                    <button
                      onClick={() => { setActiveTab('favorites'); setDrawerOpen(false); }}
                      className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                        activeTab === 'favorites' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <Heart className="w-6 h-6" />
                      <div className="flex-1 text-left">
                        <div className="font-medium">{isOwnProfile ? 'Mes favoris' : 'Favoris'}</div>
                        <div className="text-sm opacity-80">Vins sauvegardés</div>
                      </div>
                    </button>

                    {isOwnProfile && (
                      <button
                        onClick={() => { setActiveTab('palais'); setDrawerOpen(false); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                          activeTab === 'palais' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        <BarChart3 className="w-6 h-6" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Mon Palais</div>
                          <div className="text-sm opacity-80">Statistiques de dégustation</div>
                        </div>
                      </button>
                    )}

                    {!isOwnProfile && canViewContent && (
                      <button
                        onClick={() => { setActiveTab('palais'); setDrawerOpen(false); }}
                        className={`w-full flex items-center gap-4 p-4 rounded-lg transition-colors ${
                          activeTab === 'palais' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                        }`}
                      >
                        <BarChart3 className="w-6 h-6" />
                        <div className="flex-1 text-left">
                          <div className="font-medium">Palais</div>
                          <div className="text-sm opacity-80">Statistiques de dégustation</div>
                        </div>
                      </button>
                    )}
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            /* Tabs desktop */
            <TabsList className={`grid w-full gap-1 grid-cols-7`}>
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="cellars">{isOwnProfile ? 'Mes caves' : 'Caves'}</TabsTrigger>
              <TabsTrigger value="domains">{isOwnProfile ? 'Mes domaines' : 'Domaines'}</TabsTrigger>
              <TabsTrigger value="events">{isOwnProfile ? 'Mes événements' : 'Événements'}</TabsTrigger>
              <TabsTrigger value="tastings">{isOwnProfile ? 'Mes dégustations' : 'Dégustations'}</TabsTrigger>
              <TabsTrigger value="favorites">{isOwnProfile ? 'Mes favoris' : 'Favoris'}</TabsTrigger>
              {(isOwnProfile || canViewContent) && <TabsTrigger value="palais">{isOwnProfile ? 'Mon Palais' : 'Palais'}</TabsTrigger>}
            </TabsList>
          )}

          <TabsContent value="posts" className="mt-6 space-y-6">
            {!canViewContent ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Profil privé</h3>
                  <p className="text-muted-foreground">
                    {followStatus === 'pending' 
                      ? 'Votre demande d\'abonnement est en attente d\'approbation'
                      : 'Suivez ce profil pour voir ses publications'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Create Post (only on own profile) */}
                {isOwnProfile && (
                  <CreatePost onPostCreated={fetchProfileData} />
                )}
                
                <div className="space-y-4">
                  {posts.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">Aucun post pour le moment</p>
                  ) : (
                    posts.map((post) => <PostCard key={post.id} post={post} preloadedData={true} />)
                  )}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="cellars" className="mt-6">
            {isOwnProfile && (
              <div className="mb-6">
                <CreateCellarDialog onCellarCreated={fetchProfileData} />
              </div>
            )}
            
            {cellars.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-4">Aucune cave pour le moment</p>
                  {isOwnProfile && (
                    <p className="text-sm text-muted-foreground">
                      Créez votre première cave pour commencer à gérer votre collection
                    </p>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {cellars.map((cellar) => (
                  <Link key={cellar.id} to={`/cellar/${cellar.slug}`}>
                    <Card className="hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="w-16 h-16">
                            <AvatarImage src={cellar.logo_url || undefined} />
                            <AvatarFallback>
                              <Store className="w-8 h-8" />
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <h3 className="font-semibold text-lg truncate">{cellar.name}</h3>
                            {cellar.location && (
                              <p className="text-sm text-muted-foreground">{cellar.location}</p>
                            )}
                            {cellar.description && (
                              <p className="text-sm text-muted-foreground line-clamp-2 mt-2">
                                {cellar.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="domains" className="mt-6">
            {isOwnProfile || canViewContent ? (
              <UserDomains userId={profile?.id} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <Lock className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">Profil privé</h3>
                  <p className="text-muted-foreground">
                    {followStatus === 'pending' 
                      ? 'Votre demande d\'abonnement est en attente d\'approbation'
                      : 'Suivez ce profil pour voir ses domaines'}
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="events" className="mt-6">
            {isOwnProfile && (
              <div className="mb-6 flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
                <CreateEventDialog onEventCreated={fetchProfileData} />
                <div className="flex gap-2">
                  <Button 
                    variant={eventFilter === 'all' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEventFilter('all')}
                  >
                    Tous
                  </Button>
                  <Button 
                    variant={eventFilter === 'organizing' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEventFilter('organizing')}
                  >
                    J'organise
                  </Button>
                  <Button 
                    variant={eventFilter === 'participating' ? 'default' : 'outline'} 
                    size="sm"
                    onClick={() => setEventFilter('participating')}
                  >
                    J'y participe
                  </Button>
                </div>
              </div>
            )}
            
            {(() => {
              const filteredEvents = events.filter(event => {
                const role = eventRoles[event.id];
                if (eventFilter === 'organizing') {
                  return ['organizer', 'co_organizer', 'admin'].includes(role);
                }
                if (eventFilter === 'participating') {
                  return role === 'participant';
                }
                return true;
              });
              
              if (filteredEvents.length === 0) {
                return (
                  <Card>
                    <CardContent className="p-8 text-center">
                      <CalendarDays className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                      <p className="text-muted-foreground mb-4">
                        {eventFilter === 'organizing' 
                          ? "Vous n'organisez aucun événement"
                          : eventFilter === 'participating'
                            ? "Vous ne participez à aucun événement"
                            : "Aucun événement pour le moment"}
                      </p>
                      {isOwnProfile && eventFilter === 'all' && (
                        <p className="text-sm text-muted-foreground">
                          Créez votre premier événement pour commencer à organiser
                        </p>
                      )}
                    </CardContent>
                  </Card>
                );
              }
              
              return (
                <div className="grid grid-cols-1 gap-6">
                  {filteredEvents.map((event) => {
                    const eventUrl = event.is_public 
                      ? `/event/${event.slug}` 
                      : `/event/${event.slug}?token=${event.private_token}`;
                    const role = eventRoles[event.id];
                    const isOrganizing = ['organizer', 'co_organizer', 'admin'].includes(role);
                    return (
                      <Link key={event.id} to={eventUrl}>
                        <Card className="hover:shadow-lg transition-shadow overflow-hidden">
                          <CardContent className="p-4 md:p-6">
                            <div className="flex flex-col md:flex-row gap-4">
                              {event.banner_url && (
                                <img
                                  src={event.banner_url}
                                  alt={event.name}
                                  className="w-full md:w-32 h-48 md:h-32 object-cover rounded-md"
                                />
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-2 flex-wrap">
                                  <h3 className="font-semibold text-xl break-words">{event.name}</h3>
                                  <Badge variant={event.is_public ? "secondary" : "outline"} className="flex-shrink-0">
                                    {event.is_public ? (
                                      <><Globe className="w-3 h-3 mr-1" />Public</>
                                    ) : (
                                      <><Lock className="w-3 h-3 mr-1" />Privé</>
                                    )}
                                  </Badge>
                                  {isOwnProfile && (
                                    <Badge variant={isOrganizing ? "default" : "secondary"} className="flex-shrink-0">
                                      {isOrganizing ? "Organisateur" : "Participant"}
                                    </Badge>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                  <CalendarDays className="w-4 h-4 flex-shrink-0" />
                                  <span className="break-words">
                                    {new Date(event.start_date).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'long',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </div>
                                {event.city && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                                    <Store className="w-4 h-4 flex-shrink-0" />
                                    <span className="break-words">{event.city}</span>
                                  </div>
                                )}
                                {event.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2 break-words">
                                    {event.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </div>
              );
            })()}
          </TabsContent>

          <TabsContent value="tastings" className="mt-6">
            {isOwnProfile || canViewContent ? (
              <UserTastings userId={profile?.id} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Les dégustations ne sont visibles que par le propriétaire du profil ou ses abonnés</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {isOwnProfile || canViewContent ? (
              <UserFavorites userId={profile?.id} />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Les favoris ne sont visibles que par le propriétaire du profil ou ses abonnés</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {(isOwnProfile || canViewContent) && (
            <TabsContent value="palais" className="mt-6">
              <TastingDashboard userId={profile.id} userName={profile.full_name} />
              {!isOwnProfile && user && (
                <div className="mt-6">
                  <Button
                    variant="outline"
                    className="w-full gap-2"
                    onClick={() => setCompareOpen(!compareOpen)}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {compareOpen ? 'Masquer la comparaison' : 'Comparer nos palais'}
                  </Button>
                  {compareOpen && (
                    <Card className="mt-4">
                      <CardContent className="p-4">
                        <TastingComparison
                          myUserId={user.id}
                          myName="Moi"
                          friendUserId={profile.id}
                          friendName={profile.full_name || 'Utilisateur'}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>
      </main>

      <Footer />
      
      {/* Follow Dialogs */}
      <FollowDialogs
        profileId={profile.id}
        isOwnProfile={isOwnProfile}
        followersDialogOpen={followersDialogOpen}
        setFollowersDialogOpen={setFollowersDialogOpen}
        followingDialogOpen={followingDialogOpen}
        setFollowingDialogOpen={setFollowingDialogOpen}
        requestsDialogOpen={requestsDialogOpen}
        setRequestsDialogOpen={setRequestsDialogOpen}
        onRequestsUpdated={handleSilentRefresh}
      />
    </div>
  );
}
