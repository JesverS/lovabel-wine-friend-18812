import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function SubsectionBlock({ title, items }) {
  return (
    <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 sm:p-6 space-y-3">
      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{title}</h3>

      <ul className="list-disc pl-6 space-y-2 text-gray-700 text-sm sm:text-base">
        {items.map((item, i) => (
          <li key={i} className="leading-relaxed">
            <span className="inline">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  p: ({ children }) => <span>{children}</span>,
                  strong: ({ children }) => <strong className="font-bold text-gray-900">{children}</strong>,
                  em: ({ children }) => <em className="italic">{children}</em>,
                  a: ({ children, href }) => (
                    <a href={href} className="text-primary hover:underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {item}
              </ReactMarkdown>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
