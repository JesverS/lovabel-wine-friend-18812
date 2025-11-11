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
  role: z.enum(['admin', 'co_owner', 'owner']),
});

interface InviteMemberDialogProps {
  cellarId: string;
  cellarName: string;
  inviterName: string;
  onInvitationSent?: () => void;
}

export function InviteMemberDialog({ cellarId, cellarName, inviterName, onInvitationSent }: InviteMemberDialogProps) {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'admin' | 'co_owner' | 'owner'>('admin');
  const [loading, setLoading] = useState(false);

  const handleInvite = async () => {
    setLoading(true);
    try {
      const validated = inviteSchema.parse({ email: email.trim(), role });

      const { data, error } = await supabase.functions.invoke('send-cellar-invitation', {
        body: {
          cellar_id: cellarId,
          invitee_email: validated.email,
          role: validated.role,
          cellar_name: cellarName,
          inviter_name: inviterName,
        },
      });

      if (error) throw error;

      toast.success('Invitation envoyée par email !');
      setEmail('');
      setRole('admin');
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
          <DialogTitle>Inviter un membre à la cave</DialogTitle>
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
            <Select value={role} onValueChange={(val) => setRole(val as 'admin' | 'co_owner' | 'owner')}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Administrateur</SelectItem>
                <SelectItem value="co_owner">Copropriétaire</SelectItem>
                <SelectItem value="owner">Propriétaire</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {role === 'admin' 
                ? 'Peut gérer les vins et les stocks' 
                : role === 'co_owner'
                ? 'Peut tout gérer, sauf supprimer la cave'
                : 'Peut tout gérer, y compris supprimer la cave'}
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