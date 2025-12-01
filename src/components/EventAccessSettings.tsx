import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Info } from 'lucide-react';

interface EventAccessSettingsProps {
  accessType: 'public' | 'paid' | 'request_based' | 'invite_only';
  price: string;
  currency: string;
  maxParticipants: string;
  confidentialAddress: boolean;
  confidentialPhone: boolean;
  confidentialParticipantList: boolean;
  onAccessTypeChange: (value: 'public' | 'paid' | 'request_based' | 'invite_only') => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onMaxParticipantsChange: (value: string) => void;
  onConfidentialAddressChange: (value: boolean) => void;
  onConfidentialPhoneChange: (value: boolean) => void;
  onConfidentialParticipantListChange: (value: boolean) => void;
}

export function EventAccessSettings({
  accessType,
  price,
  currency,
  maxParticipants,
  confidentialAddress,
  confidentialPhone,
  confidentialParticipantList,
  onAccessTypeChange,
  onPriceChange,
  onCurrencyChange,
  onMaxParticipantsChange,
  onConfidentialAddressChange,
  onConfidentialPhoneChange,
  onConfidentialParticipantListChange,
}: EventAccessSettingsProps) {
  return (
    <div className="space-y-6 border-t pt-6">
      <div>
        <h3 className="text-lg font-semibold mb-1">Paramètres d'accès</h3>
        <p className="text-sm text-muted-foreground">
          Configurez comment les utilisateurs peuvent accéder à votre événement
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="access_type">Type d'accès *</Label>
        <Select value={accessType} onValueChange={onAccessTypeChange}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="public">Public - Accessible à tous</SelectItem>
            <SelectItem value="request_based">Sur demande - Approbation requise</SelectItem>
            <SelectItem value="invite_only">Sur invitation uniquement</SelectItem>
            <SelectItem value="paid">Payant - Paiement requis</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-muted-foreground">
          {accessType === 'public' && 'Tout le monde peut voir tous les détails de l\'événement'}
          {accessType === 'request_based' && 'Les utilisateurs doivent faire une demande pour accéder aux détails'}
          {accessType === 'invite_only' && 'Seules les personnes invitées peuvent accéder aux détails'}
          {accessType === 'paid' && 'Un paiement est requis pour accéder aux détails'}
        </p>
      </div>

      {accessType === 'paid' && (
        <div className="space-y-4 bg-muted/50 p-4 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-primary mt-0.5" />
            <p className="text-sm text-muted-foreground">
              La fonctionnalité de paiement sera disponible prochainement
            </p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder="0.00"
                disabled
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select value={currency} onValueChange={onCurrencyChange} disabled>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR (€)</SelectItem>
                  <SelectItem value="USD">USD ($)</SelectItem>
                  <SelectItem value="GBP">GBP (£)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      )}

      {(accessType === 'request_based' || accessType === 'invite_only' || accessType === 'paid') && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Informations confidentielles</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Ces informations ne seront visibles que par les participants approuvés ou ayant payé
            </p>
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confidential_address">Adresse confidentielle</Label>
              <p className="text-xs text-muted-foreground">
                L'adresse exacte ne sera visible qu'après approbation
              </p>
            </div>
            <Switch
              id="confidential_address"
              checked={confidentialAddress}
              onCheckedChange={onConfidentialAddressChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confidential_phone">Téléphone confidentiel</Label>
              <p className="text-xs text-muted-foreground">
                Le numéro de téléphone ne sera visible qu'après approbation
              </p>
            </div>
            <Switch
              id="confidential_phone"
              checked={confidentialPhone}
              onCheckedChange={onConfidentialPhoneChange}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="confidential_participants">Liste des participants</Label>
              <p className="text-xs text-muted-foreground">
                La liste des participants sera cachée
              </p>
            </div>
            <Switch
              id="confidential_participants"
              checked={confidentialParticipantList}
              onCheckedChange={onConfidentialParticipantListChange}
            />
          </div>
        </div>
      )}

      <div className="space-y-2">
        <Label htmlFor="max_participants">Nombre maximum de participants</Label>
        <Input
          id="max_participants"
          type="number"
          min="1"
          value={maxParticipants}
          onChange={(e) => onMaxParticipantsChange(e.target.value)}
          placeholder="Illimité"
        />
        <p className="text-xs text-muted-foreground">
          Laisser vide pour un nombre illimité
        </p>
      </div>
    </div>
  );
}
