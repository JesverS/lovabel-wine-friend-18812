import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Store, MapPin, Phone, Mail, Globe } from 'lucide-react';
import { CellarCatalog } from '@/components/CellarCatalog';
import { EditCellarDialog } from '@/components/EditCellarDialog';
import { CellarMembers } from '@/components/CellarMembers';

interface Cellar {
  id: string;
  name: string;
  logo_url: string | null;
  banner_url: string | null;
  location: string | null;
  description: string | null;
  is_public: boolean;
  is_seller: boolean;
}

export default function CellarDetails() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [cellar, setCellar] = useState<Cellar | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'owner' | 'co_owner' | 'admin' | null>(null);

  useEffect(() => {
    if (id) {
      fetchCellarData();
    }
  }, [id, user]);

  const fetchCellarData = async () => {
    setLoading(true);

    // Fetch cellar
    const { data: cellarData } = await supabase
      .from('cellar' as any)
      .select('*')
      .eq('id', id)
      .single();

    setCellar(cellarData as any);

    // Get user's role in this cellar
    if (user && cellarData) {
      const { data: membership } = await supabase
        .from('user_cellar' as any)
        .select('role')
        .eq('user_id', user.id)
        .eq('user_cellar_id', (cellarData as any).id)
        .maybeSingle();

      setUserRole((membership as any)?.role || null);
    }

    setLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
          <p>Chargement...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (!cellar) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <div className="container mx-auto px-4 py-24 flex items-center justify-center flex-grow">
          <p>Caviste introuvable</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col overflow-x-hidden">
      <Header />

      <main className="container mx-auto px-4 py-24 flex-grow min-h-screen overflow-x-hidden w-full">
        {/* Banner */}
        {cellar.banner_url && (
          <div className="relative w-full h-64 mb-8 rounded-lg overflow-hidden">
            <img
              src={cellar.banner_url}
              alt={cellar.name}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start gap-6 mb-8 overflow-x-hidden w-full">
          <Avatar className="w-20 h-20 md:w-24 md:h-24 shrink-0">
            <AvatarImage src={cellar.logo_url || undefined} />
            <AvatarFallback>
              <Store className="w-12 h-12" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0 overflow-hidden">
            <div className="flex items-center justify-between gap-2">
              <h1 className="text-2xl md:text-4xl font-bold break-words flex-1 min-w-0">{cellar.name}</h1>
              {userRole === 'owner' && (
                <EditCellarDialog cellar={cellar} onCellarUpdated={fetchCellarData} />
              )}
            </div>
            {cellar.location && (
              <p className="text-muted-foreground flex items-center gap-2 mt-2">
                <MapPin className="w-4 h-4" />
                {cellar.location}
              </p>
            )}
            {cellar.description && (
              <p className="text-muted-foreground mt-4 break-words text-sm md:text-base">{cellar.description}</p>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="catalog" className="w-full">
          <TabsList>
            <TabsTrigger value="catalog">Catalogue</TabsTrigger>
            <TabsTrigger value="about">À propos</TabsTrigger>
          </TabsList>

          <TabsContent value="catalog" className="mt-6">
            <CellarCatalog cellarId={cellar.id} userRole={userRole} />
          </TabsContent>

          <TabsContent value="about" className="mt-6">
            <div className="space-y-6">
              <Card>
                <CardContent className="p-6">
                  <h2 className="text-2xl font-bold mb-4">À propos</h2>
                  <div className="space-y-4">
                    {cellar.description && (
                      <div>
                        <h3 className="font-semibold mb-2">Description</h3>
                        <p className="text-muted-foreground">{cellar.description}</p>
                      </div>
                    )}
                    {cellar.location && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-5 h-5 text-muted-foreground mt-0.5" />
                        <div>
                          <h3 className="font-semibold">Adresse</h3>
                          <p className="text-muted-foreground">{cellar.location}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              <CellarMembers 
                cellarId={cellar.id} 
                cellarName={cellar.name}
                userRole={userRole}
              />
            </div>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
}
