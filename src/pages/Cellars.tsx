import { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Store, Search, Users, Loader2 } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

const PAGE_SIZE = 12;

interface Cellar {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  distance?: number;
}

export default function Cellars() {
  const { user } = useAuth();
  const [cellars, setCellars] = useState<Cellar[]>([]);
  const [communityCellars, setCommunityCellars] = useState<Cellar[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadingMoreCommunity, setLoadingMoreCommunity] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");
  const [debouncedName, setDebouncedName] = useState("");
  const [debouncedAddress, setDebouncedAddress] = useState("");
  const [cellarPage, setCellarPage] = useState(1);
  const [communityPage, setCommunityPage] = useState(1);
  const [hasMoreCellars, setHasMoreCellars] = useState(false);
  const [hasMoreCommunity, setHasMoreCommunity] = useState(false);

  // Debounce search inputs
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedName(searchName);
      setDebouncedAddress(searchAddress);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchName, searchAddress]);

  // Reset pagination when filters change
  useEffect(() => {
    setCellarPage(1);
    setCommunityPage(1);
    setCellars([]);
    setCommunityCellars([]);
  }, [debouncedName, debouncedAddress]);

  useEffect(() => {
    fetchUserLocationAndCellars();
  }, [user]);

  useEffect(() => {
    if (!loading) {
      fetchCellars(1, false);
      fetchCommunityCellars(1, false);
    }
  }, [debouncedName, debouncedAddress]);

  const fetchUserLocationAndCellars = async () => {
    setLoading(true);

    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles' as any)
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();

      if ((profile as any)?.latitude && (profile as any)?.longitude) {
        setUserLocation({ lat: (profile as any).latitude, lng: (profile as any).longitude });
        await Promise.all([
          fetchNearbyCellars((profile as any).latitude, (profile as any).longitude, 1, false),
          fetchCommunityCellars(1, false),
        ]);
      } else {
        await Promise.all([fetchAllCellars(1, false), fetchCommunityCellars(1, false)]);
      }
    } else {
      await Promise.all([fetchAllCellars(1, false), fetchCommunityCellars(1, false)]);
    }

    setLoading(false);
  };

  const fetchCellars = async (page: number = 1, append: boolean = false) => {
    if (user && !userLocation) {
      const { data: profile } = await supabase
        .from('user_profiles' as any)
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();

      if ((profile as any)?.latitude && (profile as any)?.longitude) {
        await fetchNearbyCellars((profile as any).latitude, (profile as any).longitude, page, append);
      } else {
        await fetchAllCellars(page, append);
      }
    } else if (userLocation) {
      await fetchNearbyCellars(userLocation.lat, userLocation.lng, page, append);
    } else {
      await fetchAllCellars(page, append);
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLon = (lon2 - lon1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
        Math.cos(lat2 * (Math.PI / 180)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchNearbyCellars = async (userLat: number, userLng: number, page: number = 1, append: boolean = false) => {
    if (append) setLoadingMore(true);

    let query = supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (debouncedName.trim()) {
      query = query.ilike('name', `%${debouncedName}%`);
    }
    if (debouncedAddress.trim()) {
      query = query.ilike('location', `%${debouncedAddress}%`);
    }

    const { data, error } = await query;
    if (error) { console.error('Error fetching cellars:', error); setLoadingMore(false); return; }

    const cellarsWithDistance = ((data || []) as any[])
      .map((cellar) => ({
        ...cellar,
        distance: calculateDistance(userLat, userLng, cellar.latitude!, cellar.longitude!),
      }))
      .sort((a, b) => a.distance! - b.distance!);

    // Paginate client-side for nearby (since we need all for distance sort)
    const paginated = cellarsWithDistance.slice(0, page * PAGE_SIZE);
    setCellars(paginated as any);
    setHasMoreCellars(paginated.length < cellarsWithDistance.length);
    setCellarPage(page);
    setLoadingMore(false);
  };

  const fetchAllCellars = async (page: number = 1, append: boolean = false) => {
    if (append) setLoadingMore(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = page * PAGE_SIZE - 1;

    let query = supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', true)
      .range(from, to);

    if (debouncedName.trim()) {
      query = query.ilike('name', `%${debouncedName}%`);
    }
    if (debouncedAddress.trim()) {
      query = query.ilike('location', `%${debouncedAddress}%`);
    }

    const { data, error } = await query;
    if (error) { console.error('Error fetching cellars:', error); setLoadingMore(false); return; }

    const newData = (data || []) as any;
    setCellars(prev => append ? [...prev, ...newData] : newData);
    setHasMoreCellars(newData.length === PAGE_SIZE);
    setCellarPage(page);
    setLoadingMore(false);
  };

  const fetchCommunityCellars = async (page: number = 1, append: boolean = false) => {
    if (append) setLoadingMoreCommunity(true);

    const from = (page - 1) * PAGE_SIZE;
    const to = page * PAGE_SIZE - 1;

    let query = supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', false)
      .range(from, to);

    if (debouncedName.trim()) {
      query = query.ilike('name', `%${debouncedName}%`);
    }
    if (debouncedAddress.trim()) {
      query = query.ilike('location', `%${debouncedAddress}%`);
    }

    const { data, error } = await query;
    if (error) { console.error('Error fetching community cellars:', error); setLoadingMoreCommunity(false); return; }

    const newData = (data || []) as any;
    setCommunityCellars(prev => append ? [...prev, ...newData] : newData);
    setHasMoreCommunity(newData.length === PAGE_SIZE);
    setCommunityPage(page);
    setLoadingMoreCommunity(false);
  };

  const handleLoadMoreCellars = () => {
    const nextPage = cellarPage + 1;
    if (userLocation) {
      fetchNearbyCellars(userLocation.lat, userLocation.lng, nextPage, true);
    } else {
      fetchAllCellars(nextPage, true);
    }
  };

  const handleLoadMoreCommunity = () => {
    fetchCommunityCellars(communityPage + 1, true);
  };

  const renderCellarCard = (cellar: Cellar) => (
    <Link key={cellar.id} to={`/cellar/${cellar.slug}`}>
      <Card className="group hover-lift h-full border-2 hover:border-primary/50 transition-all duration-300 overflow-hidden">
        <div className="h-2 bg-gradient-wine"></div>
        <CardContent className="p-6">
          <div className="flex items-start gap-4 mb-6">
            <div className="relative">
              <Avatar className="w-20 h-20 border-4 border-background shadow-lg">
                <AvatarImage src={cellar.logo_url || undefined} />
                <AvatarFallback className="bg-gradient-wine text-primary-foreground">
                  <Store className="w-10 h-10" />
                </AvatarFallback>
              </Avatar>
              {cellar.distance !== undefined && (
                <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-1 rounded-full shadow-md">
                  {cellar.distance.toFixed(1)} km
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-serif font-bold text-xl mb-2 group-hover:text-primary transition-colors line-clamp-2">
                {cellar.name}
              </h3>
              {cellar.location && (
                <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="line-clamp-1">{cellar.location}</span>
                </p>
              )}
            </div>
          </div>
          {cellar.description && (
            <p className="text-sm text-muted-foreground line-clamp-3 mb-6 leading-relaxed">
              {cellar.description}
            </p>
          )}
          <Button 
            variant="outline" 
            className="w-full border-2 group-hover:bg-gradient-wine group-hover:text-primary-foreground group-hover:border-transparent transition-all"
          >
            <Store className="w-4 h-4 mr-2" />
            Voir le catalogue
          </Button>
        </CardContent>
      </Card>
    </Link>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="container mx-auto px-4 py-24 flex-grow">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-12">
              <Skeleton className="h-12 w-72 mx-auto mb-4" />
              <Skeleton className="h-5 w-96 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="border-2 overflow-hidden">
                  <div className="h-2 bg-muted" />
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-6">
                      <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
                      <div className="flex-1 space-y-2">
                        <Skeleton className="h-6 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3 mb-6" />
                    <Skeleton className="h-10 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Cavistes près de chez vous - Wine Note</title>
        <meta name="description" content="Découvrez les meilleurs cavistes de votre région. Explorez leurs sélections exceptionnelles et trouvez des vins d'exception près de chez vous." />
        <link rel="canonical" href="https://winenote.me/cellars" />
        <meta property="og:title" content="Cavistes - Wine Note" />
        <meta property="og:description" content="Trouvez les meilleurs cavistes près de chez vous" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://winenote.me/cellars" />
      </Helmet>
      <Header />

      <main className="container mx-auto px-4 py-24 flex-grow min-h-screen">
        <div className="max-w-7xl mx-auto">
          <Breadcrumb className="mb-6 animate-fade-up">
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild><Link to="/">Accueil</Link></BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Cavistes</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
          <div className="text-center mb-12 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4 text-gradient-wine">
              Caves & Cavistes
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les meilleurs cavistes de votre région et les caves communautaires
            </p>
          </div>

          {/* Search and Filters Section */}
          <Card className="mb-12 border-2 shadow-lg animate-fade-up">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                    <Input
                      placeholder="Nom de la cave"
                      value={searchName}
                      onChange={(e) => setSearchName(e.target.value)}
                      className="pl-12 h-12 text-base border-2 focus:border-primary"
                    />
                  </div>
                  
                  <div className="relative">
                    <MapPin className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-primary" />
                    <Input
                      placeholder="Adresse"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      className="pl-12 h-12 text-base border-2 focus:border-primary"
                    />
                  </div>
                </div>

                {(searchName || searchAddress) && (
                  <div className="flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchName("");
                        setSearchAddress("");
                      }}
                      className="border-2"
                    >
                      Réinitialiser les filtres
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Message pour utilisateurs non connectés */}
          {!user && (
            <div className="mb-8 p-4 bg-primary/10 rounded-lg border border-primary/20 text-center animate-fade-up">
              <p className="text-muted-foreground">
                <Link to="/auth" className="text-primary font-medium hover:underline">
                  Connectez-vous
                </Link>{" "}
                pour voir les cavistes triés par distance depuis votre position
              </p>
            </div>
          )}

          {/* Cavistes section */}
          <div className="mb-16">
            <h2 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
              <Store className="w-7 h-7 text-primary" />
              Cavistes
            </h2>
            {cellars.length === 0 ? (
              <Card className="border-2 shadow-lg">
                <CardContent className="p-12 text-center">
                  <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-6">
                    <Store className="w-10 h-10 text-primary" />
                  </div>
                  <p className="text-xl text-muted-foreground">Aucun caviste trouvé pour le moment</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {cellars.map(renderCellarCard)}
                </div>
                {hasMoreCellars && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={handleLoadMoreCellars}
                      disabled={loadingMore}
                      className="border-2 min-w-[200px]"
                    >
                      {loadingMore ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement...</>
                      ) : (
                        "Charger plus"
                      )}
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Community cellars section */}
          {communityCellars.length > 0 && (
            <div>
              <h2 className="text-3xl font-serif font-bold mb-8 flex items-center gap-3">
                <Users className="w-7 h-7 text-primary" />
                Caves communautaires
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {communityCellars.map(renderCellarCard)}
              </div>
              {hasMoreCommunity && (
                <div className="flex justify-center mt-8">
                  <Button
                    variant="outline"
                    onClick={handleLoadMoreCommunity}
                    disabled={loadingMoreCommunity}
                    className="border-2 min-w-[200px]"
                  >
                    {loadingMoreCommunity ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Chargement...</>
                    ) : (
                      "Charger plus"
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
