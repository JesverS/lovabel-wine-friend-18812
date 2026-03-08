import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Lock, ArrowLeft } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface Course {
  id: number;
  title: string;
  icon_emoji: string;
  is_available: boolean;
}

const CourseLocked = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: course } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", parseInt(id || "0"))
        .maybeSingle();

      if (error) throw error;
      return data as Course;
    },
  });

  // Si le cours est disponible, rediriger vers la page normale
  if (course && course.is_available) {
    navigate(`/course/${id}`);
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Header />
      <main className="flex-1 min-h-screen container mx-auto px-4 py-12 flex items-center justify-center">
        <Card className="max-w-2xl w-full shadow-xl border-2">
          <CardContent className="p-12 text-center space-y-6">
            {/* Émoji du cours */}
            {course?.icon_emoji && (
              <div className="text-8xl mb-4">{course.icon_emoji}</div>
            )}

            {/* Icône cadenas */}
            <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-muted/50">
              <Lock className="h-12 w-12 text-muted-foreground" />
            </div>

            {/* Titre */}
            {course?.title && (
              <h1 className="text-3xl font-bold text-foreground">
                {course.title}
              </h1>
            )}

            {/* Message */}
            <div className="space-y-2">
              <p className="text-xl font-semibold text-foreground">
                🔒 Ce cours n'est pas encore disponible.
              </p>
              <p className="text-muted-foreground">
                Revenez bientôt pour découvrir son contenu !
              </p>
            </div>

            {/* Bouton retour */}
            <Button
              onClick={() => navigate("/learning")}
              size="lg"
              className="mt-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux cours
            </Button>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
};

export default CourseLocked;
