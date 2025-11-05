import { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

interface Cellar {
  id: string;
  name: string;
  location: string | null;
  logo_url: string | null;
}

interface CellarAutocompleteProps {
  value: string;
  cellarId: string | null;
  onSelect: (cellarId: string | null, cellarName: string) => void;
  label?: string;
}

export const CellarAutocomplete = ({ 
  value, 
  cellarId,
  onSelect, 
  label = "Cave associée" 
}: CellarAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Cellar[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const justSelectedRef = useRef(false);
  const hasLoadedInitial = useRef(false);

  // Fermer les suggestions quand on clique en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Charger les caves de l'utilisateur
  const loadUserCellars = async (searchQuery = '') => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setSuggestions([]);
        return;
      }

      // Rechercher uniquement les caves de l'utilisateur
      const { data: userCellars, error: cellarError } = await supabase
        .from('user_cellar')
        .select('user_cellar_id')
        .eq('user_id', user.id);

      if (cellarError) throw cellarError;
      
      const cellarIds = userCellars?.map(uc => uc.user_cellar_id) || [];
      
      if (cellarIds.length === 0) {
        setSuggestions([]);
        return;
      }

      let query = supabase
        .from('cellar')
        .select('id, name, location, logo_url')
        .in('id', cellarIds)
        .limit(5);

      if (searchQuery) {
        query = query.ilike('name', `%${searchQuery}%`);
      }

      const { data, error } = await query;

      if (error) throw error;
      setSuggestions(data || []);
      setShowSuggestions(true);
    } catch (error) {
      console.error('Erreur recherche caves:', error);
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  };

  // Rechercher les caves
  useEffect(() => {
    const searchCellars = async () => {
      // Ne pas rechercher si on vient de sélectionner une cave
      if (justSelectedRef.current) {
        justSelectedRef.current = false;
        return;
      }

      if (inputValue.length < 2) {
        setSuggestions([]);
        return;
      }

      await loadUserCellars(inputValue);
    };

    const timeoutId = setTimeout(searchCellars, 300);
    return () => clearTimeout(timeoutId);
  }, [inputValue]);

  // Charger les caves au focus si pas encore fait
  const handleFocus = () => {
    if (!hasLoadedInitial.current && inputValue.length < 2) {
      hasLoadedInitial.current = true;
      loadUserCellars();
    }
  };

  const handleSelectCellar = (cellar: Cellar) => {
    justSelectedRef.current = true;
    setInputValue(cellar.name);
    onSelect(cellar.id, cellar.name);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    
    // Si l'input est vidé, réinitialiser la sélection
    if (newValue === '') {
      onSelect(null, '');
    }
  };

  const handleClearSelection = () => {
    setInputValue('');
    onSelect(null, '');
    setSuggestions([]);
  };

  return (
    <div className="space-y-2" ref={wrapperRef}>
      <Label htmlFor="cellar-search">{label}</Label>
      <div className="relative">
        <Input
          id="cellar-search"
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          placeholder="Rechercher une cave..."
          className="w-full"
        />
        {isLoading && (
          <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
        )}
        {cellarId && !isLoading && (
          <button
            type="button"
            onClick={handleClearSelection}
            className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        )}
        {showSuggestions && suggestions.length > 0 && (
          <ul className="absolute z-10 w-full mt-1 bg-background border border-border rounded-md shadow-lg max-h-80 overflow-auto">
            {suggestions.map((cellar) => (
              <li
                key={cellar.id}
                onClick={() => handleSelectCellar(cellar)}
                className="px-4 py-3 hover:bg-accent cursor-pointer flex items-center gap-3"
              >
                {cellar.logo_url ? (
                  <img 
                    src={cellar.logo_url} 
                    alt={cellar.name}
                    className="w-12 h-12 object-cover rounded-md flex-shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 bg-muted rounded-md flex-shrink-0 flex items-center justify-center">
                    <span className="text-muted-foreground text-xs">Logo</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground">{cellar.name}</div>
                  {cellar.location && (
                    <div className="text-sm text-muted-foreground truncate">
                      {cellar.location}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Seules vos caves peuvent être affiliées à l'événement
      </p>
    </div>
  );
};
