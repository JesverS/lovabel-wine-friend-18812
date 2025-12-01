import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { UserPlus, Loader2 } from 'lucide-react';

interface EventAccessRequestDialogProps {
  eventId: string;
  eventName: string;
  hasExistingRequest?: boolean;
  onRequestSent?: () => void;
}

export function EventAccessRequestDialog({
  eventId,
  eventName,
  hasExistingRequest,
  onRequestSent,
}: EventAccessRequestDialogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        title: 'Non connecté',
        description: 'Vous devez être connecté pour faire une demande.',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase.functions.invoke('request-event-access', {
        body: {
          event_id: eventId,
          message: message || null,
        },
      });

      if (error) throw error;

      toast({
        title: 'Demande envoyée',
        description: 'Votre demande d\'accès a été envoyée aux organisateurs.',
      });

      setOpen(false);
      setMessage('');
      
      if (onRequestSent) {
        onRequestSent();
      }
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message || 'Une erreur est survenue lors de l\'envoi de la demande.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Button disabled>
        <UserPlus className="w-4 h-4 mr-2" />
        Connectez-vous pour demander l'accès
      </Button>
    );
  }

  if (hasExistingRequest) {
    return (
      <Button disabled variant="outline">
        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        Demande en attente
      </Button>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="w-4 h-4 mr-2" />
          Demander l'accès
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Demander l'accès à l'événement</DialogTitle>
          <DialogDescription>
            Vous souhaitez participer à "{eventName}". Votre demande sera examinée par les organisateurs.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="message">Message (optionnel)</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Présentez-vous ou expliquez pourquoi vous souhaitez participer..."
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Ce message sera visible par les organisateurs
            </p>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Envoi...
                </>
              ) : (
                'Envoyer la demande'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
