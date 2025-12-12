import { useState } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Loader2, UserPlus, Users } from "lucide-react";

interface EventJoinButtonProps {
  eventId: string;
  maxParticipants?: number | null;
  currentParticipants: number;
  onJoined?: () => void;
}

export function EventJoinButton({ 
  eventId, 
  maxParticipants, 
  currentParticipants,
  onJoined 
}: EventJoinButtonProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const remainingSpots = maxParticipants ? maxParticipants - currentParticipants : null;
  const isFull = remainingSpots !== null && remainingSpots <= 0;

  const handleJoin = async () => {
    if (!user) {
      navigate("/auth");
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("join_public_event", {
        p_event_id: eventId,
        p_user_id: user.id
      });

      if (error) {
        throw error;
      }

      // La fonction retourne un tableau avec un objet {success, error_message}
      const result = data?.[0];
      
      if (!result?.success) {
        throw new Error(result?.error_message || "Erreur lors de l'inscription");
      }

      toast.success("Inscription réussie !");
      onJoined?.();
    } catch (error: any) {
      console.error("Erreur lors de l'inscription:", error);
      toast.error(error.message || "Erreur lors de l'inscription");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        onClick={handleJoin}
        disabled={loading || isFull}
        className="w-full"
        size="lg"
      >
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Inscription en cours...
          </>
        ) : isFull ? (
          <>
            <Users className="mr-2 h-4 w-4" />
            Événement complet
          </>
        ) : (
          <>
            <UserPlus className="mr-2 h-4 w-4" />
            Je participe
          </>
        )}
      </Button>
      
      {remainingSpots !== null && !isFull && (
        <p className="text-sm text-muted-foreground text-center">
          {remainingSpots} place{remainingSpots > 1 ? "s" : ""} restante{remainingSpots > 1 ? "s" : ""}
        </p>
      )}
    </div>
  );
}
