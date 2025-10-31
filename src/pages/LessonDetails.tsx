import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronLeft, ChevronRight, CheckCircle, XCircle } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  pages: Record<string, string>;
  quizzes: Record<string, {
    question: string;
    text?: string;
    answers: string[];
    correct_answer: string;
  }>;
}

const LessonDetails = () => {
  const { courseId, lessonId } = useParams();
  const navigate = useNavigate();
  const [currentPage, setCurrentPage] = useState(1);
  const [showQuiz, setShowQuiz] = useState(false);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string | null>>({});
  const [quizCompleted, setQuizCompleted] = useState(false);

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
    }
  });

  const { data: lesson, isLoading } = useQuery({
    queryKey: ["lesson", lessonId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .eq("id", parseInt(lessonId || "0"))
        .single();
      
      if (error) throw error;
      return data as unknown as Lesson;
    }
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
    enabled: !!lesson
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/5 to-background">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Chargement de la leçon...</p>
        </div>
      </div>
    );
  }

  if (!lesson || !course) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-lg mb-4">Leçon introuvable</p>
          <Button onClick={() => navigate("/learning")}>Retour aux cours</Button>
        </Card>
      </div>
    );
  }

  const pages = Object.values(lesson.pages);
  const totalPages = pages.length;
  const progressPercent = ((currentPage - 1) / totalPages) * 100;

  const quizzes = lesson.quizzes ? Object.entries(lesson.quizzes) : [];
  const totalQuizzes = quizzes.length;
  const answeredQuizzes = Object.values(quizAnswers).filter(a => a !== null).length;

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else if (!showQuiz && quizzes.length > 0) {
      setShowQuiz(true);
    }
  };

  const handlePrevPage = () => {
    if (showQuiz) {
      setShowQuiz(false);
      setCurrentPage(totalPages);
    } else if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const handleQuizAnswer = (quizKey: string, answer: string) => {
    const quiz = lesson.quizzes[quizKey];
    setQuizAnswers({ ...quizAnswers, [quizKey]: answer });

    if (answer === quiz.correct_answer) {
      toast.success("Bravo ! 🎉", {
        description: "Bonne réponse !"
      });
    } else {
      toast.error("Pas tout à fait...", {
        description: "Réessaye ou passe à la question suivante"
      });
    }
  };

  const handleCompleteQuiz = () => {
    const correctAnswers = quizzes.filter(([key, quiz]) => 
      quizAnswers[key] === quiz.correct_answer
    ).length;
    
    setQuizCompleted(true);
    toast.success(`Quiz terminé !`, {
      description: `Tu as obtenu ${correctAnswers}/${totalQuizzes} bonnes réponses`
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-secondary/5 to-background">
      {/* En-tête */}
      <div className="border-b bg-card/50 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/course/${courseId}`)}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Retour au cours
            </Button>
          </div>

          <div className="flex items-start gap-4 mb-4">
            <div className="text-4xl">{course.icon_emoji}</div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground mb-1">{course.title}</p>
              <h1 className="text-2xl font-bold mb-1 animate-fade-in">{lesson.title}</h1>
              <p className="text-sm text-muted-foreground">⏱️ {lesson.estimated_time}</p>
            </div>
          </div>

          {!quizCompleted && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  {showQuiz ? `Quiz: ${answeredQuizzes}/${totalQuizzes}` : `Page ${currentPage}/${totalPages}`}
                </span>
                <span>{Math.round(showQuiz ? (answeredQuizzes / totalQuizzes) * 100 : progressPercent)}%</span>
              </div>
              <Progress value={showQuiz ? (answeredQuizzes / totalQuizzes) * 100 : progressPercent} className="h-2" />
            </div>
          )}
        </div>
      </div>

      {/* Contenu */}
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        {!showQuiz && !quizCompleted && (
          <Card className="p-8 mb-6 animate-fade-in">
            <div className="prose prose-lg max-w-none dark:prose-invert">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {pages[currentPage - 1].replace(/\\n/g, '\n')}
              </ReactMarkdown>
            </div>
          </Card>
        )}

        {showQuiz && !quizCompleted && (
          <div className="space-y-6 animate-fade-in">
            <Card className="p-8 text-center bg-gradient-to-br from-primary/5 to-secondary/5">
              <h2 className="text-3xl font-bold mb-2">🧩 Mini Quiz</h2>
              <p className="text-muted-foreground">Teste tes connaissances sur cette leçon</p>
            </Card>

            {quizzes.map(([key, quiz], index) => (
              <Card key={key} className="p-6">
                <h3 className="text-xl font-semibold mb-4">
                  Question {index + 1}: {quiz.question}
                </h3>
                <div className="grid gap-3">
                  {quiz.answers.map((answer) => {
                    const isSelected = quizAnswers[key] === answer;
                    const isCorrect = answer === quiz.correct_answer;
                    const showFeedback = isSelected;
                    const isAnswered = quizAnswers[key] !== null && quizAnswers[key] !== undefined;

                    return (
                      <Button
                        key={answer}
                        variant={isSelected ? (isCorrect ? "default" : "destructive") : "outline"}
                        className={`justify-start text-left h-auto py-4 px-6 ${
                          showFeedback && isCorrect ? "bg-green-500 hover:bg-green-600" : ""
                        }`}
                        onClick={() => handleQuizAnswer(key, answer)}
                        disabled={isAnswered}
                      >
                        <span className="flex items-center gap-3 flex-1">
                          {showFeedback && (
                            isCorrect ? <CheckCircle className="w-5 h-5" /> : <XCircle className="w-5 h-5" />
                          )}
                          {answer}
                        </span>
                      </Button>
                    );
                  })}
                </div>
              </Card>
            ))}

            {answeredQuizzes === totalQuizzes && (
              <Button 
                onClick={handleCompleteQuiz}
                size="lg"
                className="w-full"
              >
                Terminer le quiz 🎉
              </Button>
            )}
          </div>
        )}

        {quizCompleted && (
          <Card className="p-12 text-center animate-fade-in bg-gradient-to-br from-primary/10 to-secondary/10">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-3xl font-bold mb-4">Bravo ! Tu as terminé la leçon</h2>
            <p className="text-lg text-muted-foreground mb-8">
              ✅ Tu maîtrises maintenant les concepts de cette leçon
            </p>

            {nextLesson ? (
              <div className="space-y-4">
                <p className="text-muted-foreground">👉 Continue avec la prochaine leçon pour en apprendre encore plus !</p>
                <Button 
                  onClick={() => navigate(`/course/${courseId}/lesson/${nextLesson.id}`)}
                  size="lg"
                  className="gap-2"
                >
                  Leçon suivante
                  <ChevronRight className="w-5 h-5" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-4xl mb-2">🥂</div>
                <p className="text-xl font-semibold mb-4">Félicitations ! Tu as terminé tout le cours !</p>
                <p className="text-muted-foreground mb-6">Découvre tes badges dans la section Compétences 🌟</p>
                <Button 
                  onClick={() => navigate(`/course/${courseId}`)}
                  size="lg"
                >
                  Retour au cours
                </Button>
              </div>
            )}
          </Card>
        )}

        {/* Navigation */}
        {!quizCompleted && (
          <div className="flex justify-between items-center mt-8">
            <Button
              variant="outline"
              onClick={handlePrevPage}
              disabled={currentPage === 1 && !showQuiz}
              className="gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Précédent
            </Button>

            <Button
              onClick={handleNextPage}
              disabled={showQuiz && answeredQuizzes < totalQuizzes}
              className="gap-2"
            >
              {currentPage < totalPages ? "Suivant" : showQuiz ? "Terminer" : "Passer au quiz"}
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonDetails;
