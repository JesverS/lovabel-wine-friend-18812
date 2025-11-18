import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";
import LessonPage from "./LessonPage";

interface LessonPaginationProps {
  pages: Array<{
    type: "hero" | "section";
    title?: string;
    duration?: string;
    level?: string;
    illustration?: string;
    icon?: "grapes" | "history" | "sparkles" | "wine-glass" | "book";
    content?: Array<{
      type: "text" | "subsection" | "highlight" | "list";
      value?: string;
      title?: string;
      items?: string[];
    }>;
  }>;
  onComplete: () => void;
  onPageChange?: (currentPage: number, totalPages: number) => void;
}

export default function LessonPagination({ pages, onComplete, onPageChange }: LessonPaginationProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = pages.length;

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [currentPage]);

  // Notify parent of page changes
  useEffect(() => {
    onPageChange?.(currentPage, totalPages);
  }, [currentPage, totalPages, onPageChange]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      // Reached the end, trigger completion (quiz)
      onComplete();
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <div>
      {/* Render current page */}
      <div className="mb-6 animate-fade-in">
        <LessonPage page={pages[currentPage - 1]} />
      </div>

      {/* Navigation buttons */}
      <div className="flex justify-between items-center mt-8">
        <Button
          variant="outline"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </Button>

        <span className="text-sm text-muted-foreground">
          Page {currentPage} / {totalPages}
        </span>

        <Button
          onClick={handleNextPage}
          className="gap-2"
        >
          {currentPage < totalPages ? "Suivant" : "Passer au quiz"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
