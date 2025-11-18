import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function TextBlock({ value }) {
  return (
    <div className="text-gray-700 leading-relaxed text-sm sm:text-base">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
              {children}
            </a>
          ),
          ul: ({ children }) => <ul className="list-disc pl-6 space-y-1 my-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal pl-6 space-y-1 my-2">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        }}
      >
        {value}
      </ReactMarkdown>
    </div>
  );
}
