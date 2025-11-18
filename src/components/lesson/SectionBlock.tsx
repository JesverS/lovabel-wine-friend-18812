import TextBlock from "./TextBlock";
import SubsectionBlock from "./SubsectionBlock";
import HighlightBlock from "./HighlightBlock";
import ListBlock from "./ListBlock";

interface SectionBlockProps {
  data: {
    title?: string;
    icon?: string;
    content?: any[];
  };
}

export default function SectionBlock({ data }: SectionBlockProps) {
  const iconMap: Record<string, string> = {
    grapes: "🍇",
    history: "📜",
    sparkles: "✨",
    "wine-glass": "🍷",
    book: "📘",
  };

  const icon = data.icon ? iconMap[data.icon] || "📘" : "📘";

  return (
    <div className="bg-white shadow-md rounded-3xl p-8 border border-gray-200 space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-4">
        <span className="text-4xl">{icon}</span>
        <h2 className="text-2xl font-serif font-bold text-gray-900">{data.title}</h2>
      </div>

      <div className="space-y-5">
        {data.content?.map((block, i) => {
          switch (block.type) {
            case "text":
              return <TextBlock key={i} value={block.value!} />;

            case "subsection":
              return <SubsectionBlock key={i} title={block.title!} items={block.items!} />;

            case "highlight":
              return <HighlightBlock key={i} value={block.value!} />;

            case "list":
              return <ListBlock key={i} items={block.items!} />;

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
