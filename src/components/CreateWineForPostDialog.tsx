import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Upload } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { CreateDomainDialog } from './CreateDomainDialog';
import { WineTypeSelect } from '@/components/wine/WineTypeSelect';
import { AppellationSelect } from '@/components/wine/AppellationSelect';
import { WineLabelScanner } from '@/components/WineLabelScanner';
import { WineLabelData } from '@/hooks/useWineLabelScan';
import { useUserRole } from '@/hooks/useUserRole';

interface CreateWineForPostDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialWineName?: string;
  onWineCreated: (wine: any) => void;
}

export function CreateWineForPostDialog({
  open,
  onOpenChange,
  initialWineName = '',
  onWineCreated,
}: CreateWineForPostDialogProps) {
  const { canUseAI, loading: roleLoading } = useUserRole();
  const [loading, setLoading] = useState(false);
  const [isAIMode, setIsAIMode] = useState(false); // True when a scan was done
  const [name, setName] = useState(initialWineName);
  const [year, setYear] = useState('');
  const [volume, setVolume] = useState('750');
  const [description, setDescription] = useState('');
  const [wineType, setWineType] = useState<number | null>(1); // 1 = rouge par défaut
  const [appellationId, setAppellationId] = useState<number | null>(null);
  const [labelFile, setLabelFile] = useState<File | null>(null);
  const [labelPreview, setLabelPreview] = useState<string>('');
  
  const [domainSearch, setDomainSearch] = useState('');
  const [domains, setDomains] = useState<any[]>([]);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  useEffect(() => {
    setName(initialWineName);
  }, [initialWineName]);

  useEffect(() => {
    const searchDomains = async () => {
      if (domainSearch.length < 2) {
        setDomains([]);
        return;
      }

      const { data, error } = await supabase
        .from('domain')
        .select('id, name, region, logo_url')
        .ilike('name', `%${domainSearch}%`)
        .limit(10);

      if (!error && data) {
        setDomains(data);
      }
    };

    const timer = setTimeout(searchDomains, 300);
    return () => clearTimeout(timer);
  }, [domainSearch]);

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

  const handleScanComplete = async (data: WineLabelData, imageBase64: string | null) => {
    setIsAIMode(true);
    
    // Wine name (fallback to domain name if null)
    setName(data.wine_name || data.domain_name || '');
    
    // Domain already resolved by edge function
    if (data.domain_id && data.domain_name) {
      setSelectedDomain({ 
        id: data.domain_id, 
        name: data.domain_name,
        region: data.region || data.custom_region 
      });
      setDomainSearch('');
      setDomains([]);
    }
    
    // Appellation already resolved by edge function
    if (data.appellation_id) {
      setAppellationId(data.appellation_id);
    }
    
    // Other fields
    if (data.year) setYear(data.year.toString());
    if (data.volume_ml) setVolume(data.volume_ml.toString());
    if (data.wine_type) {
      const typeMap: Record<string, number> = { rouge: 1, blanc: 2, rosé: 5, effervescent: 8, autre: 7 };
      setWineType(typeMap[data.wine_type] || 1);
    }
    
    // Pre-fill label image with the scanned photo
    if (imageBase64) {
      setLabelPreview(imageBase64);
      // Convert base64 to File for upload
      try {
        const response = await fetch(imageBase64);
        const blob = await response.blob();
        const file = new File([blob], 'etiquette.jpg', { type: 'image/jpeg' });
        setLabelFile(file);
      } catch (err) {
        console.error('Failed to convert image to file:', err);
      }
    }
  };

  const handleCreateWine = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !selectedDomain) {
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: 'Veuillez remplir le nom et sélectionner un domaine',
      });
      return;
    }

    setLoading(true);

    try {
      let labelUrl = 'https://amzutunyjouejovlrlah.supabase.co/storage/v1/object/public/domain/tmp/default.png';

      if (labelFile) {
        const fileExt = labelFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const filePath = `${selectedDomain.id}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('domain')
          .upload(filePath, labelFile);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from('domain')
          .getPublicUrl(filePath);

        labelUrl = urlData.publicUrl;
      }

      const { data: wineData, error: wineError } = await supabase
        .from('wine')
        .insert({
          name: name.trim(),
          year: year ? parseInt(year) : null,
          domain_id: selectedDomain.id,
          volume_ml: parseInt(volume),
          description: description.trim() || null,
          label_url: labelUrl,
          type: wineType,
          appellation_id: appellationId,
        })
        .select(`
          *,
          domain:domain_id(id, name, region, logo_url)
        `)
        .single();

      if (wineError) throw wineError;

      toast({
        title: 'Succès',
        description: 'Vin créé avec succès',
      });

      onWineCreated(wineData);
      onOpenChange(false);
      resetForm();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Impossible de créer le vin',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName(initialWineName);
    setYear('');
    setVolume('750');
    setDescription('');
    setWineType(1);
    setAppellationId(null);
    setLabelFile(null);
    setLabelPreview('');
    setDomainSearch('');
    setDomains([]);
    setSelectedDomain(null);
    setIsAIMode(false);
  };

  const handleDomainCreated = async () => {
    // Refresh domain search to show the newly created domain
    if (domainSearch) {
      const { data } = await supabase
        .from('domain')
        .select('id, name, region, logo_url')
        .ilike('name', `%${domainSearch}%`)
        .limit(10);
      if (data && data.length > 0) {
        setDomains(data);
        // Auto-select the first result (likely the newly created one)
        setSelectedDomain(data[0]);
      }
    }
  };

  // Show "Ajouter mon domaine" only in manual mode (not AI mode)
  const showCreateDomainButton = !isAIMode && domainSearch.length >= 2 && domains.length === 0;

  return (
    <>
      <Dialog open={open} onOpenChange={(isOpen) => {
        onOpenChange(isOpen);
        if (!isOpen) resetForm();
      }}>
        <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-0">
          <DialogHeader className="px-6 pt-6 pb-2">
            <DialogTitle>Ajouter une nouvelle bouteille</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto px-6 pb-6">
            <form onSubmit={handleCreateWine} className="space-y-4">
              {/* Scanner d'étiquette - only for users with a role */}
              {canUseAI && !roleLoading && (
                <WineLabelScanner
                  onScanComplete={handleScanComplete}
                  disabled={loading}
                />
              )}

              {/* Domain selection */}
              <div className="space-y-2">
                <Label>Domaine *</Label>
                {selectedDomain ? (
                  <div className="flex items-center gap-2 p-3 border rounded-md">
                    {selectedDomain.logo_url && (
                      <img 
                        src={selectedDomain.logo_url} 
                        alt={selectedDomain.name}
                        className="w-8 h-8 object-cover rounded"
                      />
                    )}
                    <div className="flex-1">
                      <p className="font-medium text-sm">{selectedDomain.name}</p>
                      {selectedDomain.region && (
                        <p className="text-xs text-muted-foreground">{selectedDomain.region}</p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setSelectedDomain(null);
                        setIsAIMode(false); // Allow manual mode again
                      }}
                    >
                      Changer
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <Input
                      placeholder="Rechercher un domaine..."
                      value={domainSearch}
                      onChange={(e) => setDomainSearch(e.target.value)}
                    />
                    {domains.length > 0 && (
                      <div className="border rounded-md divide-y max-h-40 overflow-y-auto">
                        {domains.map((domain) => (
                          <button
                            key={domain.id}
                            type="button"
                            onClick={() => {
                              setSelectedDomain(domain);
                              setDomainSearch('');
                              setDomains([]);
                            }}
                            className="w-full flex items-center gap-2 p-2 hover:bg-accent transition-colors"
                          >
                            {domain.logo_url && (
                              <img 
                                src={domain.logo_url} 
                                alt={domain.name}
                                className="w-8 h-8 object-cover rounded"
                              />
                            )}
                            <div className="flex-1 text-left">
                              <p className="font-medium text-sm">{domain.name}</p>
                              {domain.region && (
                                <p className="text-xs text-muted-foreground">{domain.region}</p>
                              )}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                    {/* Only show create domain button in manual mode */}
                    {showCreateDomainButton && (
                      <CreateDomainDialog 
                        onDomainCreated={handleDomainCreated}
                        initialName={domainSearch}
                      />
                    )}
                  </div>
                )}
              </div>

              <div>
                <Label htmlFor="wine-name">Nom du vin *</Label>
                <Input
                  id="wine-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Cuvée Prestige"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="wine-year">Année</Label>
                  <Input
                    id="wine-year"
                    type="number"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="Ex: 2020"
                    min="1900"
                    max={new Date().getFullYear()}
                  />
                </div>

                <div>
                  <Label htmlFor="wine-volume">Volume (ml)</Label>
                  <Input
                    id="wine-volume"
                    type="number"
                    value={volume}
                    onChange={(e) => setVolume(e.target.value)}
                    placeholder="750"
                    min="1"
                  />
                </div>
              </div>

              <WineTypeSelect
                value={wineType}
                onChange={setWineType}
              />

              <AppellationSelect
                value={appellationId}
                onChange={(id) => setAppellationId(id)}
                wineTypeId={wineType}
              />

              <div>
                <Label htmlFor="wine-description">Description</Label>
                <Textarea
                  id="wine-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Description du vin..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="wine-label">Étiquette du vin {isAIMode ? '' : '(optionnel)'}</Label>
                <div className="flex items-center gap-4">
                  <label htmlFor="wine-label" className="cursor-pointer">
                    <div className="border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors text-center">
                      {labelPreview ? (
                        <img
                          src={labelPreview}
                          alt="Label preview"
                          className="w-24 h-24 object-contain mx-auto"
                        />
                      ) : (
                        <div className="flex flex-col items-center">
                          <Upload className="w-8 h-8 text-muted-foreground mb-2" />
                          <p className="text-sm text-muted-foreground">
                            Cliquez pour ajouter
                          </p>
                        </div>
                      )}
                    </div>
                  </label>
                  <input
                    id="wine-label"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLabelSelect}
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading || !name.trim() || !selectedDomain}
                className="w-full mt-4"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Création...
                  </>
                ) : (
                  'Créer la bouteille'
                )}
              </Button>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
