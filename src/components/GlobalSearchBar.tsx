import { useState, useEffect, useRef, useCallback } from 'react';
import { Search, X, Wine, MapPin, User, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

type SearchCategory = 'wines' | 'domains' | 'users';

interface SearchResult {
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  slug?: string;
}

const RESULTS_PER_PAGE = 10;

export const GlobalSearchBar = () => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<SearchCategory>('wines');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const categoryConfig = {
    wines: { label: 'Vins', icon: Wine, placeholder: 'Rechercher un vin...' },
    domains: { label: 'Domaines', icon: MapPin, placeholder: 'Rechercher un domaine...' },
    users: { label: 'Utilisateurs', icon: User, placeholder: 'Rechercher un utilisateur...' },
  };

  const resetSearch = useCallback(() => {
    setResults([]);
    setPage(0);
    setHasMore(false);
  }, []);

  const searchWines = useCallback(async (searchQuery: string, pageNum: number) => {
    const { data, error } = await supabase.rpc('search_wines', { query: searchQuery });
    if (error) {
      console.error('Error searching wines:', error);
      return [];
    }
    // Paginate client-side since the RPC returns all results
    const startIndex = pageNum * RESULTS_PER_PAGE;
    const paginatedData = (data || []).slice(startIndex, startIndex + RESULTS_PER_PAGE);
    setHasMore((data || []).length > startIndex + RESULTS_PER_PAGE);
    
    return paginatedData.map((wine: any) => ({
      id: wine.id,
      name: `${wine.name}${wine.year ? ` (${wine.year})` : ''}`,
      subtitle: wine.domain?.name || '',
      imageUrl: wine.label_url,
    }));
  }, []);

  const searchDomains = useCallback(async (searchQuery: string, pageNum: number) => {
    const { data, error } = await supabase.rpc('search_domains', { query: searchQuery });
    if (error) {
      console.error('Error searching domains:', error);
      return [];
    }
    // Paginate client-side since the RPC returns all results
    const startIndex = pageNum * RESULTS_PER_PAGE;
    const paginatedData = (data || []).slice(startIndex, startIndex + RESULTS_PER_PAGE);
    setHasMore((data || []).length > startIndex + RESULTS_PER_PAGE);
    
    return paginatedData.map((domain: any) => ({
      id: domain.id,
      name: domain.name,
      subtitle: domain.region || '',
      imageUrl: domain.logo_url,
      slug: domain.id, // domains use id in URL
    }));
  }, []);

  const searchUsers = useCallback(async (searchQuery: string, pageNum: number) => {
    const { data, error } = await supabase
      .from('user_profiles_public_search' as any)
      .select('id, slug, full_name, logo_adress, city')
      .or(`full_name.ilike.%${searchQuery}%,slug.ilike.%${searchQuery}%`)
      .range(pageNum * RESULTS_PER_PAGE, (pageNum + 1) * RESULTS_PER_PAGE - 1);
    
    if (error) {
      console.error('Error searching users:', error);
      return [];
    }
    
    setHasMore((data || []).length === RESULTS_PER_PAGE);
    
    return (data || []).map((user: any) => ({
      id: user.id,
      name: user.full_name || user.slug || 'Utilisateur',
      subtitle: user.city || '',
      imageUrl: user.logo_adress,
      slug: user.slug,
    }));
  }, []);

  const performSearch = useCallback(async (searchQuery: string, pageNum: number, append = false) => {
    if (!searchQuery.trim()) {
      resetSearch();
      return;
    }

    setLoading(true);
    try {
      let newResults: SearchResult[] = [];
      
      switch (category) {
        case 'wines':
          newResults = await searchWines(searchQuery, pageNum);
          break;
        case 'domains':
          newResults = await searchDomains(searchQuery, pageNum);
          break;
        case 'users':
          newResults = await searchUsers(searchQuery, pageNum);
          break;
      }

      if (append) {
        setResults(prev => [...prev, ...newResults]);
      } else {
        setResults(newResults);
      }
    } catch (error) {
      console.error('Search error:', error);
    } finally {
      setLoading(false);
    }
  }, [category, resetSearch, searchWines, searchDomains, searchUsers]);

  // Debounced search on query change
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query.trim()) {
      resetSearch();
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      setPage(0);
      performSearch(query, 0, false);
    }, 300);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [query, performSearch, resetSearch]);

  // Reset when category changes
  useEffect(() => {
    resetSearch();
    if (query.trim()) {
      performSearch(query, 0, false);
    }
  }, [category]);

  // Infinite scroll observer
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          const nextPage = page + 1;
          setPage(nextPage);
          performSearch(query, nextPage, true);
        }
      },
      { threshold: 0.1 }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading, page, query, performSearch]);

  const handleResultClick = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    resetSearch();

    switch (category) {
      case 'wines':
        navigate(`/wine/${result.id}`);
        break;
      case 'domains':
        navigate(`/domain/${result.id}`);
        break;
      case 'users':
        if (result.slug) {
          navigate(`/user/${result.slug}`);
        }
        break;
    }
  };

  const CategoryIcon = categoryConfig[category].icon;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="hidden md:inline-flex">
          <Search className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Recherche</DialogTitle>
        </DialogHeader>
        
        {/* Category Tabs */}
        <div className="flex gap-2 mb-4">
          {(Object.keys(categoryConfig) as SearchCategory[]).map((cat) => {
            const Icon = categoryConfig[cat].icon;
            return (
              <Button
                key={cat}
                variant={category === cat ? 'default' : 'outline'}
                size="sm"
                onClick={() => setCategory(cat)}
                className="flex-1 gap-2"
              >
                <Icon className="h-4 w-4" />
                {categoryConfig[cat].label}
              </Button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={categoryConfig[category].placeholder}
            className="pl-10 pr-10"
            autoFocus
          />
          {query && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
              onClick={() => {
                setQuery('');
                resetSearch();
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Results */}
        <ScrollArea className="flex-1 mt-4 -mx-6 px-6">
          <div className="space-y-2">
            {results.length === 0 && !loading && query.trim() && (
              <p className="text-center text-muted-foreground py-8">
                Aucun résultat trouvé
              </p>
            )}

            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-muted transition-colors text-left"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={result.imageUrl} />
                  <AvatarFallback>
                    <CategoryIcon className="h-5 w-5 text-muted-foreground" />
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{result.name}</p>
                  {result.subtitle && (
                    <p className="text-sm text-muted-foreground truncate">{result.subtitle}</p>
                  )}
                </div>
              </button>
            ))}

            {/* Sentinel for infinite scroll */}
            <div ref={sentinelRef} className="h-1" />

            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};
