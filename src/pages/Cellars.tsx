import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Store, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [searchName, setSearchName] = useState("");
  const [searchAddress, setSearchAddress] = useState("");

  useEffect(() => {
    fetchUserLocationAndCellars();
  }, [user]);

  useEffect(() => {
    if (!loading) {
      fetchCellars();
    }
  }, [searchName, searchAddress]);

  const fetchUserLocationAndCellars = async () => {
    setLoading(true);

    // Get user location from profile
    if (user) {
      const { data: profile } = await supabase
        .from('user_profiles' as any)
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();

      if ((profile as any)?.latitude && (profile as any)?.longitude) {
        setUserLocation({ lat: (profile as any).latitude, lng: (profile as any).longitude });
        await fetchNearbyCellars((profile as any).latitude, (profile as any).longitude);
      } else {
        // Fallback: get all public seller cellars
        await fetchAllCellars();
      }
    } else {
      await fetchAllCellars();
    }

    setLoading(false);
  };

  const fetchCellars = async () => {
    // Get user location from profile if not already set
    if (user && !userLocation) {
      const { data: profile } = await supabase
        .from('user_profiles' as any)
        .select('latitude, longitude')
        .eq('id', user.id)
        .single();

      if ((profile as any)?.latitude && (profile as any)?.longitude) {
        await fetchNearbyCellars((profile as any).latitude, (profile as any).longitude);
      } else {
        await fetchAllCellars();
      }
    } else if (userLocation) {
      await fetchNearbyCellars(userLocation.lat, userLocation.lng);
    } else {
      await fetchAllCellars();
    }
  };

  const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371; // Earth radius in km
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

  const fetchNearbyCellars = async (userLat: number, userLng: number) => {
    let query = supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    // Filter by name
    if (searchName.trim()) {
      query = query.ilike('name', `%${searchName}%`);
    }

    // Filter by address/location
    if (searchAddress.trim()) {
      query = query.ilike('location', `%${searchAddress}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cellars:', error);
      return;
    }

    // Calculate distances and sort
    const cellarsWithDistance = ((data || []) as any[])
      .map((cellar) => ({
        ...cellar,
        distance: calculateDistance(
          userLat,
          userLng,
          cellar.latitude!,
          cellar.longitude!
        ),
      }))
      .sort((a, b) => a.distance! - b.distance!)
      .slice(0, 10); // Limit to 10

    setCellars(cellarsWithDistance as any);
  };

  const fetchAllCellars = async () => {
    let query = supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', true)
      .limit(10);

    // Filter by name
    if (searchName.trim()) {
      query = query.ilike('name', `%${searchName}%`);
    }

    // Filter by address/location
    if (searchAddress.trim()) {
      query = query.ilike('location', `%${searchAddress}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching cellars:', error);
      return;
    }

    setCellars((data || []) as any);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
          <p>Chargement des cavistes...</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="container mx-auto px-4 py-24 flex-grow min-h-screen">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12 animate-fade-up">
            <h1 className="text-5xl md:text-6xl font-serif font-bold mb-4 text-gradient-wine">
              Cavistes près de vous
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Découvrez les meilleurs cavistes de votre région et explorez leurs sélections exceptionnelles
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
                      placeholder="Nom du caviste"
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {cellars.map((cellar) => (
                <Link 
                  key={cellar.id} 
                  to={`/cellar/${cellar.slug}`}
                >
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
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
