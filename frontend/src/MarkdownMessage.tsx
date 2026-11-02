import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownMessageProps {
  content: string;
}

export const MarkdownMessage: React.FC<MarkdownMessageProps> = ({ content }) => {
  // Sanitize LaTeX arrow artifacts emitted by local LLMs into clean Unicode symbols
  const sanitized = content
    .replace(/\$\s*\\rightarrow\s*\$/g, "→")
    .replace(/\\rightarrow/g, "→")
    .replace(/\$\s*\\leftarrow\s*\$/g, "←")
    .replace(/\\leftarrow/g, "←")
    .replace(/\$\s*\\Rightarrow\s*\$/g, "⇒")
    .replace(/\\Rightarrow/g, "⇒");

  return (
    <div className="markdown-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ ...props }) => (
            <div className="table-wrapper">
              <table className="chat-table" {...props} />
            </div>
          ),
          th: ({ ...props }) => <th className="chat-th" {...props} />,
          td: ({ ...props }) => <td className="chat-td" {...props} />,
          h1: ({ ...props }) => <h3 className="chat-h1" {...props} />,
          h2: ({ ...props }) => <h3 className="chat-h2" {...props} />,
          h3: ({ ...props }) => <h4 className="chat-h3" {...props} />,
          p: ({ ...props }) => <p className="chat-p" {...props} />,
          ul: ({ ...props }) => <ul className="chat-ul" {...props} />,
          ol: ({ ...props }) => <ol className="chat-ol" {...props} />,
          li: ({ ...props }) => <li className="chat-li" {...props} />,
          hr: () => <div className="chat-divider" />
        }}
      >
        {sanitized}
      </ReactMarkdown>
    </div>
  );
};
