import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X, SlidersHorizontal } from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';

interface WineSearchFilterProps {
  onFilterChange: (filters: WineFilters) => void;
  showDomainFilter?: boolean;
  fixedDomainId?: string;
}

export interface WineFilters {
  searchQuery: string;
  wineTypeId: string | null;
  modeCultureId: string | null;
  classificationId: string | null;
  sortBy: 'name' | 'year' | 'domain' | 'price';
  sortOrder: 'asc' | 'desc';
}

export function WineSearchFilter({ 
  onFilterChange, 
  showDomainFilter = true,
  fixedDomainId 
}: WineSearchFilterProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [wineTypeId, setWineTypeId] = useState<string | null>(null);
  const [modeCultureId, setModeCultureId] = useState<string | null>(null);
  const [classificationId, setClassificationId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'year' | 'domain' | 'price'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [isOpen, setIsOpen] = useState(false);

  const [wineTypes, setWineTypes] = useState<any[]>([]);
  const [modeCultures, setModeCultures] = useState<any[]>([]);
  const [classifications, setClassifications] = useState<any[]>([]);

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  useEffect(() => {
    onFilterChange({
      searchQuery,
      wineTypeId,
      modeCultureId,
      classificationId,
      sortBy,
      sortOrder,
    });
  }, [searchQuery, wineTypeId, modeCultureId, classificationId, sortBy, sortOrder]);

  const fetchFilterOptions = async () => {
    try {
      const [typesRes, culturesRes, classificationsRes] = await Promise.all([
        supabase.from('wine_type').select('*').order('type'),
        supabase.from('mode_culture').select('*').order('nom'),
        supabase.from('wine_classification').select('*').order('nom'),
      ]);

      if (typesRes.data) setWineTypes(typesRes.data);
      if (culturesRes.data) setModeCultures(culturesRes.data);
      if (classificationsRes.data) setClassifications(classificationsRes.data);
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const handleReset = () => {
    setSearchQuery('');
    setWineTypeId(null);
    setModeCultureId(null);
    setClassificationId(null);
    setSortBy('name');
    setSortOrder('asc');
  };

  const hasActiveFilters = searchQuery || wineTypeId || modeCultureId || classificationId;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      {/* Recherche textuelle principale */}
      <div className="flex gap-2">
        <div className="flex-1">
          <Label htmlFor="search-wine" className="sr-only">
            Rechercher
          </Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              id="search-wine"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher par nom, domaine, millésime..."
              className="pl-10"
            />
          </div>
        </div>
        {hasActiveFilters && (
          <Button variant="outline" size="icon" onClick={handleReset}>
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* Filtres avancés */}
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <Button variant="outline" className="w-full">
            <SlidersHorizontal className="w-4 h-4 mr-2" />
            Filtres avancés
            {hasActiveFilters && <span className="ml-2 text-xs">({[wineTypeId, modeCultureId, classificationId].filter(Boolean).length})</span>}
          </Button>
        </CollapsibleTrigger>
        <CollapsibleContent className="space-y-4 pt-4">
          {/* Type de vin */}
          <div>
            <Label htmlFor="wine-type">Type de vin</Label>
            <Select value={wineTypeId || 'all'} onValueChange={(val) => setWineTypeId(val === 'all' ? null : val)}>
              <SelectTrigger id="wine-type">
                <SelectValue placeholder="Tous les types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les types</SelectItem>
                {wineTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id.toString()}>
                    {type.type.charAt(0).toUpperCase() + type.type.slice(1)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mode de culture */}
          <div>
            <Label htmlFor="mode-culture">Mode de culture</Label>
            <Select value={modeCultureId || 'all'} onValueChange={(val) => setModeCultureId(val === 'all' ? null : val)}>
              <SelectTrigger id="mode-culture">
                <SelectValue placeholder="Tous les modes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les modes</SelectItem>
                {modeCultures.map((mode) => (
                  <SelectItem key={mode.id} value={mode.id.toString()}>
                    {mode.nom}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Classification */}
          <div>
            <Label htmlFor="classification">Classification</Label>
            <Select value={classificationId || 'all'} onValueChange={(val) => setClassificationId(val === 'all' ? null : val)}>
              <SelectTrigger id="classification">
                <SelectValue placeholder="Toutes les classifications" />
              </SelectTrigger>
              <SelectContent className="max-h-[300px]">
                <SelectItem value="all">Toutes les classifications</SelectItem>
                {classifications.map((classif) => (
                  <SelectItem key={classif.id} value={classif.id.toString()}>
                    {classif.nom} {classif.region && `(${classif.region})`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tri */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sort-by">Trier par</Label>
              <Select value={sortBy} onValueChange={(val: any) => setSortBy(val)}>
                <SelectTrigger id="sort-by">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nom</SelectItem>
                  <SelectItem value="year">Millésime</SelectItem>
                  {showDomainFilter && <SelectItem value="domain">Domaine</SelectItem>}
                  <SelectItem value="price">Prix</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="sort-order">Ordre</Label>
              <Select value={sortOrder} onValueChange={(val: any) => setSortOrder(val)}>
                <SelectTrigger id="sort-order">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="asc">Croissant</SelectItem>
                  <SelectItem value="desc">Décroissant</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}