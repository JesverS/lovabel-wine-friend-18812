import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import LessonPagination from "@/components/lesson/LessonPagination";
import QuizPagination from "@/components/lesson/QuizPagination";
import confetti from "canvas-confetti";
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
}

interface Lesson {
  id: number;
  course_id: number;
  lesson_number: number;
  title: string;
  estimated_time: string;
  global_order: number;
  baner_url?: string;
  pages: Array<{
    type: "hero" | "section";
    title?: string;
    duration?: string;
    level?: string;
    illustration?: string;
    banner_url?: string;
    icon?: "grapes" | "history" | "sparkles" | "wine-glass" | "book";
    content?: Array<{
      type: "text" | "subsection" | "highlight" | "list";
      value?: string;
      title?: string;
      items?: string[];
    }>;
  }>;
  quizzes: Record<
    string,
    {
      question: string;
      text?: string;
      answers: string[];
      correct_answer: string;
    }
  >;
}

interface LessonAccess {
  is_unlocked: boolean;
  is_completed: boolean;
}

const LessonDetails = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [pageInfo, setPageInfo] = useState({ currentPage: 1, totalPages: 0 });
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | null>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);

  // Scroll top when quiz or completion changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [showQuiz, quizCompleted]);

  // ─────────────────────────────────────
  // QUERIES SUPABASE (inchangées)
  // ─────────────────────────────────────

  const { data: course } = useQuery({
    queryKey: ["course", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", parseInt(courseId || "0"))
        .single();

      if (error) throw error;
      return data as Course;
    },
  });

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*, baner_url")
        .eq("id", parseInt(lessonId || "0"))
        .single();

      if (error) throw error;
      return data as unknown as Lesson;
    },
  });

  const { data: lessonAccess } = useQuery({
    queryKey: ["lesson-access", lessonId, user?.id],
    queryFn: async () => {
      if (!user || !lessonId) return { is_unlocked: false, is_completed: false };

      const { data, error } = await supabase.rpc("get_user_accessible_lessons", {
        p_user_id: user.id,
      });

      if (error) throw error;

      const currentLesson = (data as any[]).find((l) => l.lesson_id === parseInt(lessonId));
      return {
        is_unlocked: currentLesson?.is_unlocked || false,
        is_completed: currentLesson?.is_completed || false,
      } as LessonAccess;
    },
    enabled: !!user && !!lessonId,
  });

  const { data: nextLesson } = useQuery({
    queryKey: ["nextLesson", courseId, lesson?.lesson_number],
    queryFn: async () => {
      if (!lesson) return null;
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("course_id", parseInt(courseId || "0"))
        .eq("lesson_number", lesson.lesson_number + 1)
        .single();

      if (error) return null;
      return data as unknown as Lesson;
    },
    enabled: !!lesson,
  });

  const submitQuizMutation = useMutation({
    mutationFn: async ({
      answers,
      score,
      maxScore,
    }: {
      answers: Record<string, string | null>;
      score: number;
      maxScore: number;
    }) => {
      if (!user || !lessonId) throw new Error("User or lesson not found");

      const { data, error } = await supabase.functions.invoke("upload-lesson-quiz", {
        body: {
          lesson_id: parseInt(lessonId),
          answers: answers,
          score: score,
          max_score: maxScore,
        },
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["lesson-access", lessonId, user?.id],
      });
      queryClient.invalidateQueries({ queryKey: ["lessons-with-status"] });
      queryClient.invalidateQueries({ queryKey: ["weekly-slots", user?.id] });

      if (data.xpEarned === 0) {
        const percentage = ((data.score || 0) / (data.max_score || 1)) * 100;
        toast.success(`✅ Quiz complété ! Score: ${percentage.toFixed(0)}% (0 XP - déjà complété)`);
      } else if (data.leveledUp) {
        toast.success(`🎉 Félicitations ! Vous êtes passé au niveau ${data.newLevel} ! +${data.xpEarned} XP`);
      } else {
        const percentage = ((data.score || 0) / (data.max_score || 1)) * 100;
        if (percentage >= 80) {
          toast.success(`✅ Quiz complété avec succès ! +${data.xpEarned} XP`);
        } else {
          toast.success(`Quiz complété ! +${data.xpEarned} XP (Score: ${percentage.toFixed(0)}%)`);
        }
      }

      setQuizCompleted(true);
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la soumission du quiz");
    },
  });

  // Redirect if lesson is locked
  useEffect(() => {
    if (lessonAccess && !lessonAccess.is_unlocked) {
      toast.error("Cette leçon est verrouillée");
      navigate(`/course/${courseId}`);
    }
  }, [lessonAccess, navigate, courseId]);

  // ─────────────────────────────────────
  // LOADING & ERREURS
  // ─────────────────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#7A1F24] mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement de la leçon...</p>
        </div>
      </div>
    );
  }

  if (!lesson || !course || !lessonAccess?.is_unlocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAF7F1]">
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">Leçon introuvable ou verrouillée</p>
          <Button onClick={() => navigate(`/course/${courseId}`)}>Retour au cours</Button>
        </Card>
      </div>
    );
  }

  // ─────────────────────────────────────
  // PAGES + QUIZ (logique inchangée)
  // ─────────────────────────────────────

  const pages = Array.isArray(lesson.pages) ? lesson.pages : (lesson.pages as any).pages || Object.values(lesson.pages);

  // Ajouter banner_url à la première page hero
  if (pages.length > 0 && pages[0].type === "hero" && lesson.baner_url) {
    pages[0] = { ...pages[0], banner_url: lesson.baner_url };
  }

  const totalPages = pages.length;
  const progressPercent = totalPages > 1 ? ((pageInfo.currentPage - 1) / totalPages) * 100 : 0;

  const quizzes = lesson.quizzes ? Object.entries(lesson.quizzes) : [];
  const totalQuizzes = quizzes.length;
  const answeredQuizzes = Object.values(quizAnswers).filter((a) => a !== null).length;

  const handleQuizAnswer = (quizKey: string, answer: string) => {
    const quiz = lesson.quizzes[quizKey];
    setQuizAnswers({ ...quizAnswers, [quizKey]: answer });

    if (answer === quiz.correct_answer) {
      toast.success("Bravo ! 🎉", {
        description: "Bonne réponse !",
      });
    } else {
      toast.error("Pas tout à fait...", {
        description: "Réessaye ou passe à la question suivante",
      });
    }
  };

  const handleCompleteQuiz = (finalAnswers?: Record<string, string | null>) => {
    const answersToUse = finalAnswers || quizAnswers;
    const correctAnswers = quizzes.filter(([key, quiz]) => {
      // @ts-ignore
      return answersToUse[key] === quiz.correct_answer;
    }).length;

    if (lessonAccess?.is_completed) {
      const percentage = (correctAnswers / totalQuizzes) * 100;
      toast.success(`✅ Quiz complété ! Score: ${percentage.toFixed(0)}% (0 XP - déjà complété)`);
      setQuizCompleted(true);
      queryClient.invalidateQueries({
        queryKey: ["lesson-access", lessonId, user?.id],
      });
      return;
    }

    submitQuizMutation.mutate({
      answers: answersToUse,
      score: correctAnswers,
      maxScore: totalQuizzes,
    });
  };

  // ─────────────────────────────────────
  // RENDER UI PREMIUM
  // ─────────────────────────────────────

  const showHeaderProgress = !quizCompleted && !showQuiz;
  const headerProgressValue = showQuiz
    ? totalQuizzes > 0
      ? (answeredQuizzes / totalQuizzes) * 100
      : 0
    : progressPercent;

  return (
    <div className="min-h-screen bg-[#FAF7F1]">
      <Helmet>
        <title>{lesson.title} | Leçon - Wine Note</title>
        <meta
          name="description"
          content={`Leçon ${lesson.lesson_number} : ${lesson.title}. Durée estimée : ${lesson.estimated_time}.`}
        />
        <link rel="canonical" href={`https://winenote.me/course/${courseId}/lesson/${lessonId}`} />
        <meta property="og:title" content={`${lesson.title} - Wine Note`} />
        <meta property="og:description" content={`Leçon d'oenologie : ${lesson.title}`} />
        <meta property="og:url" content={`https://winenote.me/course/${courseId}/lesson/${lessonId}`} />
        <meta property="og:type" content="article" />
      </Helmet>

      {/* HEADER PREMIUM (Version A) */}
      <header className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/course/${courseId}`)} className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Retour
          </Button>

          <div className="flex items-center gap-3">
            <span className="text-3xl">{course.icon_emoji}</span>
            <div>
              <p className="text-xs uppercase tracking-wide text-gray-400">{course.title}</p>
              <h1 className="text-sm sm:text-base font-semibold text-gray-900">
                {lesson.title} · ⏱ {lesson.estimated_time}
              </h1>
            </div>
          </div>

          <div className="flex-1" />

          {showHeaderProgress && (
            <div className="w-40 hidden sm:block">
              <Progress value={headerProgressValue} />
              <p className="mt-1 text-[11px] text-right text-gray-500">
                {showQuiz
                  ? `Quiz : ${answeredQuizzes}/${totalQuizzes}`
                  : `Page ${pageInfo.currentPage}/${pageInfo.totalPages || totalPages}`}
              </p>
            </div>
          )}
        </div>

        {/* Breadcrumb sous le header */}
        <div className="max-w-5xl mx-auto px-4 py-2 border-t border-gray-100">
          <Breadcrumb>
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
                <BreadcrumbLink asChild>
                  <Link to={`/course/${courseId}`}>{course.title}</Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>{lesson.title}</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      {/* Mobile Progress Bar */}
      {showHeaderProgress && (
        <div className="sm:hidden px-4 py-3 bg-white border-b border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-600">
              {showQuiz ? "Progression du quiz" : "Progression de la leçon"}
            </span>
            <span className="text-xs text-gray-500">
              {showQuiz
                ? `${answeredQuizzes}/${totalQuizzes}`
                : `${pageInfo.currentPage}/${pageInfo.totalPages || totalPages}`}
            </span>
          </div>
          <Progress value={headerProgressValue} className="h-2" />
        </div>
      )}

      {/* CONTENU */}
      <main className="max-w-4xl mx-auto px-4 py-10 space-y-10">
        {/* Pages de cours */}
        {!showQuiz && !quizCompleted && (
          <LessonPagination
            pages={pages}
            onComplete={() => setShowQuiz(true)}
            onPageChange={(current, total) => setPageInfo({ currentPage: current, totalPages: total })}
          />
        )}

        {/* Quiz */}
        {showQuiz && !quizCompleted && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-6 sm:p-8 text-center bg-gradient-to-br from-rose-50 to-pink-50 border-2 border-rose-200 rounded-3xl shadow-lg">
              <div className="text-4xl sm:text-5xl mb-3">🧩</div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-gray-900">Mini Quiz</h2>
              <p className="text-sm sm:text-base text-gray-600">Teste tes connaissances sur cette leçon</p>

              {lessonAccess?.is_completed && (
                <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
                  <p className="text-xs sm:text-sm text-blue-700">
                    ℹ️ Quiz déjà complété. Cette tentative ne rapporte pas d&apos;XP.
                  </p>
                </div>
              )}
            </Card>

            <QuizPagination
              quizzes={quizzes}
              onComplete={(finalAnswers) => {
                setQuizAnswers(finalAnswers);
                handleCompleteQuiz(finalAnswers);
              }}
              isCompleted={lessonAccess?.is_completed}
            />
          </div>
        )}

        {/* Écran de fin */}
        {quizCompleted && (
          <Card className="p-12 text-center animate-fade-in bg-gradient-to-br from-[#FDF2E9] to-[#FDEBF3] border border-[#F3D3B8] rounded-3xl">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Bravo ! Tu as terminé la leçon</h2>
            <p className="text-lg text-gray-600 mb-8">✅ Tu maîtrises maintenant les concepts de cette leçon.</p>

            {nextLesson ? (
              <div className="space-y-4">
                <p className="text-gray-600">👉 Continue avec la prochaine leçon pour en apprendre encore plus !</p>
                <Button
                  onClick={() => navigate(`/course/${courseId}/lesson/${nextLesson.id}`)}
                  size="lg"
                  className="gap-2 rounded-xl bg-[#7A1F24] hover:bg-[#66191E]"
                >
                  Leçon suivante
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl mb-2">🥂</div>
                <p className="text-xl font-semibold mb-4">Félicitations ! Tu as terminé tout le cours !</p>
                <p className="text-gray-600 mb-6">Découvre tes badges dans la section Compétences 🌟</p>
                <Button onClick={() => navigate(`/course/${courseId}`)} size="lg" className="rounded-xl">
                  Retour au cours
                </Button>
              </div>
            )}
          </Card>
        )}
      </main>
    </div>
  );
};

export default LessonDetails;
