import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { MapPin, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Cellar {
  id: string;
  name: string;
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

  useEffect(() => {
    fetchUserLocationAndCellars();
  }, [user]);

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
    const { data, error } = await supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', true)
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

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
    const { data, error } = await supabase
      .from('cellar' as any)
      .select('*')
      .eq('is_public', true)
      .eq('is_seller', true)
      .limit(10);

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

      <main className="container mx-auto px-4 py-24 flex-grow">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Cavistes près de vous</h1>
          <p className="text-muted-foreground">
            Découvrez les meilleurs cavistes de votre région
          </p>
        </div>

        {cellars.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Aucun caviste trouvé pour le moment</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {cellars.map((cellar) => (
              <Link key={cellar.id} to={`/cellar/${cellar.id}`}>
                <Card className="hover:shadow-lg transition-shadow h-full">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4 mb-4">
                      <Avatar className="w-16 h-16">
                        <AvatarImage src={cellar.logo_url || undefined} />
                        <AvatarFallback>
                          <Store className="w-8 h-8" />
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-lg truncate">{cellar.name}</h3>
                        {cellar.location && (
                          <p className="text-sm text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {cellar.location}
                          </p>
                        )}
                        {cellar.distance !== undefined && (
                          <p className="text-sm text-primary font-medium mt-1">
                            {cellar.distance.toFixed(1)} km
                          </p>
                        )}
                      </div>
                    </div>
                    {cellar.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {cellar.description}
                      </p>
                    )}
                    <Button variant="outline" className="w-full mt-4">
                      Voir le catalogue
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <Footer />
    </div>
  );
}
