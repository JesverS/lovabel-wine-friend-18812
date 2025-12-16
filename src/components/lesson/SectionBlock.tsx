import TextBlock from "./TextBlock";
import SubsectionBlock from "./SubsectionBlock";
import HighlightBlock from "./HighlightBlock";
import ListBlock from "./ListBlock";
import TrueFalseGameBlock from "./TrueFalseGameBlock";
import MapGameBlock from "./MapGameBlock";

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
    <div className="bg-white shadow-md rounded-3xl p-4 sm:p-6 lg:p-8 border border-gray-200 space-y-6">
      {/* Titre */}
      <div className="flex items-center gap-2 sm:gap-4">
        <span className="text-3xl sm:text-4xl">{icon}</span>
        <h2 className="text-xl sm:text-2xl font-serif font-bold text-gray-900">{data.title}</h2>
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

            case "true_false_game":
              return (
                <TrueFalseGameBlock
                  key={i}
                  title={block.title}
                  description={block.description}
                  questions={block.questions}
                />
              );

            case "map_game":
              return (
                <MapGameBlock
                  key={i}
                  title={block.title}
                  instruction={block.instruction}
                  map_config={block.map_config}
                  target={block.target}
                  feedback={block.feedback}
                  show_answer_on_fail={block.show_answer_on_fail}
                />
              );

            default:
              return null;
          }
        })}
      </div>
    </div>
  );
}
