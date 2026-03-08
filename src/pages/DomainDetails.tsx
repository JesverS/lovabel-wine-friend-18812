import { useEffect, useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WineCard } from "@/components/WineCard";
import { Store, MapPin, Globe, Phone, Mail, ArrowLeft } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DomainAdministration } from "@/components/DomainAdministration";
import { EditDomainDialog } from "@/components/EditDomainDialog";
import { AddWineToDomainDialog } from "@/components/AddWineToDomainDialog";
import { Helmet } from "react-helmet-async";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

export default function DomainDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const [domain, setDomain] = useState<any>(null);
  const [wines, setWines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<number | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [userSlug, setUserSlug] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchDomainDetails();
      fetchDomainWines();
      checkAdminStatus();
    }
  }, [id, user]);

  useEffect(() => {
    const fetchUserSlug = async () => {
      if (user) {
        const { data } = await supabase
          .from("user_profiles_public" as any)
          .select("slug")
          .eq("id", user.id)
          .maybeSingle();
        setUserSlug((data as any)?.slug || null);
      }
    };
    fetchUserSlug();
  }, [user]);

  const fetchDomainDetails = async () => {
    const { data, error } = await supabase.from("domain").select("*").eq("id", id).maybeSingle();

    if (error) {
      console.error("Error fetching domain:", error);
    } else {
      setDomain(data);
    }
  };

  const fetchDomainWines = async () => {
    const { data, error } = await supabase
      .from("wine")
      .select("*")
      .eq("domain_id", id)
      .order("year", { ascending: false });

    if (error) {
      console.error("Error fetching wines:", error);
    } else {
      setWines(data || []);
    }
    setLoading(false);
  };

  const checkAdminStatus = async () => {
    if (!user || !id) return;

    const { data } = await supabase
      .from("user_domain")
      .select("role")
      .eq("user_id", user.id)
      .eq("domain_id", id)
      .maybeSingle();

    // Si data existe, l'utilisateur est dans la table, on set le rôle.
    setUserRole(data?.role ?? null);
  };

  // Get unique years from wines
  const availableYears = useMemo(() => {
    const years = wines
      .map((wine) => wine.year)
      .filter((year): year is number => year != null)
      .sort((a, b) => b - a);
    return Array.from(new Set(years));
  }, [wines]);

  // Filter and sort wines
  const filteredAndSortedWines = useMemo(() => {
    let filtered = wines;

    if (selectedYear !== "all") {
      filtered = wines.filter((wine) => wine.year?.toString() === selectedYear);
    }

    return filtered.sort((a, b) => {
      const yearA = a.year || 0;
      const yearB = b.year || 0;
      return sortOrder === "asc" ? yearA - yearB : yearB - yearA;
    });
  }, [wines, selectedYear, sortOrder]);

  // Get wine types by year for indicators
  const wineTypesByYear = useMemo(() => {
    const typesByYear: Record<number, Set<string>> = {};
    wines.forEach((wine) => {
      if (wine.year && wine.characteristics?.type) {
        if (!typesByYear[wine.year]) {
          typesByYear[wine.year] = new Set();
        }
        typesByYear[wine.year].add(wine.characteristics.type);
      }
    });
    return typesByYear;
  }, [wines]);

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

  const domainSchema = {
    "@context": "https://schema.org",
    "@type": "Winery",
    "name": domain.name,
    "description": domain.description || `Domaine viticole ${domain.name}`,
    "image": domain.logo_url,
    "address": domain.address,
    "telephone": domain.phone,
    "email": domain.email,
    "url": domain.website_url
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Helmet>
        <title>{domain.name} | Domaine viticole - Wine Note</title>
        <meta name="description" content={domain.description?.slice(0, 155) || `Découvrez le domaine ${domain.name} et ses vins`} />
        <link rel="canonical" href={`https://winenote.me/domain/${id}`} />
        <meta property="og:title" content={`${domain.name} - Wine Note`} />
        <meta property="og:description" content={domain.description?.slice(0, 155) || `Domaine viticole ${domain.name}`} />
        {domain.logo_url && <meta property="og:image" content={domain.logo_url} />}
        <meta property="og:url" content={`https://winenote.me/domain/${id}`} />
        <meta property="og:type" content="website" />
        <script type="application/ld+json">
          {JSON.stringify(domainSchema)}
        </script>
      </Helmet>

      <Header />
      <main className="flex-1 min-h-screen container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Accueil</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{domain.name}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button variant="ghost" asChild className="mb-6">
          <Link to={userSlug ? `/user/${userSlug}` : "/search"}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour
          </Link>
        </Button>

        {/* Domain Header */}
        <Card className="mb-8">
          <CardContent className="p-8">
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <div className="h-32 w-auto max-w-[180px] flex items-center justify-center flex-shrink-0">
                {domain.logo_url ? (
                  <img src={domain.logo_url} alt={domain.name} loading="lazy" className="h-full w-auto object-contain" />
                ) : (
                  <div className="h-32 w-32 bg-muted rounded flex items-center justify-center">
                    <Store className="w-16 h-16" />
                  </div>
                )}
              </div>

              <div className="flex-1">
                <div className="flex items-start justify-between mb-4">
                  <h1 className="text-4xl font-bold">{domain.name}</h1>
                  {/* CHANGEMENT ICI : Vérification simplifiée userRole !== null */}
                  {userRole !== null && <EditDomainDialog domain={domain} onDomainUpdated={fetchDomainDetails} />}
                </div>

                {domain.description && <p className="text-muted-foreground mb-6">{domain.description}</p>}

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

        {/* Content with Tabs */}
        {/* CHANGEMENT ICI : Vérification simplifiée userRole !== null au lieu de vérifier 1 ou 2 */}
        {userRole !== null ? (
          <Tabs defaultValue="wines" className="space-y-6">
            <TabsList>
              <TabsTrigger value="wines">Vins</TabsTrigger>
              <TabsTrigger value="admin">Administrer</TabsTrigger>
            </TabsList>

            <TabsContent value="wines">
              <Card>
                <CardHeader>
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <CardTitle>Vins du domaine ({filteredAndSortedWines.length})</CardTitle>

                    <div className="flex flex-col sm:flex-row gap-3 items-end">
                      {userRole !== null && <AddWineToDomainDialog domainId={id!} onWineCreated={fetchDomainWines} />}

                      <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Année" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Toutes les années</SelectItem>
                          {availableYears.map((year) => (
                            <SelectItem key={year} value={year.toString()}>
                              {year}
                              {wineTypesByYear[year] && (
                                <span className="ml-2 text-xs text-muted-foreground">
                                  ({Array.from(wineTypesByYear[year]).join(", ")})
                                </span>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                        <SelectTrigger className="w-full sm:w-[180px]">
                          <SelectValue placeholder="Trier par" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="desc">Plus récent → Plus vieux</SelectItem>
                          <SelectItem value="asc">Plus vieux → Plus récent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredAndSortedWines.length === 0 ? (
                    <div className="text-center py-12">
                      <p className="text-muted-foreground">
                        {wines.length === 0
                          ? "Aucun vin disponible pour ce domaine"
                          : "Aucun vin trouvé pour cette année"}
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {filteredAndSortedWines.map((wine) => (
                        <Link key={wine.id} to={`/wine/${wine.id}`}>
                          <WineCard
                            name={wine.name}
                            domain={domain.name}
                            year={wine.year || 0}
                            region={domain.address || ""}
                            price={Number(wine.price) || 0}
                            imageUrl={wine.label_url}
                            available={wine.price ? true : undefined}
                            tags={wine.characteristics?.type ? [wine.characteristics.type] : []}
                          />
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="admin">
              <DomainAdministration domainId={id!} userRole={userRole} />
            </TabsContent>
          </Tabs>
        ) : (
          /* Mode lecture seule (Public) */
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <CardTitle>Vins du domaine ({filteredAndSortedWines.length})</CardTitle>

                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  {/* Note: Le bouton AddWine n'apparaîtra pas ici car userRole est null dans ce bloc else */}

                  <Select value={selectedYear} onValueChange={setSelectedYear}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Année" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Toutes les années</SelectItem>
                      {availableYears.map((year) => (
                        <SelectItem key={year} value={year.toString()}>
                          {year}
                          {wineTypesByYear[year] && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              ({Array.from(wineTypesByYear[year]).join(", ")})
                            </span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={sortOrder} onValueChange={(value: "asc" | "desc") => setSortOrder(value)}>
                    <SelectTrigger className="w-full sm:w-[180px]">
                      <SelectValue placeholder="Trier par" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="desc">Plus récent → Plus vieux</SelectItem>
                      <SelectItem value="asc">Plus vieux → Plus récent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredAndSortedWines.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">
                    {wines.length === 0 ? "Aucun vin disponible pour ce domaine" : "Aucun vin trouvé pour cette année"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredAndSortedWines.map((wine) => (
                    <Link key={wine.id} to={`/wine/${wine.id}`}>
                      <WineCard
                        name={wine.name}
                        domain={domain.name}
                        year={wine.year || 0}
                        region={domain.address || ""}
                        price={Number(wine.price) || 0}
                        imageUrl={wine.label_url}
                        available={wine.price ? true : undefined}
                        tags={wine.characteristics?.type ? [wine.characteristics.type] : []}
                      />
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </main>
      <Footer />
    </div>
  );
}
