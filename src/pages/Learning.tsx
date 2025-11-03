import { useState } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, Trophy, Sparkles, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";

interface Course {
  id: number;
  title: string;
  icon_emoji: string;
  keywords: string[];
  lesson_count: number;
  is_available: boolean;
  created_at: string;
  updated_at: string;
  icon_url: string | null;
}

export default function Learning() {
  const navigate = useNavigate();
  const [userPoints] = useState(0);
  const [userLevel] = useState(1);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['courses'],
    queryFn: async () => {
      // @ts-ignore - courses table exists in DB but types may not be regenerated yet
      const { data, error } = await supabase.from('courses').select('*').order('is_available', { ascending: false }).order('id', { ascending: true });
      
      if (error) throw error;
      return (data || []) as unknown as Course[];
    }
  }) as { data: Course[] | undefined; isLoading: boolean };

  // Identifier les 2 cours les plus récents disponibles (IDs les plus élevés parmi les disponibles)
  const maxIds = courses ? 
    [...courses]
      .filter(c => c.is_available)
      .sort((a, b) => b.id - a.id)
      .slice(0, 2)
      .map(c => c.id) : [];

  const totalLessons = courses?.reduce((sum, course) => sum + course.lesson_count, 0) || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="container mx-auto px-4 py-8 pt-32 flex-grow">
        {/* Header Section */}
        <div className="mb-12 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
                Votre <span className="text-gradient-wine">Parcours Œnologique</span>
              </h1>
              <p className="text-lg text-muted-foreground">
                Apprenez à votre rythme et devenez expert en vin
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <Trophy className="h-8 w-8 text-secondary mx-auto mb-1" />
                <div className="font-semibold text-xl">{userPoints}</div>
                <div className="text-xs text-muted-foreground">Points</div>
              </div>
              <div className="text-center">
                <Sparkles className="h-8 w-8 text-primary mx-auto mb-1" />
                <div className="font-semibold text-xl">Niveau {userLevel}</div>
                <div className="text-xs text-muted-foreground">Débutant</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Progression globale</span>
                <span className="text-sm text-muted-foreground">0 / {totalLessons} leçons</span>
              </div>
              <Progress value={0} className="h-3" />
            </CardContent>
          </Card>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-muted-foreground">Chargement des cours...</p>
            </div>
          ) : courses?.map((course, index) => {
            const isNew = maxIds.includes(course.id);
            const keywords = Array.isArray(course.keywords) ? course.keywords.join(', ') : '';
            
            return (
              <Card 
                key={course.id}
                className={`group relative overflow-hidden border-2 transition-all duration-300 animate-fade-up ${
                  !course.is_available 
                    ? 'opacity-60 cursor-not-allowed' 
                    : 'hover:border-primary hover-lift cursor-pointer'
                }`}
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="text-4xl">{course.icon_emoji}</div>
                      <div>
                        <CardTitle className="text-xl">{course.title}</CardTitle>
                        <CardDescription className="mt-1">{keywords}</CardDescription>
                      </div>
                    </div>
                    {!course.is_available && (
                      <Lock className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    <span>{course.lesson_count} leçons</span>
                  </div>

                  <Button 
                    className={`w-full ${
                      !course.is_available 
                        ? 'bg-muted text-muted-foreground' 
                        : 'bg-gradient-wine hover:opacity-90'
                    }`}
                    disabled={!course.is_available}
                    onClick={() => {
                      if (course.is_available) {
                        navigate(`/course/${course.id}`);
                      }
                    }}
                  >
                    {!course.is_available ? 'Bientôt disponible' : 'Commencer'}
                  </Button>
                </CardContent>

                {course.is_available && isNew && (
                  <div className="absolute top-4 right-4">
                    <Badge className="badge-wine">Nouveau</Badge>
                  </div>
                )}
              </Card>
            );
          })}
        </div>

        {/* Achievements Section */}
        <Card className="mt-12 glass-card animate-fade-up">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Award className="h-6 w-6 text-secondary" />
              Vos Badges & Récompenses
            </CardTitle>
            <CardDescription>
              Débloquez des badges en progressant dans votre apprentissage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div 
                  key={i}
                  className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 opacity-40"
                >
                  <Lock className="h-8 w-8 text-muted-foreground mb-2" />
                  <span className="text-xs text-muted-foreground text-center">
                    Badge verrouillé
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
