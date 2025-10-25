import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { WineCard } from '@/components/WineCard';
import { Store, MapPin, Globe, Phone, Mail, ArrowLeft } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

export default function DomainDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [domain, setDomain] = useState<any>(null);
  const [wines, setWines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (id) {
      fetchDomainDetails();
      fetchDomainWines();
      checkAdminStatus();
    }
  }, [id, user]);

  const fetchDomainDetails = async () => {
    const { data, error } = await supabase
      .from('domain')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching domain:', error);
    } else {
      setDomain(data);
    }
  };

  const fetchDomainWines = async () => {
    const { data, error } = await supabase
      .from('wine')
      .select('*')
      .eq('domain_id', id)
      .order('year', { ascending: false });

    if (error) {
      console.error('Error fetching wines:', error);
    } else {
      setWines(data || []);
    }
    setLoading(false);
  };

  const checkAdminStatus = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from('user_domain')
      .select('role')
      .eq('user_id', user.id)
      .eq('domain_id', id)
      .single();

    setIsAdmin(!!data);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Skeleton className="h-64 w-full mb-8" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-96" />
            ))}
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!domain) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <main className="flex-1 container mx-auto px-4 py-8">
          <Card>
            <CardContent className="p-8 text-center">
              <Store className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">Domaine introuvable</p>
              <Button asChild className="mt-4">
                <Link to="/search">Retour à la recherche</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-8">
        <Button variant="ghost" asChild className="mb-6">
          <Link to={user ? `/user/${user.id}` : '/search'}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
        </Button>

        {/* Domain Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <Avatar className="w-32 h-32">
                <AvatarImage src={domain.logo_url || undefined} />
                <AvatarFallback>
                  <Store className="w-16 h-16" />
                </AvatarFallback>
              </Avatar>

              <div className="flex-1">
                <h1 className="text-4xl font-bold mb-4">{domain.name}</h1>
                
                {domain.description && (
                  <p className="text-muted-foreground mb-6">{domain.description}</p>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {domain.address && (
                    <div className="flex items-start gap-2">
                      <MapPin className="w-5 h-5 mt-0.5 text-muted-foreground flex-shrink-0" />
                      <span className="text-sm">{domain.address}</span>
                    </div>
                  )}

                  {domain.website_url && (
                    <div className="flex items-center gap-2">
                      <Globe className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <a
                        href={domain.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline"
                      >
                        Site web
                      </a>
                    </div>
                  )}

                  {domain.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <a href={`tel:${domain.phone}`} className="text-sm hover:underline">
                        {domain.phone}
                      </a>
                    </div>
                  )}

                  {domain.email && (
                    <div className="flex items-center gap-2">
                      <Mail className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                      <a href={`mailto:${domain.email}`} className="text-sm hover:underline">
                        {domain.email}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Wines Section */}
        <Card>
          <CardHeader>
            <CardTitle>Vins du domaine ({wines.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {wines.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Aucun vin disponible pour ce domaine</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {wines.map((wine) => (
                  <Link key={wine.id} to={`/wine/${wine.id}`}>
                    <WineCard
                      name={wine.name}
                      domain={domain.name}
                      year={wine.year || 0}
                      region={domain.address || ''}
                      price={Number(wine.price) || 0}
                      rating={4.5}
                      imageUrl={wine.label_url}
                      available={wine.stock > 0}
                      tags={wine.characteristics?.type ? [wine.characteristics.type] : []}
                    />
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
