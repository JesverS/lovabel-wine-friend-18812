import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Check, X, UserCircle, Crown, Shield, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface DomainAdministrationProps {
  domainId: string;
  userRole: number;
}

export function DomainAdministration({ domainId, userRole }: DomainAdministrationProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [applications, setApplications] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // SÉCURITÉ RENFORCÉE :
  // Si le rôle n'est pas 1 (Propriétaire), 2 (Admin) ou 3 (Employé),
  // on arrête tout de suite. Le composant ne rend rien.
  if (!userRole || userRole < 1 || userRole > 3) {
    return null;
  }

  useEffect(() => {
    // Double sécurité : on ne lance le fetch que si le rôle est valide
    if (userRole >= 1 && userRole <= 3) {
      fetchData();
    }
  }, [domainId, userRole]);

  const fetchData = async () => {
    setLoading(true);

    try {
      // 1. Récupérer les membres (Accessible à tous les rôles valides : 1, 2, 3)
      const { data: membersData, error: membersError } = await supabase.functions.invoke("get-domain-members", {
        body: { domain_id: domainId },
      });

      if (membersError) throw membersError;

      const formattedMembers =
        membersData?.members?.map((member: any) => ({
          user_id: member.user_id,
          role: member.role,
          created_at: member.created_at,
          domain_id: member.domain_id,
          user_profiles_public: {
            full_name: member.profile.full_name,
            logo_adress: member.profile.logo_adress,
            slug: member.profile.slug,
          },
        })) || [];

      setMembers(formattedMembers);

      // 2. Récupérer les demandes (Accessible uniquement aux rôles 1 et 2)
      if (userRole < 3) {
        let query = supabase
          .from("user_domain_application")
          .select(
            `
          *,
          user_profiles_public (
            full_name,
            logo_adress
          )
        `,
          )
          .eq("domain_id", domainId) as any;

        // Logique de filtrage
        if (userRole === 2) {
          // Admin (2) ne voit que les demandes d'Employé (3)
          query = query.eq("role", 3);
        }
        // Propriétaire (1) voit tout

        const { data: apps } = await query;
        setApplications(apps || []);
      } else {
        // Rôle 3 : On s'assure que la liste est vide
        setApplications([]);
      }
    } catch (error: any) {
      console.error("Erreur lors du chargement des données:", error);
      toast.error("Erreur lors du chargement des données");
    }

    setLoading(false);
  };

  const handleApprove = async (application: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("approve-domain-application", {
        body: {
          application_user_id: application.user_id,
          domain_id: domainId,
        },
      });

      if (error) throw error;
      toast.success("Demande approuvée");
      fetchData();
    } catch (error: any) {
      toast.error("Erreur lors de l'approbation");
    }
  };

  const handleReject = async (application: any) => {
    try {
      const { data, error } = await supabase.functions.invoke("reject-domain-application", {
        body: {
          application_user_id: application.user_id,
          domain_id: domainId,
        },
      });

      if (error) throw error;
      toast.success("Demande rejetée");
      fetchData();
    } catch (error: any) {
      toast.error("Erreur lors du rejet");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke("remove-domain-member", {
        body: {
          member_user_id: userId,
          domain_id: domainId,
        },
      });

      if (error) throw error;
      toast.success("Membre retiré");
      fetchData();
    } catch (error: any) {
      toast.error("Erreur lors du retrait");
    }
  };

  const handleMemberClick = (slug: string | null) => {
    if (slug) {
      navigate(`/user/${slug}`);
    }
  };

  const getRoleLabel = (role: number) => {
    switch (role) {
      case 1:
        return "Propriétaire";
      case 2:
        return "Administrateur";
      case 3:
        return "Employé";
      default:
        return "Inconnu";
    }
  };

  const getRoleBadgeVariant = (role: number): "default" | "secondary" | "outline" => {
    switch (role) {
      case 1:
        return "default";
      case 2:
        return "secondary";
      case 3:
        return "outline";
      default:
        return "outline";
    }
  };

  const getRoleIcon = (role: number) => {
    switch (role) {
      case 1:
        return <Crown className="w-4 h-4" />;
      case 2:
        return <Shield className="w-4 h-4" />;
      case 3:
        return <Users className="w-4 h-4" />;
      default:
        return null;
    }
  };

  if (loading) {
    return <div className="text-center py-8">Chargement...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Affichage de la liste des membres.
         Visible pour les rôles 1, 2 ET 3 (grâce au guard clause au début, on est sûr d'être l'un des trois)
      */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Membres du domaine
            <Badge variant="outline" className="ml-2">
              {members.length} membre{members.length > 1 ? "s" : ""}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {members.length === 0 ? (
            <p className="text-center text-muted-foreground py-4">Aucun membre dans ce domaine</p>
          ) : (
            members.map((member) => (
              <div
                key={member.user_id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div
                  className="flex items-center gap-3 flex-1 cursor-pointer"
                  onClick={() => handleMemberClick(member.user_profiles_public?.slug)}
                >
                  <Avatar>
                    <AvatarImage src={member.user_profiles_public?.logo_adress || undefined} />
                    <AvatarFallback>
                      <UserCircle className="w-6 h-6" />
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold flex items-center gap-2 hover:underline">
                      {member.user_profiles_public?.full_name || "Utilisateur"}
                      {member.user_id === user?.id && (
                        <Badge variant="outline" className="text-xs">
                          Vous
                        </Badge>
                      )}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant={getRoleBadgeVariant(member.role)} className="flex items-center gap-1">
                        {getRoleIcon(member.role)}
                        {getRoleLabel(member.role)}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Le bouton "Retirer" n'est visible QUE pour le Propriétaire (1) */}
                {userRole === 1 && member.user_id !== user?.id && member.role !== 1 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="hover:bg-destructive hover:text-destructive-foreground ml-2"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveMember(member.user_id);
                    }}
                  >
                    Retirer
                  </Button>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Affichage des demandes.
         Strictement réservé aux rôles < 3 (donc 1 et 2).
         Le rôle 3 ne verra rien de ce bloc.
      */}
      {userRole < 3 && (
        <>
          {applications.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Demandes d'accès en attente
                  <Badge variant="destructive" className="ml-2">
                    {applications.length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.user_id}
                    className="flex items-center justify-between p-4 border rounded-lg bg-orange-50/50 dark:bg-orange-900/10 border-orange-200 dark:border-orange-800"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={app.user_profiles_public?.logo_adress || undefined} />
                        <AvatarFallback>
                          <UserCircle className="w-6 h-6" />
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold">{app.user_profiles_public?.full_name || "Utilisateur"}</p>
                        <p className="text-sm text-muted-foreground flex items-center gap-2">
                          Demande pour :
                          <Badge variant={getRoleBadgeVariant(app.role)} className="flex items-center gap-1">
                            {getRoleIcon(app.role)}
                            {getRoleLabel(app.role)}
                          </Badge>
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApprove(app)}>
                        <Check className="w-4 h-4 mr-1" />
                        Approuver
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleReject(app)}>
                        <X className="w-4 h-4 mr-1" />
                        Rejeter
                      </Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ) : (
            <Card className="border-dashed">
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">Aucune demande d'accès en attente</p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
