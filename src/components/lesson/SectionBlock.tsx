import TextBlock from "./TextBlock";
import SubsectionBlock from "./SubsectionBlock";
import HighlightBlock from "./HighlightBlock";
import ListBlock from "./ListBlock";

interface SectionBlockProps {
  data: {
    type?: "hero" | "section";
    title?: string;
    icon?: "grapes" | "history" | "sparkles" | "wine-glass" | "book";
    content?: Array<{
      type: "text" | "subsection" | "highlight" | "list";
      value?: string;
      title?: string;
      items?: string[];
    }>;
  };
}

export default function SectionBlock({ data }: SectionBlockProps) {
  const iconMap: Record<string, string> = {
    grapes: "🍇",
    history: "📜",
    sparkles: "✨",
    "wine-glass": "🍷",
    book: "📘"
  };

  const icon = data.icon ? iconMap[data.icon] || "📘" : "📘";

  return (
    <div className="bg-card shadow-sm rounded-xl p-6 space-y-6">
      {/* Titre + icône */}
      {data.title && (
        <div className="flex items-center gap-3">
          <span className="text-3xl">{icon}</span>
          <h2 className="text-xl font-bold text-foreground">{data.title}</h2>
        </div>
      )}

      {/* Contenu dynamique */}
      {data.content && data.content.length > 0 && (
        <div className="space-y-3">
          {data.content.map((block, i) => {
            switch (block.type) {
              case "text":
                return block.value ? <TextBlock key={i} value={block.value} /> : null;

              case "subsection":
                return block.title && block.items ? (
                  <SubsectionBlock key={i} title={block.title} items={block.items} />
                ) : null;

              case "highlight":
                return block.value ? <HighlightBlock key={i} value={block.value} /> : null;

              case "list":
                return block.items ? <ListBlock key={i} items={block.items} /> : null;

              default:
                return null;
            }
          })}
        </div>
      )}
    </div>
  );
}
