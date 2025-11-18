import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function HighlightBlock({ value }) {
  return (
    <div className="bg-yellow-50 border border-yellow-300 rounded-xl p-4 sm:p-6 text-sm sm:text-base">
      <span className="font-bold">⭐ À retenir :</span>{" "}
      <span className="inline">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            p: ({ children }) => <span>{children}</span>,
            strong: ({ children }) => <strong className="font-bold">{children}</strong>,
            em: ({ children }) => <em className="italic">{children}</em>,
            a: ({ children, href }) => (
              <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                {children}
              </a>
            ),
          }}
        >
          {value}
        </ReactMarkdown>
      </span>
    </div>
  );
}
