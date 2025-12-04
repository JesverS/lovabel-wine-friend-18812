import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UserPlus, Loader2 } from 'lucide-react';
import { z } from 'zod';

const inviteSchema = z.object({
  email: z.string().email('Email invalide'),
  role: z.enum(['admin', 'co_organizer', 'participant']),
});

interface InviteMemberToEventDialogProps {
  eventId: string;
  eventName: string;
  inviterName: string;
  userRole: 'organizer' | 'co_organizer' | 'admin' | 'participant';
  onInvitationSent?: () => void;
}

export function InviteMemberToEventDialog({ 
  eventId, 
  eventName, 
  inviterName, 
  userRole,
  onInvitationSent 
}: InviteMemberToEventDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'co_organizer' | 'participant'>('participant');
  const [loading, setLoading] = useState(false);

  // Admin et participant ne peuvent pas inviter
  if (userRole === 'admin' || userRole === 'participant') {
    return null;
  }

  // Organizer peut inviter co_organizer, admin, participant
  // Co_organizer peut inviter admin, participant
  const availableRoles = userRole === 'organizer' 
    ? [
        { value: 'participant', label: 'Participant', description: 'Peut participer à l\'événement sans droits d\'administration' },
        { value: 'admin', label: 'Administrateur', description: 'Peut gérer les vins et modifier l\'événement' },
        { value: 'co_organizer', label: 'Co-organisateur', description: 'Peut inviter des membres et gérer l\'événement' },
      ]
    : [
        { value: 'participant', label: 'Participant', description: 'Peut participer à l\'événement sans droits d\'administration' },
        { value: 'admin', label: 'Administrateur', description: 'Peut gérer les vins et modifier l\'événement' },
      ];

  const handleInvite = async () => {
    setLoading(true);
    try {
      const validated = inviteSchema.parse({ email: email.trim(), role });

      const { data, error } = await supabase.functions.invoke('send-event-invitation', {
        body: {
          event_id: eventId,
          invitee_email: validated.email,
          role: validated.role,
          event_name: eventName,
          inviter_name: inviterName,
        },
      });

      if (error) throw error;

      toast.success('Invitation envoyée par email !');
      setEmail('');
      setRole('participant');
      setOpen(false);
      onInvitationSent?.();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
      } else {
        console.error('Invitation error:', error);
        toast.error(error.message || 'Erreur lors de l\'envoi de l\'invitation');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="w-4 h-4 mr-2" />
          Inviter un membre
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Inviter un membre à l'événement</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="email">Adresse email</Label>
            <Input
              id="email"
              type="email"
              placeholder="exemple@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <p className="text-sm text-muted-foreground">
              La personne recevra un email d'invitation
            </p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="role">Rôle</Label>
            <Select value={role} onValueChange={(val) => setRole(val as 'admin' | 'co_organizer' | 'participant')}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((r) => (
                  <SelectItem key={r.value} value={r.value}>
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {availableRoles.find(r => r.value === role)?.description}
            </p>
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
            Annuler
          </Button>
          <Button onClick={handleInvite} disabled={loading || !email.trim()}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Envoyer l'invitation
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
