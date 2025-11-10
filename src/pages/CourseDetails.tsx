import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, ArrowLeft, BookOpen } from "lucide-react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";

interface Course {
  id: number;
  title: string;
  icon_emoji: string;
  icon_url: string | null;
  keywords: string[] | null;
  lesson_count: number;
  is_available: boolean;
}

interface Lesson {
  id: number;
  course_id: number;
  lesson_number: number;
  title?: string | null;
  estimated_time?: string | null;
  pages: any;
  quizzes: any;
  created_at: string;
  updated_at: string;
}

const CourseDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

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
    queryKey: ["lessons", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", parseInt(id || "0"))
        .order("lesson_number", { ascending: true });

      if (error) throw error;
      return data as unknown as Lesson[];
    },
    enabled: !!course?.is_available,
  });

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
      <Header />
      <main className="flex-1 min-h-screen container mx-auto px-4 pt-32 pb-12">
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
              <div className="grid gap-4">
                {lessons.map((lesson) => (
                  <Card
                    key={lesson.id}
                    className="hover:shadow-lg transition-all duration-300 border-l-4 border-l-primary/50"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <CardTitle className="text-xl mb-2">
                            <span className="text-primary font-bold mr-2">
                              Leçon {lesson.lesson_number}
                            </span>
                            {lesson.title || `Leçon ${lesson.lesson_number}`}
                          </CardTitle>
                          {lesson.estimated_time && (
                            <CardDescription className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {lesson.estimated_time}
                            </CardDescription>
                          )}
                        </div>
                        <Button
                          onClick={() => navigate(`/course/${id}/lesson/${lesson.id}`)}
                          className="shrink-0"
                        >
                          Commencer
                        </Button>
                      </div>
                    </CardHeader>
                  </Card>
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
