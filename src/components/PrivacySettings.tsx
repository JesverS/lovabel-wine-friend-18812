import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Globe, Lock, Mail, Phone, MapPin, Trophy } from 'lucide-react';

interface PrivacySettingsState {
  is_public: boolean;
  allow_email: boolean;
  allow_phone: boolean;
  allow_adress: boolean;
  allow_xp: boolean;
  email: string;
  phone_number: string;
  address: string;
  city: string;
}

export function PrivacySettings() {
  const { user } = useAuth();
  const [settings, setSettings] = useState<PrivacySettingsState>({
    is_public: false,
    allow_email: false,
    allow_phone: false,
    allow_adress: false,
    allow_xp: false,
    email: '',
    phone_number: '',
    address: '',
    city: '',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchSettings();
    }
  }, [user]);

  const fetchSettings = async () => {
    if (!user) return;
    
    const { data, error } = await supabase
      .from('user_profiles')
      .select('is_public, allow_email, allow_phone, allow_adress, allow_xp, email, phone_number, address, city')
      .eq('id', user.id)
      .single();

    if (data && !error) {
      setSettings({
        is_public: data.is_public ?? false,
        allow_email: data.allow_email ?? false,
        allow_phone: data.allow_phone ?? false,
        allow_adress: data.allow_adress ?? false,
        allow_xp: data.allow_xp ?? false,
        email: data.email || '',
        phone_number: data.phone_number?.toString() || '',
        address: data.address || '',
        city: data.city || '',
      });
    }
    setLoading(false);
  };

  const handleToggle = async (field: keyof PrivacySettingsState, value: boolean) => {
    if (!user) return;

    const { error } = await supabase
      .from('user_profiles')
      .update({ [field]: value })
      .eq('id', user.id);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
      return;
    }

    setSettings(prev => ({ ...prev, [field]: value }));
    toast.success('Paramètre mis à jour');
  };

  const handleValueChange = (field: keyof PrivacySettingsState, value: string) => {
    setSettings(prev => ({ ...prev, [field]: value }));
  };

  const handleValueSave = async (field: 'email' | 'phone_number' | 'address' | 'city') => {
    if (!user) return;

    let valueToSave: string | number | null;
    if (field === 'phone_number') {
      valueToSave = settings.phone_number ? parseInt(settings.phone_number.replace(/\D/g, '')) : null;
    } else {
      valueToSave = settings[field] || null;
    }

    const { error } = await supabase
      .from('user_profiles')
      .update({ [field]: valueToSave })
      .eq('id', user.id);

    if (error) {
      toast.error('Erreur lors de la mise à jour');
    } else {
      toast.success('Information mise à jour');
    }
  };

  if (loading) {
    return <div className="py-4 text-center text-muted-foreground">Chargement...</div>;
  }

  return (
    <div className="space-y-6 py-4">
      {/* Compte public/privé */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          {settings.is_public ? (
            <Globe className="w-5 h-5 text-primary mt-0.5" />
          ) : (
            <Lock className="w-5 h-5 text-muted-foreground mt-0.5" />
          )}
          <div>
            <Label htmlFor="is_public" className="text-base font-medium">
              Compte public
            </Label>
            <p className="text-sm text-muted-foreground">
              {settings.is_public 
                ? 'Tout le monde peut voir votre profil et vous suivre directement'
                : 'Les utilisateurs doivent demander à vous suivre'
              }
            </p>
          </div>
        </div>
        <Switch
          id="is_public"
          checked={settings.is_public}
          onCheckedChange={(v) => handleToggle('is_public', v)}
        />
      </div>

      <div className="border-t pt-6">
        <h4 className="text-sm font-medium text-muted-foreground mb-4">
          Informations visibles sur votre profil
        </h4>

        {/* Afficher email */}
        <div className="space-y-3 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Mail className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="allow_email" className="text-sm">
                Afficher mon email
              </Label>
            </div>
            <Switch
              id="allow_email"
              checked={settings.allow_email}
              onCheckedChange={(v) => handleToggle('allow_email', v)}
            />
          </div>
          {settings.allow_email && (
            <div className="ml-7 space-y-2">
              <Input
                type="email"
                placeholder="votre.email@exemple.com"
                value={settings.email}
                onChange={(e) => handleValueChange('email', e.target.value)}
                onBlur={() => handleValueSave('email')}
              />
              <p className="text-xs text-muted-foreground">
                Cet email peut être différent de celui de votre compte
              </p>
            </div>
          )}
        </div>

        {/* Afficher téléphone */}
        <div className="space-y-3 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Phone className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="allow_phone" className="text-sm">
                Afficher mon téléphone
              </Label>
            </div>
            <Switch
              id="allow_phone"
              checked={settings.allow_phone}
              onCheckedChange={(v) => handleToggle('allow_phone', v)}
            />
          </div>
          {settings.allow_phone && (
            <div className="ml-7">
              <Input
                type="tel"
                placeholder="06 12 34 56 78"
                value={settings.phone_number}
                onChange={(e) => handleValueChange('phone_number', e.target.value)}
                onBlur={() => handleValueSave('phone_number')}
              />
            </div>
          )}
        </div>

        {/* Afficher adresse */}
        <div className="space-y-3 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <MapPin className="w-4 h-4 text-muted-foreground" />
              <Label htmlFor="allow_adress" className="text-sm">
                Afficher mon adresse
              </Label>
            </div>
            <Switch
              id="allow_adress"
              checked={settings.allow_adress}
              onCheckedChange={(v) => handleToggle('allow_adress', v)}
            />
          </div>
          {settings.allow_adress && (
            <div className="ml-7 space-y-2">
              <Input
                type="text"
                placeholder="Adresse"
                value={settings.address}
                onChange={(e) => handleValueChange('address', e.target.value)}
                onBlur={() => handleValueSave('address')}
              />
              <Input
                type="text"
                placeholder="Ville"
                value={settings.city}
                onChange={(e) => handleValueChange('city', e.target.value)}
                onBlur={() => handleValueSave('city')}
              />
            </div>
          )}
        </div>

        {/* Afficher XP */}
        <div className="flex items-center justify-between gap-4 py-3">
          <div className="flex items-center gap-3">
            <Trophy className="w-4 h-4 text-muted-foreground" />
            <Label htmlFor="allow_xp" className="text-sm">
              Afficher mon niveau et XP
            </Label>
          </div>
          <Switch
            id="allow_xp"
            checked={settings.allow_xp}
            onCheckedChange={(v) => handleToggle('allow_xp', v)}
          />
        </div>
      </div>
    </div>
  );
}
