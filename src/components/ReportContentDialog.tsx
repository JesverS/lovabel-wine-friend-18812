import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { Loader2, Flag } from 'lucide-react';

interface ReportContentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  postId?: string;
  commentId?: string;
}

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam', description: 'Contenu publicitaire ou répétitif non sollicité' },
  { value: 'harassment', label: 'Harcèlement', description: 'Intimidation, menaces ou comportement abusif' },
  { value: 'inappropriate_content', label: 'Contenu inapproprié', description: 'Contenu offensant, violent ou sexuellement explicite' },
  { value: 'misinformation', label: 'Désinformation', description: 'Informations fausses ou trompeuses' },
  { value: 'copyright', label: 'Violation de droits d\'auteur', description: 'Utilisation non autorisée de contenu protégé' },
  { value: 'other', label: 'Autre', description: 'Autre raison non listée ci-dessus' },
] as const;

export function ReportContentDialog({ open, onOpenChange, postId, commentId }: ReportContentDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!user || !reason) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('content_report' as any)
        .insert({
          reporter_id: user.id,
          post_id: postId || null,
          comment_id: commentId || null,
          reason,
          description: description.trim() || null,
        });

      if (error) throw error;

      toast({
        title: 'Signalement envoyé',
        description: 'Merci pour votre signalement. Notre équipe examinera ce contenu.',
      });
      
      onOpenChange(false);
      setReason('');
      setDescription('');
    } catch (error: any) {
      console.error('Error reporting content:', error);
      toast({
        variant: 'destructive',
        title: 'Erreur',
        description: error.message || 'Impossible d\'envoyer le signalement',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Flag className="h-5 w-5 text-destructive" />
            Signaler ce contenu
          </DialogTitle>
          <DialogDescription>
            Aidez-nous à garder la communauté saine en signalant les contenus problématiques.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <RadioGroup value={reason} onValueChange={setReason}>
            {REPORT_REASONS.map((r) => (
              <div key={r.value} className="flex items-start space-x-3 space-y-0">
                <RadioGroupItem value={r.value} id={r.value} className="mt-1" />
                <div className="space-y-0.5">
                  <Label htmlFor={r.value} className="font-medium cursor-pointer">
                    {r.label}
                  </Label>
                  <p className="text-xs text-muted-foreground">{r.description}</p>
                </div>
              </div>
            ))}
          </RadioGroup>

          <div className="space-y-2">
            <Label htmlFor="description">Détails supplémentaires (optionnel)</Label>
            <Textarea
              id="description"
              placeholder="Décrivez le problème en détail..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="resize-none"
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Annuler
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!reason || loading}
            variant="destructive"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Envoi...
              </>
            ) : (
              'Envoyer le signalement'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
