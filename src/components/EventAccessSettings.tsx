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
import { Info, AlertTriangle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { MIN_EVENT_PRICE, calculateRefundAmount, REFUND_FEE_PERCENT, REFUND_FEE_FIXED } from '@/lib/refundUtils';

// Frais plateforme (inclut Stripe ~2.9% + frais plateforme)
const PLATFORM_FEE_PERCENT = 10;

interface EventAccessSettingsProps {
  accessType: 'public' | 'paid' | 'request_based' | 'invite_only';
  price: string;
  currency: string;
  maxParticipants: string;
  confidentialAddress: boolean;
  confidentialPhone: boolean;
  confidentialEmail: boolean;
  confidentialParticipantList: boolean;
  contactPhone?: string;
  contactEmail?: string;
  onAccessTypeChange: (value: 'public' | 'paid' | 'request_based' | 'invite_only') => void;
  onPriceChange: (value: string) => void;
  onCurrencyChange: (value: string) => void;
  onMaxParticipantsChange: (value: string) => void;
  onConfidentialAddressChange: (value: boolean) => void;
  onConfidentialPhoneChange: (value: boolean) => void;
  onConfidentialEmailChange: (value: boolean) => void;
  onConfidentialParticipantListChange: (value: boolean) => void;
  onContactPhoneChange?: (value: string) => void;
  onContactEmailChange?: (value: string) => void;
  stripeConfigured?: boolean;
  stripeLoading?: boolean;
  userProfileSlug?: string;
}

export function EventAccessSettings({
  accessType,
  price,
  currency,
  maxParticipants,
  confidentialAddress,
  confidentialPhone,
  confidentialEmail,
  confidentialParticipantList,
  contactPhone,
  contactEmail,
  onAccessTypeChange,
  onPriceChange,
  onCurrencyChange,
  onMaxParticipantsChange,
  onConfidentialAddressChange,
  onConfidentialPhoneChange,
  onConfidentialEmailChange,
  onConfidentialParticipantListChange,
  onContactPhoneChange,
  onContactEmailChange,
  stripeConfigured,
  stripeLoading,
  userProfileSlug,
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
          {/* Avertissement Stripe non configuré */}
          {stripeConfigured === false && !stripeLoading && (
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="font-medium text-destructive">Compte Stripe non configuré</p>
                  <p className="text-sm text-muted-foreground">
                    Pour créer un événement payant, vous devez d'abord configurer votre compte Stripe 
                    pour recevoir les paiements.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Rendez-vous dans les paramètres de votre profil (icône ⚙️) pour configurer votre compte Stripe.
                  </p>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Prix *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                min={MIN_EVENT_PRICE}
                value={price}
                onChange={(e) => onPriceChange(e.target.value)}
                placeholder="10.00"
                required
              />
              <p className="text-xs text-muted-foreground">
                Le prix minimum est de {MIN_EVENT_PRICE.toFixed(2)} €
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="currency">Devise</Label>
              <Select value={currency} onValueChange={onCurrencyChange}>
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
          
          {/* Affichage des gains nets */}
          {price && parseFloat(price) > 0 && (
            <div className="border border-border rounded-md p-3 bg-background">
              <div className="flex items-start gap-2">
                <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                <div className="space-y-2 text-sm">
                  <p className="text-muted-foreground">
                    Prix affiché aux participants : <strong className="text-foreground">{parseFloat(price).toFixed(2)} {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}</strong>
                  </p>
                  <p className="text-muted-foreground">
                    Vous recevrez environ : <strong className="text-green-600">{(parseFloat(price) * (1 - PLATFORM_FEE_PERCENT / 100)).toFixed(2)} {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}</strong>
                    <span className="text-xs ml-1">(après frais de service de {PLATFORM_FEE_PERCENT}%)</span>
                  </p>
                  <div className="border-t pt-2 mt-2">
                    <p className="text-muted-foreground text-xs">
                      <AlertTriangle className="w-3 h-3 inline mr-1 text-amber-500" />
                      En cas de remboursement, le participant recevra environ <strong>{calculateRefundAmount(parseFloat(price)).toFixed(2)} {currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£'}</strong>
                      <span className="ml-1">(~{REFUND_FEE_PERCENT}% + {REFUND_FEE_FIXED.toFixed(2)}€ de frais bancaires déduits)</span>
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {(accessType === 'request_based' || accessType === 'invite_only' || accessType === 'paid') && (
        <div className="space-y-4">
          <div>
            <h4 className="text-sm font-medium mb-3">Informations de contact pour les participants</h4>
            <p className="text-xs text-muted-foreground mb-4">
              Ces informations seront visibles uniquement par les participants approuvés ou ayant payé
            </p>
          </div>

          {/* Champs de contact */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-lg">
            <div className="space-y-2">
              <Label htmlFor="contact_phone">Téléphone de contact</Label>
              <Input
                id="contact_phone"
                type="tel"
                value={contactPhone || ''}
                onChange={(e) => onContactPhoneChange?.(e.target.value)}
                placeholder="+33 6 12 34 56 78"
              />
              <p className="text-xs text-muted-foreground">
                Visible après accès validé
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="contact_email">Email de contact</Label>
              <Input
                id="contact_email"
                type="email"
                value={contactEmail || ''}
                onChange={(e) => onContactEmailChange?.(e.target.value)}
                placeholder="contact@example.com"
              />
              <p className="text-xs text-muted-foreground">
                Visible après accès validé
              </p>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="text-sm font-medium mb-3">Options de confidentialité</h4>
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
              <Label htmlFor="confidential_email">Email confidentiel</Label>
              <p className="text-xs text-muted-foreground">
                L'email de contact ne sera visible qu'après approbation
              </p>
            </div>
            <Switch
              id="confidential_email"
              checked={confidentialEmail}
              onCheckedChange={onConfidentialEmailChange}
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
