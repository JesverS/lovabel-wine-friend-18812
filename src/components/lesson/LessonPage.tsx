import HeroBlock from "./HeroBlock";
import SectionBlock from "./SectionBlock";

interface LessonPageProps {
  page: {
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
  };
}

export default function LessonPage({ page }: LessonPageProps) {
  switch (page.type) {
    case "hero":
      return <HeroBlock data={page} />;
    
    case "section":
      return <SectionBlock data={page} />;
    
    default:
      return null;
  }
}
