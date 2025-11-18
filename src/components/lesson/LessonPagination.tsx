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

  // Scroll to top on page change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentPage]);

  // Notify parent component
  useEffect(() => {
    onPageChange?.(currentPage, totalPages);
  }, [currentPage, totalPages, onPageChange]);

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    } else {
      onComplete(); // go to quiz
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  return (
    <div className="space-y-10">
      {/* CURRENT PAGE */}
      <div className="animate-fade-in">
        <LessonPage page={pages[currentPage - 1]} />
      </div>

      {/* PREMIUM NAVIGATION BAR */}
      <div className="flex items-center justify-between bg-white shadow-lg border border-gray-200 rounded-3xl px-6 py-5">
        {/* PREVIOUS */}
        <Button
          variant="outline"
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="gap-2 px-6 py-5 rounded-xl text-gray-700 border-gray-300"
        >
          <ChevronLeft className="w-4 h-4" />
          Précédent
        </Button>

        {/* PAGE INDICATION */}
        <div className="flex flex-col items-center gap-2">
          <span className="text-sm font-medium text-gray-500">
            Page {currentPage} / {totalPages}
          </span>

          <div className="flex gap-2">
            {Array.from({ length: totalPages }).map((_, i) => (
              <div
                key={i}
                className={`transition-all rounded-full ${
                  i + 1 === currentPage
                    ? "w-6 h-2 bg-[#7A1F24]" // Bordeaux premium
                    : "w-2 h-2 bg-gray-300"
                }`}
              />
            ))}
          </div>
        </div>

        {/* NEXT */}
        <Button onClick={handleNextPage} className="gap-2 px-6 py-5 rounded-xl bg-[#7A1F24] hover:bg-[#66191E]">
          {currentPage < totalPages ? "Suivant" : "Passer au quiz"}
          <ChevronRight className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
