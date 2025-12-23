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
import { UserPlus, UserCheck, Store, CalendarDays, Menu, FileText, MapPin, Wine, Heart, Settings, Globe, Lock, Users, Clock } from 'lucide-react';
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
import { UserBadgesSection } from '@/components/badges/UserBadgesSection';

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

  useEffect(() => {
    if (slug) {
      fetchProfileData();
    }
  }, [slug, user]);

  const fetchProfileData = async () => {
    setLoading(true);

    // Fetch profile - always use public view
    const { data: profileData } = await supabase
      .from('user_profiles_public' as any)
      .select('id, slug, full_name, logo_adress, description, city, address, level, phone_number, email, is_public')
      .eq('slug', slug)
      .single();
    setProfile(profileData);
    setIsProfilePublic((profileData as any)?.is_public !== false);

    if (!profileData) {
      setLoading(false);
      return;
    }

    const userId = (profileData as any).id;

    // Fetch posts
    const { data: postsData } = await supabase
      .from('post')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    setPosts(postsData || []);

    // Fetch cellars
    const isOwnProfile = user?.id === userId;
    const { data: userCellars } = await supabase
      .from('user_cellar' as any)
      .select('user_cellar_id, cellar(*)')
      .eq('user_id', userId);

    if (userCellars) {
      // Filter cellars: show all if own profile, only public if not
      const filteredCellars = (userCellars as any[])
        .filter((uc: any) => isOwnProfile || uc.cellar?.is_public)
        .map((uc: any) => uc.cellar);
      setCellars(filteredCellars);
    }

    // Fetch follow counts from optimized table
    const { data: followCounts } = await supabase
      .from('user_follow_counts')
      .select('followers_count, following_count')
      .eq('user_id', userId)
      .single();
    setFollowersCount(followCounts?.followers_count || 0);
    setFollowingCount(followCounts?.following_count || 0);

    // Fetch pending requests count (only for own profile)
    if (user && user.id === userId) {
      const { count: pendingCount } = await supabase
        .from('user_follow')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId)
        .eq('status', 'pending');
      setPendingRequestsCount(pendingCount || 0);
    }

    // Fetch events (created or participating) WITH roles
    const { data: userEvents } = await supabase
      .from('user_event')
      .select('event_id, role')
      .eq('user_id', userId);

    if (userEvents) {
      const eventIds = userEvents.map((ue: any) => ue.event_id);
      const rolesMap: Record<string, string> = {};
      userEvents.forEach((ue: any) => {
        rolesMap[ue.event_id] = ue.role;
      });
      setEventRoles(rolesMap);
      
      const { data: eventsData } = await supabase
        .from('event')
        .select('id, name, slug, banner_url, start_date, city, description, is_public, private_token')
        .in('id', eventIds)
        .order('start_date', { ascending: false });
      setEvents(eventsData || []);
    }

    // Check if following and get status
    if (user && user.id !== userId) {
      const { data } = await supabase
        .from('user_follow')
        .select('status')
        .eq('follower_id', user.id)
        .eq('following_id', userId)
        .single();
      
      if (data) {
        setFollowStatus(data.status as 'pending' | 'accepted');
      } else {
        setFollowStatus('none');
      }
    }

    setLoading(false);
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

  

  return (
    <div className="min-h-screen bg-background flex flex-col">
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
                          <InnerTabs defaultValue="stripe" className="mt-4">
                            <InnerTabsList className="grid w-full grid-cols-2">
                              <InnerTabsTrigger value="stripe">Compte Stripe</InnerTabsTrigger>
                              <InnerTabsTrigger value="revenue">Mes revenus</InnerTabsTrigger>
                            </InnerTabsList>
                            <InnerTabsContent value="stripe" className="mt-4">
                              <OrganizerStripeSetup />
                            </InnerTabsContent>
                            <InnerTabsContent value="revenue" className="mt-4">
                              <OrganizerRevenueDashboard />
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
                      {activeTab === 'cellars' && 'Mes caves'}
                      {activeTab === 'domains' && 'Mes domaines'}
                      {activeTab === 'events' && 'Mes événements'}
                      {activeTab === 'tastings' && 'Mes dégustations'}
                      {activeTab === 'favorites' && 'Mes favoris'}
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
                        <div className="font-medium">Mes caves</div>
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
                        <div className="font-medium">Mes domaines</div>
                        <div className="text-sm opacity-80">Gérer mes domaines</div>
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
                        <div className="font-medium">Mes événements</div>
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
                        <div className="font-medium">Mes dégustations</div>
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
                        <div className="font-medium">Mes favoris</div>
                        <div className="text-sm opacity-80">Vins sauvegardés</div>
                      </div>
                    </button>
                  </div>
                </DrawerContent>
              </Drawer>
            </>
          ) : (
            /* Tabs desktop */
            <TabsList className="grid w-full grid-cols-6 gap-1">
              <TabsTrigger value="posts">Posts</TabsTrigger>
              <TabsTrigger value="cellars">Mes caves</TabsTrigger>
              <TabsTrigger value="domains">Mes domaines</TabsTrigger>
              <TabsTrigger value="events">Mes événements</TabsTrigger>
              <TabsTrigger value="tastings">Mes dégustations</TabsTrigger>
              <TabsTrigger value="favorites">Mes favoris</TabsTrigger>
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
                    posts.map((post) => <PostCard key={post.id} post={post} />)
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
            {isOwnProfile ? (
              <UserDomains />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Les domaines ne sont visibles que par le propriétaire du profil</p>
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
            {isOwnProfile ? (
              <UserTastings />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Les dégustations ne sont visibles que par le propriétaire du profil</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="favorites" className="mt-6">
            {isOwnProfile ? (
              <UserFavorites />
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-muted-foreground">Les favoris ne sont visibles que par le propriétaire du profil</p>
                </CardContent>
              </Card>
            )}
          </TabsContent>
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
        onRequestsUpdated={fetchProfileData}
      />
    </div>
  );
}
