import { useState, useMemo } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Award, Trophy, Sparkles, Lock } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useBadges } from "@/hooks/useBadges";
import { Helmet } from "react-helmet-async";
import {
  Breadcrumb,
  BreadcrumbList,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";

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
  const { user } = useAuth();
  const { getBadgesByCategory, isUnlocked, loading: badgesLoading } = useBadges();
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      // @ts-ignore - courses table exists in DB but types may not be regenerated yet
      const { data, error } = await supabase.from("courses").select("*").order("id", { ascending: true });

      if (error) throw error;
      return (data || []) as unknown as Course[];
    },
  }) as { data: Course[] | undefined; isLoading: boolean };

  const { data: userLessons } = useQuery({
    queryKey: ["user-lessons", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await (supabase.rpc as any)("get_user_accessible_lessons", {
        p_user_id: user.id,
      });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: userProfile } = useQuery({
    queryKey: ["user-profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("user_profiles").select("xp, level").eq("id", user.id).maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const courseAccessMap = useMemo(() => {
    if (!userLessons) return {};

    const map: Record<number, { hasAccess: boolean; unlockedCount: number; hasUncompletedLessons: boolean }> = {};

    userLessons.forEach((lesson: any) => {
      if (!map[lesson.course_id]) {
        map[lesson.course_id] = { hasAccess: false, unlockedCount: 0, hasUncompletedLessons: false };
      }
      if (lesson.is_unlocked) {
        map[lesson.course_id].hasAccess = true;
        map[lesson.course_id].unlockedCount++;

        if (!lesson.is_completed) {
          map[lesson.course_id].hasUncompletedLessons = true;
        }
      }
    });

    return map;
  }, [userLessons]);

  const userLevel = userProfile?.level ?? 1;
  const userXp = userProfile?.xp ?? 0;
  const xpNeeded = Math.round(60 * Math.pow(Math.max(userLevel, 1), 1.4));
  const progressToNextLevel = (userXp / xpNeeded) * 100;
  const userBadge = userLevel < 10 ? "Débutant" : "Intermédiaire";

  const totalLessons = courses?.reduce((sum, course) => sum + course.lesson_count, 0) || 0;
  const completedLessons = userLessons?.filter((l: any) => l.is_completed).length || 0;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Helmet>
        <title>Cours d'Œnologie | Apprenez le Vin - Wine Note</title>
        <meta name="description" content="Apprenez l'œnologie à votre rythme avec nos cours interactifs. Devenez expert en vin : cépages, terroirs, accords mets-vins et dégustation." />
        <link rel="canonical" href="https://winenote.me/learning" />
        <meta property="og:title" content="Cours d'Œnologie - Wine Note" />
        <meta property="og:description" content="Apprenez le vin avec des cours interactifs" />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://winenote.me/learning" />
        <meta property="og:image" content="https://storage.googleapis.com/gpt-engineer-file-uploads/1EK7H96ITKXD3CrC1aSkRhKBhvC2/social-images/social-1765190887528-icon.png" />
      </Helmet>

      <Header />

      <main className="container mx-auto px-4 py-8 pt-32 flex-grow min-h-screen">
        {/* Breadcrumb */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link to="/">Accueil</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Cours</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        {/* Header Section */}
        <div className="mb-12 animate-fade-up">
          <div className="flex items-center justify-between mb-6">
            <div>
            <h1 className="font-serif text-4xl md:text-5xl font-bold mb-2">
              Votre <span className="text-gradient-wine">Parcours Œnologique</span>
            </h1>
            <p className="text-lg text-muted-foreground">Apprenez à votre rythme et devenez expert en vin</p>
            
            {!user && (
              <div className="mt-4 p-4 bg-primary/10 rounded-lg border border-primary/20 inline-block">
                <p className="text-sm text-muted-foreground">
                  <Link to="/auth" className="text-primary font-medium hover:underline">
                    Connectez-vous
                  </Link>{" "}
                  pour accéder aux cours et suivre votre progression
                </p>
              </div>
            )}
            </div>

            <div className="hidden md:flex items-center gap-6">
              <div className="text-center">
                <BookOpen className="h-8 w-8 text-secondary mx-auto mb-1" />
                <div className="font-semibold text-xl">{completedLessons}</div>
                <div className="text-xs text-muted-foreground">Leçons</div>
              </div>
              <div className="text-center">
                <Trophy className="h-8 w-8 text-secondary mx-auto mb-1" />
                <div className="font-semibold text-xl">Niveau {userLevel}</div>
                <div className="text-xs text-muted-foreground">{userBadge}</div>
              </div>
            </div>
          </div>

          {/* Progress Bar */}
          <Card className="glass-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">
                  Progression vers le niveau {userLevel + 1}
                </span>
                <span className="text-sm text-muted-foreground">
                  {userXp} / {xpNeeded} XP
                </span>
              </div>
              <Progress value={progressToNextLevel} className="h-3" />
            </CardContent>
          </Card>
        </div>

        {/* Themes Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {isLoading ? (
            <div className="col-span-3 text-center py-12">
              <p className="text-muted-foreground">Chargement des cours...</p>
            </div>
          ) : (
            courses?.map((course, index) => {
              const keywords = Array.isArray(course.keywords) ? course.keywords.join(", ") : "";
              const hasAccess = user ? courseAccessMap[course.id]?.hasAccess || false : false;
              const unlockedLessons = courseAccessMap[course.id]?.unlockedCount || 0;
              const hasUncompletedLessons = courseAccessMap[course.id]?.hasUncompletedLessons || false;

              return (
                <Card
                  key={course.id}
                  className={`group relative overflow-hidden border-2 transition-all duration-300 animate-fade-up ${
                    !hasAccess && user
                      ? "opacity-60 cursor-not-allowed"
                      : "hover:border-primary hover-lift cursor-pointer"
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
                      {!hasAccess && user && <Lock className="h-5 w-5 text-muted-foreground" />}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <BookOpen className="h-4 w-4" />
                        <span>{course.lesson_count} leçons</span>
                      </div>
                      {hasAccess && user && (
                        <span className="text-xs text-muted-foreground">
                          {unlockedLessons} disponible{unlockedLessons > 1 ? "s" : ""}
                        </span>
                      )}
                    </div>

                    <Button
                      className={`w-full ${
                        !hasAccess && user ? "bg-muted text-muted-foreground" : "bg-gradient-wine hover:opacity-90"
                      }`}
                      disabled={!hasAccess && !!user}
                      onClick={() => {
                        if (!user) {
                          navigate("/auth");
                        } else if (hasAccess) {
                          navigate(`/course/${course.id}`);
                        }
                      }}
                    >
                      {!user ? "Se connecter" : !hasAccess ? "Bientôt disponible" : "Commencer"}
                    </Button>
                  </CardContent>

                  {hasAccess && hasUncompletedLessons && (
                    <div className="absolute top-4 right-4">
                      <Badge className="badge-wine">Nouveau</Badge>
                    </div>
                  )}
                </Card>
              );
            })
          )}
        </div>

        {/* Achievements Section */}
        <Card className="mt-12 glass-card animate-fade-up">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-6 w-6 text-secondary" />
                  Vos Badges & Récompenses
                </CardTitle>
                <CardDescription>Débloquez des badges en progressant dans votre apprentissage</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link to="/badges">Voir tous</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {badgesLoading ? (
                [...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="flex flex-col items-center justify-center p-4 rounded-lg bg-muted/50 animate-pulse h-24"
                  />
                ))
              ) : (
                getBadgesByCategory('learning').slice(0, 4).map((badge) => {
                  const unlocked = isUnlocked(badge.id);
                  return (
                    <div
                      key={badge.id}
                      className={`flex flex-col items-center justify-center p-4 rounded-lg ${
                        unlocked 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'bg-muted/50 opacity-50'
                      }`}
                    >
                      <span className="text-2xl mb-2">{badge.icon}</span>
                      <span className="text-xs text-center font-medium">
                        {badge.name}
                      </span>
                      {!unlocked && (
                        <Lock className="h-3 w-3 text-muted-foreground mt-1" />
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <Footer />
    </div>
  );
}
