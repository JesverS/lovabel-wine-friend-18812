import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Wine, Plus, Pencil, ShoppingCart, LayoutGrid, Grid3x3, Grid2x2 } from "lucide-react";
import { AddWineDialog } from "./AddWineDialog";
import { CellarWineDetailsDialog } from "./CellarWineDetailsDialog";
import { WineSearchFilter, WineFilters } from "./wine/WineSearchFilter";

interface WineData {
  wine_id: string;
  cellar_id: string;
  domain_id: string | null; // Ajouté: retourné par la RPC au niveau racine
  quantity: number | null;
  price: number | null;
  description: string | null;
  label_url: string | null;
  added_at: string | null;
  wine: {
    id: string;
    name: string;
    year: number | null;
    label_url: string;
    domain_id: string | null;
    type: number | null;
    mode_culture: number | null;
    wine_classification: number | null;
    price: number | null;
    volume_ml: number | null;
    website_order_url: string | null;
    description: string | null;
    domain: {
      id: string;
      name: string;
      logo_url: string | null;
    } | null;
    wine_type: {
      type: string;
    } | null;
  } | null;
}

interface CellarCatalogProps {
  cellarId: string;
  userRole: "owner" | "co_owner" | "admin" | null;
}

const DEFAULT_IMAGE = "https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png";
const WINES_PER_PAGE = 20;

export function CellarCatalog({ cellarId, userRole }: CellarCatalogProps) {
  const [wines, setWines] = useState<WineData[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"all" | "by-domain">("all");
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
  const [domainsLoading, setDomainsLoading] = useState(false);
  const [domainsOffset, setDomainsOffset] = useState(0);
  const [hasMoreDomains, setHasMoreDomains] = useState(true);
  const [filters, setFilters] = useState<WineFilters>({
    searchQuery: "",
    wineTypeId: null,
    modeCultureId: null,
    classificationId: null,
    sortBy: "added_at",
    sortOrder: "desc",
  });
  const [columnsPerRow, setColumnsPerRow] = useState<3 | 4 | 5>(4);
  const [selectedWine, setSelectedWine] = useState<WineData | null>(null);

  // Scroll infini pour les vins
  const [winesOffset, setWinesOffset] = useState(0);
  const [hasMoreWines, setHasMoreWines] = useState(true);
  const [isLoadingMoreWines, setIsLoadingMoreWines] = useState(false);
  const [wineTypes, setWineTypes] = useState<Record<number, string>>({});
  const observerTarget = useRef<HTMLDivElement>(null);

  // Refs pour l'IntersectionObserver (éviter les re-créations)
  const hasMoreWinesRef = useRef(hasMoreWines);
  const isLoadingMoreWinesRef = useRef(isLoadingMoreWines);
  const loadingRef = useRef(loading);
  const isLoadingRef = useRef(false);

  // Mettre à jour les refs quand les valeurs changent
  useEffect(() => {
    hasMoreWinesRef.current = hasMoreWines;
  }, [hasMoreWines]);

  useEffect(() => {
    isLoadingMoreWinesRef.current = isLoadingMoreWines;
  }, [isLoadingMoreWines]);

  useEffect(() => {
    loadingRef.current = loading;
  }, [loading]);

  // Charger les types de vin UNE SEULE FOIS au montage
  const fetchWineTypes = useCallback(async () => {
    const { data } = await supabase.from("wine_type" as any).select("id, type");

    if (data && Array.isArray(data)) {
      const typesMap = data.reduce(
        (acc: Record<number, string>, type: any) => {
          acc[type.id] = type.type;
          return acc;
        },
        {} as Record<number, string>,
      );
      setWineTypes(typesMap);
    }
  }, []);

  useEffect(() => {
    fetchWineTypes();
  }, [fetchWineTypes]);

  const fetchDomains = useCallback(
    async (offset: number = 0) => {
      if (domainsLoading) return;

      setDomainsLoading(true);
      try {
        // Get distinct domain_ids from cellar_wine
        const { data: distinctDomains } = await supabase
          .from("cellar_wine")
          .select("domain_id")
          .eq("cellar_id", cellarId)
          .not("domain_id", "is", null);

        if (distinctDomains) {
          const uniqueDomainIds = [...new Set(distinctDomains.map((d: any) => d.domain_id))];

          // Fetch domain details with pagination
          const { data: domainData } = await supabase
            .from("domain")
            .select("id, name, logo_url")
            .in("id", uniqueDomainIds)
            .order("name", { ascending: true })
            .range(offset, offset + 19);

          if (domainData) {
            if (offset === 0) {
              setDomains(domainData);
            } else {
              setDomains((prev) => [...prev, ...domainData]);
            }
            setHasMoreDomains(domainData.length === 20);
            setDomainsOffset(offset + domainData.length);
          }
        }
      } catch (error) {
        console.error("Error fetching domains:", error);
      } finally {
        setDomainsLoading(false);
      }
    },
    [cellarId, domainsLoading],
  );

  const loadMoreDomains = () => {
    if (!domainsLoading && hasMoreDomains) {
      fetchDomains(domainsOffset);
    }
  };

  const fetchWines = useCallback(
    async (offset: number = 0, append: boolean = false) => {
      try {
        if (!append) {
          setLoading(true);
        } else {
          setIsLoadingMoreWines(true);
        }

        // Appeler l'edge function avec tous les filtres
        const { data: result, error } = await supabase.functions.invoke("search-cellar-wines", {
          body: {
            cellarId,
            searchQuery: filters.searchQuery || undefined,
            wineTypeId: filters.wineTypeId ? parseInt(filters.wineTypeId) : undefined,
            modeCultureId: filters.modeCultureId ? parseInt(filters.modeCultureId) : undefined,
            classificationId: filters.classificationId ? parseInt(filters.classificationId) : undefined,
            sortBy: filters.sortBy,
            sortOrder: filters.sortOrder,
            offset,
            limit: WINES_PER_PAGE,
          },
        });

        if (error) throw error;

        const { wines: enrichedData, totalCount, hasMore } = result;

        // Ajouter ou remplacer
        if (append) {
          setWines((prev) => [...prev, ...enrichedData]);
        } else {
          setWines(enrichedData);
        }

        // Mettre à jour les états de pagination
        setWinesOffset(offset + enrichedData.length);
        setHasMoreWines(hasMore);
      } catch (error) {
        console.error("Error fetching wines:", error);
      } finally {
        setLoading(false);
        setIsLoadingMoreWines(false);
      }
    },
    [cellarId, filters],
  );

  const loadMoreWines = useCallback(async () => {
    // Guard : empêcher les appels multiples
    if (isLoadingRef.current || isLoadingMoreWines || !hasMoreWines || loading) return;

    isLoadingRef.current = true;
    try {
      await fetchWines(winesOffset, true);
    } finally {
      isLoadingRef.current = false;
    }
  }, [isLoadingMoreWines, hasMoreWines, loading, winesOffset, fetchWines]);

  // Charger les vins et domaines au montage - UNE SEULE FOIS
  useEffect(() => {
    if (cellarId) {
      fetchWines(0, false);
      fetchDomains(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cellarId]); // ✅ Seulement cellarId, pas fetchWines ni fetchDomains

  // Reset et recharge quand les filtres changent
  useEffect(() => {
    if (cellarId) {
      setWinesOffset(0);
      setHasMoreWines(true);
      fetchWines(0, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters, selectedDomain, viewMode]); // ✅ Pas cellarId ni fetchWines

  // IntersectionObserver pour scroll infini (stable grâce aux refs)
  useEffect(() => {
    if (!observerTarget.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // Utiliser les refs pour avoir les valeurs actuelles sans re-créer l'observer
        if (
          entries[0].isIntersecting &&
          hasMoreWinesRef.current &&
          !isLoadingMoreWinesRef.current &&
          !loadingRef.current
        ) {
          loadMoreWines();
        }
      },
      { threshold: 0.1, rootMargin: "100px" },
    );

    observer.observe(observerTarget.current);

    return () => observer.disconnect();
  }, [loadMoreWines]);

  // Les vins sont déjà filtrés et triés par l'edge function
  // On garde uniquement le filtre de domaine pour la vue "by-domain"
  // Utiliser domain_id au niveau racine (retourné par la RPC) avec fallback
  const filteredWines = wines.filter((wine) => {
    if (viewMode === "by-domain" && selectedDomain) {
      const wineDomainId = wine.domain_id ?? wine.wine?.domain?.id;
      if (wineDomainId !== selectedDomain) {
        return false;
      }
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {(userRole === "owner" || userRole === "co_owner" || userRole === "admin") && (
        <div className="flex justify-end">
          <AddWineDialog cellarId={cellarId} onWineAdded={() => fetchWines(0, false)} />
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          <Button
            variant={viewMode === "all" ? "default" : "outline"}
            onClick={() => {
              setViewMode("all");
              setSelectedDomain(null);
            }}
          >
            Tous les vins
          </Button>
          <Button variant={viewMode === "by-domain" ? "default" : "outline"} onClick={() => setViewMode("by-domain")}>
            Par domaine
          </Button>
        </div>

        <div className="hidden lg:flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Affichage:</span>
          <div className="flex gap-1">
            <Button
              variant={columnsPerRow === 3 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnsPerRow(3)}
              className="w-9 h-9 p-0"
              title="3 colonnes"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <Button
              variant={columnsPerRow === 4 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnsPerRow(4)}
              className="w-9 h-9 p-0"
              title="4 colonnes"
            >
              <Grid3x3 className="h-4 w-4" />
            </Button>
            <Button
              variant={columnsPerRow === 5 ? "default" : "outline"}
              size="sm"
              onClick={() => setColumnsPerRow(5)}
              className="w-9 h-9 p-0"
              title="5 colonnes"
            >
              <Grid2x2 className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Barre de recherche toujours visible (sauf en mode domaines) */}
      {(viewMode === "all" || selectedDomain) && (
        <WineSearchFilter onFilterChange={setFilters} showDomainFilter={true} />
      )}

      {/* Chargement initial UNIQUEMENT pour le catalogue */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-muted-foreground">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span>Chargement du catalogue...</span>
          </div>
        </div>
      ) : (
        <>
          {viewMode === "by-domain" && !selectedDomain && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {domains.map((domain) => (
                  <Card
                    key={domain.id}
                    className="cursor-pointer hover:border-primary transition-colors"
                    onClick={() => setSelectedDomain(domain.id)}
                  >
                    <CardContent className="p-4 flex flex-col items-center text-center gap-3">
                      {domain.logo_url ? (
                        <Avatar className="w-20 h-20">
                          <AvatarImage src={domain.logo_url} alt={domain.name} />
                          <AvatarFallback>{domain.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      ) : (
                        <Avatar className="w-20 h-20">
                          <AvatarFallback>{domain.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                      )}
                      <h3 className="font-semibold text-sm">{domain.name}</h3>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {domainsLoading && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Chargement...</p>
                </div>
              )}

              {!domainsLoading && hasMoreDomains && domains.length > 0 && (
                <div className="text-center">
                  <Button onClick={loadMoreDomains} variant="outline">
                    Charger plus de domaines
                  </Button>
                </div>
              )}

              {!hasMoreDomains && domains.length > 0 && (
                <div className="text-center py-4">
                  <p className="text-sm text-muted-foreground">Tous les domaines ont été chargés</p>
                </div>
              )}
            </div>
          )}

          {viewMode === "by-domain" && selectedDomain && (
            <Button variant="outline" onClick={() => setSelectedDomain(null)} className="mb-4">
              ← Retour aux domaines
            </Button>
          )}

          {(viewMode === "all" || selectedDomain) && filteredWines.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <Wine className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  {filters.searchQuery || filters.wineTypeId || filters.modeCultureId || filters.classificationId
                    ? "Aucun vin ne correspond à vos critères"
                    : "Aucun vin dans le catalogue"}
                </p>
              </CardContent>
            </Card>
          ) : (
            (viewMode === "all" || selectedDomain) && (
              <>
                <div
                  className={`grid gap-3 sm:gap-4 md:gap-6 ${
                    columnsPerRow === 3
                      ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-3"
                      : columnsPerRow === 4
                        ? "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4"
                        : "grid-cols-2 sm:grid-cols-3 lg:grid-cols-5"
                  }`}
                >
                  {filteredWines.map((wine) => (
                    <Card
                      key={wine.wine_id}
                      className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => setSelectedWine(wine)}
                    >
                      <div className="aspect-[3/4] sm:aspect-[2/3] relative overflow-hidden bg-muted">
                        <img
                          src={wine.label_url || wine.wine?.label_url || DEFAULT_IMAGE}
                          alt={wine.wine?.name}
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                        {userRole && (
                          <div className="absolute top-1 right-1 sm:top-2 sm:right-2 bg-background/80 px-1.5 py-0.5 sm:px-2 sm:py-1 rounded text-xs sm:text-sm">
                            <span className="hidden sm:inline">Stock: </span>
                            {wine.quantity || 0}
                          </div>
                        )}
                      </div>
                      <CardContent className="p-2 sm:p-3 md:p-4">
                        <div className="space-y-1 sm:space-y-2">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h3 className="font-semibold text-sm sm:text-base md:text-lg line-clamp-2">
                                {wine.wine?.name}
                              </h3>
                              <p className="text-xs sm:text-sm text-muted-foreground line-clamp-1">
                                {wine.wine?.domain?.name}
                              </p>
                              {wine.wine?.wine_type && (
                                <span className="text-xs text-muted-foreground">
                                  {wine.wine.wine_type.type.charAt(0).toUpperCase() + wine.wine.wine_type.type.slice(1)}
                                </span>
                              )}
                            </div>
                            {wine.wine?.year && (
                              <span className="text-xs sm:text-sm font-medium">{wine.wine.year}</span>
                            )}
                          </div>

                          {(wine.description || wine.wine?.description) && (
                            <p className="text-sm text-muted-foreground line-clamp-2">
                              {wine.description || wine.wine?.description}
                            </p>
                          )}

                          {wine.wine?.volume_ml && (
                            <p className="text-xs text-muted-foreground">{wine.wine.volume_ml}ml</p>
                          )}

                          <p className="text-base sm:text-lg font-bold text-primary">
                            {wine.price ? `${wine.price.toFixed(2)}€` : "Prix en attente"}
                          </p>
                        </div>

                        <div className="flex flex-col gap-1.5 sm:gap-2 mt-2 sm:mt-4">
                          {wine.wine?.website_order_url && (
                            <Button variant="outline" size="sm" className="text-xs sm:text-sm h-7 sm:h-8" asChild>
                              <a href={wine.wine.website_order_url} target="_blank" rel="noopener noreferrer">
                                <ShoppingCart className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                                <span className="hidden sm:inline">Commander</span>
                                <span className="sm:hidden">🛒</span>
                              </a>
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Élément observé pour le scroll infini */}
                {hasMoreWines && (
                  <div ref={observerTarget} className="h-20 flex items-center justify-center">
                    {isLoadingMoreWines && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                        <span>Chargement de plus de vins...</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Message de fin */}
                {!hasMoreWines && wines.length > 0 && (
                  <div className="text-center py-6">
                    <p className="text-sm text-muted-foreground">
                      Tous les vins ont été chargés ({wines.length} total)
                    </p>
                  </div>
                )}
              </>
            )
          )}
        </>
      )}

      {selectedWine && (
        <CellarWineDetailsDialog
          wineData={selectedWine}
          userRole={userRole}
          cellarId={cellarId}
          onClose={() => setSelectedWine(null)}
          onUpdated={() => {
            setSelectedWine(null);
            fetchWines(0, false);
          }}
        />
      )}
    </div>
  );
}
