import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowLeft, BookOpen, Lock, CheckCircle, Unlock } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
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
  icon_url: string | null;
  keywords: string[] | null;
  lesson_count: number;
  is_available: boolean;
}

interface LessonWithStatus {
  lesson_id: number;
  course_id: number;
  lesson_number: number;
  title: string;
  estimated_time: string;
  global_order: number;
  is_unlocked: boolean;
  is_completed: boolean;
  unlocked_at: string | null;
  completed_at: string | null;
}

interface WeeklySlot {
  week_number: number;
  total_completions: number;
  available_unlocks: number;
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: course, isLoading: courseLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", parseInt(id || "0"))
        .single();

      if (error) throw error;
      return data as Course;
    },
  });

  const { data: lessons, isLoading: lessonsLoading } = useQuery({
    queryKey: ["lessons-with-status", id, user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase.rpc('get_user_accessible_lessons', {
        p_user_id: user.id
      });

      if (error) throw error;
      
      const courseLessons = (data as LessonWithStatus[]).filter(
        lesson => lesson.course_id === parseInt(id || "0")
      );
      
      return courseLessons;
    },
    enabled: !!course?.is_available && !!user,
  });

  const { data: weeklySlots, refetch: refetchWeeklySlots } = useQuery({
    queryKey: ["weekly-slots", user?.id],
    queryFn: async () => {
      if (!user) return [];
      
      const { data, error } = await supabase.rpc('get_weekly_lesson_slots', {
        p_user_id: user.id
      });

      if (error) throw error;
      return data as WeeklySlot[];
    },
    enabled: !!user,
  });

  const currentWeekSlots = weeklySlots?.[weeklySlots.length - 1];
  const availableUnlocks = currentWeekSlots?.available_unlocks || 0;

  const handleUnlockNextLesson = async () => {
    if (!user) {
      toast.error("Vous devez être connecté");
      return;
    }

    if (availableUnlocks <= 0) {
      toast.error("Plus de déverrouillages disponibles cette semaine");
      return;
    }

    try {
      const { data, error } = await supabase.rpc('unlock_next_lesson', {
        p_user_id: user.id
      });

      if (error) throw error;

      toast.success("Leçon déverrouillée avec succès !");
      refetchWeeklySlots();
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || "Erreur lors du déverrouillage");
    }
  };

  // Si le cours n'est pas disponible, rediriger vers la page verrouillée
  if (course && !course.is_available) {
    navigate(`/course/locked/${id}`);
    return null;
  }

  if (courseLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-32 pb-12">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
        <Header />
        <main className="flex-1 container mx-auto px-4 pt-32 pb-12">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Cours introuvable</h1>
            <Button onClick={() => navigate("/learning")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Retour aux cours
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-background to-muted/20">
      <Helmet>
        <title>{course.title} | Cours d'oenologie - Wine Note</title>
        <meta name="description" content={`Apprenez l'oenologie avec le cours ${course.title}. ${course.lesson_count} leçons interactives.`} />
        <meta property="og:title" content={`${course.title} - Wine Note`} />
        <meta property="og:description" content={`Cours d'oenologie : ${course.title}`} />
        <meta property="og:type" content="website" />
      </Helmet>

      <Header />
      <main className="flex-1 min-h-screen container mx-auto px-4 pt-32 pb-12">
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
              <BreadcrumbLink asChild>
                <Link to="/learning">Cours</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{course.title}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <Button
          variant="ghost"
          onClick={() => navigate("/learning")}
          className="mb-8"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Retour aux cours
        </Button>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* En-tête du cours */}
          <Card className="border-2 shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5 p-8">
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                <div className="text-6xl">{course.icon_emoji}</div>
                <div className="flex-1 space-y-4">
                  <div>
                    <h1 className="text-3xl md:text-4xl font-bold mb-2">{course.title}</h1>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <BookOpen className="h-4 w-4" />
                      <span>{course.lesson_count} leçons</span>
                    </div>
                  </div>
                  {course.keywords && course.keywords.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {course.keywords.map((keyword, index) => (
                        <Badge key={index} variant="secondary">
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                {course.icon_url && (
                  <img
                    src={course.icon_url}
                    alt={course.title}
                    className="w-32 h-32 object-cover rounded-lg shadow-md"
                  />
                )}
              </div>
            </div>
          </Card>

          {/* Liste des leçons */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Leçons du cours</h2>
            {lessonsLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-32 w-full" />
                ))}
              </div>
            ) : lessons && lessons.length > 0 ? (
              <div className="divide-y">
                {lessons.map((lesson) => (
                  <div
                    key={lesson.lesson_id}
                    className={`p-6 hover:bg-muted/50 transition-colors ${
                      !lesson.is_unlocked ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <Badge variant="outline" className="text-xs">
                            Leçon {lesson.lesson_number}
                          </Badge>
                          {lesson.is_completed && (
                            <Badge className="bg-green-500 text-white">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Complétée
                            </Badge>
                          )}
                          {!lesson.is_unlocked && (
                            <Badge variant="secondary">
                              <Lock className="h-3 w-3 mr-1" />
                              Verrouillée
                            </Badge>
                          )}
                        </div>
                        <h3 className="font-semibold text-lg mb-1">
                          {lesson.title}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Clock className="h-4 w-4" />
                          <span>{lesson.estimated_time}</span>
                        </div>
                      </div>
                      <Button
                        onClick={() => lesson.is_unlocked && navigate(`/course/${id}/lesson/${lesson.lesson_id}`)}
                        disabled={!lesson.is_unlocked}
                        variant={lesson.is_completed ? "outline" : "default"}
                      >
                        {lesson.is_completed ? "Revoir" : lesson.is_unlocked ? "Commencer" : "Verrouillée"}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-12 text-center text-muted-foreground">
                  Aucune leçon disponible pour le moment.
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default CourseDetails;
