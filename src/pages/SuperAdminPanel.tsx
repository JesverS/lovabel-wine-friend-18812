import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Shield, UserCog, AlertTriangle } from 'lucide-react';
import { Header } from '@/components/Header';

interface UserProfile {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

const SuperAdminPanel = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [isAuthorized, setIsAuthorized] = useState(false);

  // Vérification de sécurité maximale
  useEffect(() => {
    const checkAuthorization = async () => {
      if (!user) {
        navigate('/auth');
        return;
      }

      try {
        // Vérification côté serveur avec fonction sécurisée
        const { data: isSuperAdmin, error } = await supabase.rpc('is_super_admin');

        if (error) throw error;

        if (!isSuperAdmin) {
          toast.error('Accès refusé : vous n\'êtes pas super administrateur');
          navigate('/');
          return;
        }

        setIsAuthorized(true);
        await loadUsers();
      } catch (error) {
        console.error('Erreur d\'autorisation:', error);
        toast.error('Erreur lors de la vérification des autorisations');
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    checkAuthorization();
  }, [user, navigate]);

  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id, full_name, role, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error: any) {
      console.error('Erreur lors du chargement des utilisateurs:', error);
      toast.error('Erreur lors du chargement des utilisateurs');
    }
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    if (userId === user?.id) {
      toast.error('Vous ne pouvez pas modifier votre propre rôle');
      return;
    }

    try {
      // Double vérification de sécurité côté serveur
      const { data: isSuperAdmin } = await supabase.rpc('is_super_admin');
      if (!isSuperAdmin) {
        toast.error('Accès refusé');
        return;
      }

      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) throw error;

      toast.success('Rôle mis à jour avec succès');
      await loadUsers();
    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du rôle:', error);
      toast.error('Erreur lors de la mise à jour du rôle');
    }
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'destructive';
      case 'admin':
        return 'default';
      default:
        return 'secondary';
    }
  };

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'Super Admin';
      case 'admin':
        return 'Admin';
      default:
        return 'Utilisateur';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto p-8 flex items-center justify-center">
          <div className="text-center">
            <Shield className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Vérification des autorisations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-destructive" />
            <h1 className="text-4xl font-bold">Panel Super Admin</h1>
          </div>
          <p className="text-muted-foreground">Gestion des utilisateurs et des rôles</p>
        </div>

        <Card className="mb-6 border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Zone de sécurité maximale
            </CardTitle>
            <CardDescription>
              Vous avez un accès complet à tous les utilisateurs et pouvez modifier leurs rôles.
              Utilisez ces privilèges avec précaution.
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="h-5 w-5" />
              Gestion des utilisateurs ({users.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nom</TableHead>
                    <TableHead>ID</TableHead>
                    <TableHead>Rôle actuel</TableHead>
                    <TableHead>Date de création</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((userProfile) => (
                    <TableRow key={userProfile.id}>
                      <TableCell className="font-medium">
                        {userProfile.full_name || 'Utilisateur sans nom'}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-muted-foreground">
                        {userProfile.id.slice(0, 8)}...
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(userProfile.role)}>
                          {getRoleLabel(userProfile.role)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {new Date(userProfile.created_at).toLocaleDateString('fr-FR')}
                      </TableCell>
                      <TableCell>
                        {userProfile.id !== user?.id ? (
                          <Select
                            value={userProfile.role}
                            onValueChange={(value) => updateUserRole(userProfile.id, value)}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="user">Utilisateur</SelectItem>
                              <SelectItem value="admin">Admin</SelectItem>
                              <SelectItem value="super_admin">Super Admin</SelectItem>
                            </SelectContent>
                          </Select>
                        ) : (
                          <Badge variant="outline">Vous</Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SuperAdminPanel;
