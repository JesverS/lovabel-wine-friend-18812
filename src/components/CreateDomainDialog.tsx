import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Plus, Upload, X, Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CreateDomainDialogProps {
  onDomainCreated: () => void;
  initialName?: string;
}

export function CreateDomainDialog({ onDomainCreated, initialName }: CreateDomainDialogProps) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedRole, setSelectedRole] = useState<number>(3); // Default: Employé
  const [name, setName] = useState(initialName || '');
  const [description, setDescription] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  useEffect(() => {
    const searchDomains = async () => {
      if (searchQuery.length < 2) {
        setSearchResults([]);
        return;
      }

      const { data } = await supabase
        .from('domain')
        .select('*')
        .ilike('name', `%${searchQuery}%`)
        .limit(5);

      setSearchResults(data || []);
    };

    const debounce = setTimeout(searchDomains, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleRequestDomain = async (domain: any) => {
    if (!user) return;

    setLoading(true);
    try {
      // Créer une demande d'application avec le rôle choisi
      const { error } = await supabase
        .from('user_domain_application')
        .insert({
          user_id: user.id,
          domain_id: domain.id,
          role: selectedRole
        });

      if (error) throw error;

      const roleLabel = selectedRole === 1 ? 'propriétaire' : selectedRole === 2 ? 'administrateur' : 'employé';
      toast.success(`Demande de rôle ${roleLabel} envoyée`);
      setOpen(false);
      onDomainCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error('L\'image ne doit pas dépasser 5 Mo');
      return;
    }

    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleCreateDomain = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast.error('Vous devez être connecté');
      return;
    }

    if (!name.trim()) {
      toast.error('Le nom du domaine est requis');
      return;
    }

    setLoading(true);

    try {
      let logoUrl = null;

      if (logoFile) {
        const fileExt = logoFile.name.split('.').pop();
        const fileName = `${Date.now()}.${fileExt}`;
        const { error: uploadError } = await supabase.storage
          .from('domain')
          .upload(fileName, logoFile);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('domain')
          .getPublicUrl(fileName);

        logoUrl = publicUrl;
      }

      const { data: domain, error: domainError } = await supabase
        .from('domain')
        .insert({
          name: name.trim(),
          description: description.trim() || null,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (domainError) throw domainError;

      // Créer une demande au lieu d'ajouter directement
      const { error: applicationError } = await supabase
        .from('user_domain_application')
        .insert({
          user_id: user.id,
          domain_id: domain.id,
          role: selectedRole // Utiliser le rôle choisi
        });

      if (applicationError) throw applicationError;

      toast.success('Domaine créé, demande envoyée à l\'administration');
      resetForm();
      setOpen(false);
      onDomainCreated();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowCreateForm(false);
    setName(initialName || '');
    setDescription('');
    setLogoFile(null);
    setLogoPreview(null);
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) resetForm();
    }}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Ajouter mon domaine
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter mon domaine</DialogTitle>
        </DialogHeader>

        {!showCreateForm ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="search">Rechercher un domaine existant</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Nom du domaine..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="role">Rôle demandé</Label>
              <Select value={selectedRole.toString()} onValueChange={(value) => setSelectedRole(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Propriétaire</SelectItem>
                  <SelectItem value="2">Administrateur</SelectItem>
                  <SelectItem value="3">Employé</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {searchResults.length > 0 && (
              <div className="space-y-2">
                {searchResults.map((domain) => (
                  <Card key={domain.id} className="cursor-pointer hover:bg-accent" onClick={() => handleRequestDomain(domain)}>
                    <CardContent className="p-4 flex items-center gap-3">
                      {domain.logo_url && (
                        <img src={domain.logo_url} alt={domain.name} className="w-12 h-12 rounded object-cover" />
                      )}
                      <div className="flex-1">
                        <h4 className="font-semibold">{domain.name}</h4>
                        {domain.description && (
                          <p className="text-sm text-muted-foreground line-clamp-1">{domain.description}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">Aucun domaine trouvé</p>
                <Button onClick={() => {
                  setShowCreateForm(true);
                  setName(searchQuery);
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Créer ce domaine
                </Button>
              </div>
            )}

            {searchQuery.length < 2 && (
              <div className="text-center py-8">
                <Button onClick={() => setShowCreateForm(true)} variant="outline">
                  <Plus className="w-4 h-4 mr-2" />
                  Créer un nouveau domaine
                </Button>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={handleCreateDomain} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nom du domaine *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Château de..."
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Décrivez votre domaine..."
                rows={4}
              />
            </div>

            <div className="space-y-2">
              <Label>Logo du domaine</Label>
              <div className="flex items-center gap-4">
                <input
                  type="file"
                  id="logo"
                  accept="image/*"
                  onChange={handleLogoSelect}
                  className="hidden"
                />
                <label
                  htmlFor="logo"
                  className="flex items-center justify-center w-32 h-32 border-2 border-dashed rounded-lg cursor-pointer hover:border-primary transition-colors"
                >
                  {logoPreview ? (
                    <div className="relative w-full h-full">
                      <img
                        src={logoPreview}
                        alt="Preview"
                        className="w-full h-full object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        className="absolute -top-2 -right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Ajouter un logo</span>
                    </div>
                  )}
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1">
                Retour
              </Button>
              <Button type="submit" disabled={loading} className="flex-1">
                {loading ? 'Création...' : 'Créer le domaine'}
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
