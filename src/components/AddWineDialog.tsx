import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2, Upload, X, Check } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { CreateDomainDialog } from './CreateDomainDialog';

interface AddWineDialogProps {
  cellarId: string;
  onWineAdded: () => void;
}

export function AddWineDialog({ cellarId, onWineAdded }: AddWineDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'search' | 'results' | 'found' | 'create'>('search');
  
  // Search fields
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [displayedResults, setDisplayedResults] = useState<any[]>([]);
  const [currentOffset, setCurrentOffset] = useState(0);
  const [hasMoreResults, setHasMoreResults] = useState(false);
  const RESULTS_PER_PAGE = 8;
  
  // Found wine
  const [foundWine, setFoundWine] = useState<any>(null);
  const [imageChoice, setImageChoice] = useState<'default' | 'custom'>('default');
  const [customLabelFile, setCustomLabelFile] = useState<File | null>(null);
  const [customLabelPreview, setCustomLabelPreview] = useState<string>('');
  
  // Create wine fields
  const [selectedDomain, setSelectedDomain] = useState<any>(null);
  const [domainSearch, setDomainSearch] = useState('');
  const [domainResults, setDomainResults] = useState<any[]>([]);
  const [showDomainResults, setShowDomainResults] = useState(false);
  const [year, setYear] = useState('');
  const [volume, setVolume] = useState('750');
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [description, setDescription] = useState('');
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [labelPreview, setLabelPreview] = useState<string>('');
  const [uploadingImages, setUploadingImages] = useState(false);

  const searchDomains = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setDomainResults([]);
      setShowDomainResults(false);
      return;
    }

    try {
      const { data, error } = await (supabase as any).rpc('search_domains', {
        query: query.trim()
      });

      if (error) throw error;
      setDomainResults(data || []);
      setShowDomainResults(true);
    } catch (error) {
      console.error('Error searching domains:', error);
      setDomainResults([]);
      setShowDomainResults(true);
    }
  };

  const handleDomainSearch = (value: string) => {
    setDomainSearch(value);
    setSelectedDomain(null);
    if (value.trim().length >= 2) {
      searchDomains(value);
    } else {
      setDomainResults([]);
      setShowDomainResults(false);
    }
  };

  const handleSelectDomain = (domain: any) => {
    setSelectedDomain(domain);
    setDomainSearch(domain.name);
    setShowDomainResults(false);
  };

  const handleSearchWine = async () => {
    if (!searchQuery.trim()) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez entrer un nom de vin, domaine ou année',
      });
      return;
    }

    setSearchLoading(true);
    setCurrentOffset(0);

    try {
      const { data, error } = await (supabase as any).rpc('search_wines', {
        query: searchQuery.trim()
      });

      if (error) throw error;

      setSearchResults(data || []);
      setDisplayedResults((data || []).slice(0, RESULTS_PER_PAGE));
      setHasMoreResults((data || []).length > RESULTS_PER_PAGE);
      setStep('results');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message,
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleLoadMore = () => {
    const newOffset = currentOffset + RESULTS_PER_PAGE;
    const newDisplayed = searchResults.slice(0, newOffset + RESULTS_PER_PAGE);
    setDisplayedResults(newDisplayed);
    setCurrentOffset(newOffset);
    setHasMoreResults(newDisplayed.length < searchResults.length);
  };

  const handleSelectWine = (wine: any) => {
    setFoundWine(wine);
    setStep('found');
  };

  const handleCreateNewWine = () => {
    setStep('create');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !searchLoading) {
      handleSearchWine();
    }
  };

  const handleCustomLabelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "L'image ne doit pas dépasser 5 Mo",
      });
      return;
    }

    setCustomLabelFile(file);
    setCustomLabelPreview(URL.createObjectURL(file));
  };

  const handleLabelSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez sélectionner une image',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: "L'image ne doit pas dépasser 5 Mo",
      });
      return;
    }

    setLabelFile(file);
    setLabelPreview(URL.createObjectURL(file));
  };

  const handleAddFoundWine = async () => {
    if (!user || !foundWine) return;

    setLoading(true);

    try {
      let cellarLabelUrl = null;

      if (imageChoice === 'default') {
        // Use domain's wine label
        cellarLabelUrl = foundWine.label_url;
      } else if (customLabelFile) {
        // Upload custom label to cellar bucket
        setUploadingImages(true);
        const fileExt = customLabelFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${cellarId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('cellar')
          .upload(filePath, customLabelFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('cellar')
          .getPublicUrl(filePath);

        cellarLabelUrl = urlData.publicUrl;
        setUploadingImages(false);
      }

      // Add wine to cellar
      const { error: cellarWineError } = await supabase
        .from('cellar_wine')
        .insert({
          cellar_id: cellarId,
          wine_id: foundWine.id,
          quantity: parseInt(quantity),
          label_url: cellarLabelUrl,
        });

      if (cellarWineError) throw cellarWineError;

      toast({
        title: 'Succès',
        description: 'Vin ajouté à la cave',
      });

      setOpen(false);
      resetForm();
      onWineAdded();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible d'ajouter le vin",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const handleCreateWine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedDomain || !labelFile) return;

    setLoading(true);
    setUploadingImages(true);

    try {
      const finalDomainId = selectedDomain.id;

      // Upload to domain bucket
      const fileExt = labelFile.name.split('.').pop();
      const domainFileName = `${Date.now()}-domain.${fileExt}`;
      const domainFilePath = `${finalDomainId}/${domainFileName}`;

      const { error: domainUploadError } = await supabase.storage
        .from('domain')
        .upload(domainFilePath, labelFile);

      if (domainUploadError) throw domainUploadError;

      const { data: domainUrlData } = supabase.storage
        .from('domain')
        .getPublicUrl(domainFilePath);

      // Upload to cellar bucket
      const cellarFileName = `${Date.now()}-cellar.${fileExt}`;
      const cellarFilePath = `${cellarId}/${cellarFileName}`;

      const { error: cellarUploadError } = await supabase.storage
        .from('cellar')
        .upload(cellarFilePath, labelFile);

      if (cellarUploadError) throw cellarUploadError;

      const { data: cellarUrlData } = supabase.storage
        .from('cellar')
        .getPublicUrl(cellarFilePath);

      setUploadingImages(false);

      // Create wine in registry
      const { data: wineData, error: wineError } = await supabase
        .from('wine')
        .insert({
          name: searchQuery,
          year: year ? parseInt(year) : null,
          domain_id: finalDomainId,
          volume_ml: parseInt(volume),
          price: price ? parseFloat(price) : null,
          description,
          label_url: domainUrlData.publicUrl,
        })
        .select()
        .single();

      if (wineError) throw wineError;

      // Add wine to cellar
      const { error: cellarWineError } = await supabase
        .from('cellar_wine')
        .insert({
          cellar_id: cellarId,
          wine_id: wineData.id,
          quantity: parseInt(quantity),
          label_url: cellarUrlData.publicUrl,
        });

      if (cellarWineError) throw cellarWineError;

      toast({
        title: 'Succès',
        description: 'Vin créé et ajouté à la cave',
      });

      setOpen(false);
      resetForm();
      onWineAdded();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || "Impossible de créer le vin",
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
      setUploadingImages(false);
    }
  };

  const resetForm = () => {
    setStep('search');
    setSearchQuery('');
    setSearchResults([]);
    setDisplayedResults([]);
    setCurrentOffset(0);
    setHasMoreResults(false);
    setFoundWine(null);
    setImageChoice('default');
    setCustomLabelFile(null);
    setCustomLabelPreview('');
    setSelectedDomain(null);
    setDomainSearch('');
    setDomainResults([]);
    setShowDomainResults(false);
    setYear('');
    setVolume('750');
    setPrice('');
    setQuantity('1');
    setDescription('');
    setLabelFile(null);
    setLabelPreview('');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter un vin
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'search' && 'Rechercher un vin'}
            {step === 'results' && 'Résultats de recherche'}
            {step === 'found' && 'Vin sélectionné'}
            {step === 'create' && 'Créer un nouveau vin'}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Search */}
        {step === 'search' && (
          <div className="space-y-4">
            <div>
              <Label htmlFor="search-query">Rechercher un vin</Label>
              <Input
                id="search-query"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Nom du vin, domaine ou année..."
                required
              />
              <p className="text-xs text-muted-foreground mt-1">
                Appuyez sur Entrée pour rechercher
              </p>
            </div>

            <Button
              onClick={handleSearchWine}
              disabled={searchLoading || !searchQuery.trim()}
              className="w-full"
            >
              {searchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Recherche...
                </>
              ) : (
                'Rechercher'
              )}
            </Button>
          </div>
        )}

        {/* Step 2: Search Results */}
        {step === 'results' && (
          <div className="space-y-4">
            {searchResults.length === 0 ? (
              <div className="text-center py-8 space-y-4">
                <p className="text-muted-foreground">
                  Aucun vin trouvé pour votre recherche.
                </p>
                <Button
                  onClick={handleCreateNewWine}
                  variant="outline"
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Mon vin est introuvable
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-4">
                  {displayedResults.map((wine) => (
                    <div
                      key={wine.id}
                      onClick={() => handleSelectWine(wine)}
                      className="border rounded-lg p-3 cursor-pointer hover:border-primary transition-colors"
                    >
                      {wine.label_url && (
                        <img
                          src={wine.label_url}
                          alt={wine.name}
                          className="w-full h-32 object-cover rounded mb-2"
                        />
                      )}
                      <h4 className="font-semibold text-sm line-clamp-2">{wine.name}</h4>
                      <p className="text-xs text-muted-foreground">{wine.domain?.name}</p>
                      {wine.year && (
                        <p className="text-xs text-muted-foreground">Année: {wine.year}</p>
                      )}
                    </div>
                  ))}
                </div>

                {hasMoreResults && (
                  <Button
                    onClick={handleLoadMore}
                    variant="outline"
                    className="w-full"
                  >
                    Charger plus de résultats
                  </Button>
                )}

                {!hasMoreResults && displayedResults.length > 0 && (
                  <Button
                    onClick={handleCreateNewWine}
                    variant="outline"
                    className="w-full"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Mon vin est introuvable
                  </Button>
                )}
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep('search')}
              className="w-full"
            >
              Nouvelle recherche
            </Button>
          </div>
        )}

        {/* Step 3: Found Wine */}
        {step === 'found' && foundWine && (
          <div className="space-y-6">
            <div className="bg-muted/30 p-4 rounded-lg">
              <div className="flex items-start gap-4">
                {foundWine.label_url && (
                  <img
                    src={foundWine.label_url}
                    alt={foundWine.name}
                    className="w-24 h-32 object-cover rounded"
                  />
                )}
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{foundWine.name}</h3>
                  <p className="text-sm text-muted-foreground">{foundWine.domain?.name}</p>
                  {foundWine.year && (
                    <p className="text-sm text-muted-foreground">Année: {foundWine.year}</p>
                  )}
                  {foundWine.description && (
                    <p className="text-sm mt-2">{foundWine.description}</p>
                  )}
                </div>
              </div>
            </div>

            <div>
              <Label>Quantité *</Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
              />
            </div>

            <div className="space-y-3">
              <Label>Image de l'étiquette</Label>
              <RadioGroup value={imageChoice} onValueChange={(value: any) => setImageChoice(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="default" id="default" />
                  <Label htmlFor="default" className="font-normal cursor-pointer">
                    Utiliser l'image du domaine
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="font-normal cursor-pointer">
                    Uploader une image personnalisée
                  </Label>
                </div>
              </RadioGroup>

              {imageChoice === 'custom' && (
                <div className="mt-4">
                  {customLabelPreview ? (
                    <div className="relative">
                      <img
                        src={customLabelPreview}
                        alt="Preview"
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute top-2 right-2"
                        onClick={() => {
                          setCustomLabelFile(null);
                          setCustomLabelPreview('');
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ) : (
                    <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleCustomLabelSelect}
                        className="hidden"
                        id="custom-label-upload"
                      />
                      <label htmlFor="custom-label-upload" className="cursor-pointer">
                        <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          Cliquez pour ajouter une photo
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">Max 5 Mo</p>
                      </label>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setStep('results')}>
                Retour
              </Button>
              <Button
                onClick={handleAddFoundWine}
                disabled={loading || uploadingImages || (imageChoice === 'custom' && !customLabelFile)}
              >
                {loading || uploadingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingImages ? 'Upload...' : 'Ajout...'}
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Ajouter à ma cave
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 4: Create New Wine */}
        {step === 'create' && (
          <form onSubmit={handleCreateWine} className="space-y-4">
            <div className="bg-muted/30 p-4 rounded-lg">
              <p className="text-sm text-muted-foreground">
                Ce vin n'existe pas encore dans notre base. Créons-le ensemble !
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="domain-search">Domaine *</Label>
              <Input
                id="domain-search"
                value={domainSearch}
                onChange={(e) => handleDomainSearch(e.target.value)}
                placeholder="Rechercher un domaine..."
              />
              
              {showDomainResults && (
                <div className="border rounded-md mt-1 max-h-60 overflow-y-auto bg-background z-50">
                  {domainResults.length > 0 ? (
                    <div className="divide-y">
                      {domainResults.map((domain) => (
                        <div
                          key={domain.id}
                          onClick={() => handleSelectDomain(domain)}
                          className="p-3 hover:bg-accent cursor-pointer transition-colors"
                        >
                          <div className="font-medium">{domain.name}</div>
                          {domain.description && (
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {domain.description}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Aucun domaine trouvé
                      </p>
                      <CreateDomainDialog
                        onDomainCreated={(newDomain) => {
                          handleSelectDomain(newDomain);
                        }}
                        initialName={domainSearch}
                      />
                    </div>
                  )}
                </div>
              )}
              
              {selectedDomain && (
                <p className="text-sm text-muted-foreground">
                  Sélectionné: {selectedDomain.name}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="wine-name">Nom du vin *</Label>
              <Input
                id="wine-name"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                required
              />
            </div>

            <div>
              <Label htmlFor="year-create">Année</Label>
              <Input
                id="year-create"
                type="number"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                placeholder="2020"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="volume">Volume (ml) *</Label>
                <Input
                  id="volume"
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  required
                />
              </div>
              <div>
                <Label htmlFor="price">Prix (€)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="15.00"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="quantity-create">Quantité *</Label>
              <Input
                id="quantity-create"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                required
                min="1"
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Étiquette *</Label>
              {labelPreview ? (
                <div className="relative">
                  <img
                    src={labelPreview}
                    alt="Preview"
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    className="absolute top-2 right-2"
                    onClick={() => {
                      setLabelFile(null);
                      setLabelPreview('');
                    }}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLabelSelect}
                    className="hidden"
                    id="label-upload"
                    required
                  />
                  <label htmlFor="label-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      Cliquez pour ajouter une photo
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">Max 5 Mo</p>
                  </label>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end">
              <Button type="button" variant="outline" onClick={() => setStep('results')}>
                Retour
              </Button>
              <Button type="submit" disabled={loading || uploadingImages || !labelFile}>
                {loading || uploadingImages ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {uploadingImages ? 'Upload...' : 'Création...'}
                  </>
                ) : (
                  'Créer et ajouter'
                )}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}