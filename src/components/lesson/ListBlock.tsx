import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ListBlock({ items }) {
  return (
    <ul className="list-disc pl-6 space-y-1 text-gray-700 text-sm sm:text-base">
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
  );
}
