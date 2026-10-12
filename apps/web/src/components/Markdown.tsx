import React from 'react';

interface MarkdownProps {
  content: string;
  className?: string;
}

export const Markdown: React.FC<MarkdownProps> = ({ content, className = '' }) => {
  // Parse inline markdown tokens: bold, italic, code, link
  const renderInline = (text: string): React.ReactNode[] => {
    const tokens: React.ReactNode[] = [];
    let current = text;
    let key = 0;

    // Pattern for markdown links: [text](url)
    // Inline code: `code`
    // Bold: **text**
    // Italic: *text*
    const inlineRegex = /(\[([^\]]+)\]\(([^)]+)\)|`([^`]+)`|\*\*([^*]+)\*\*|\*([^*]+)\*)/;

    while (current.length > 0) {
      const match = current.match(inlineRegex);
      if (!match || match.index === undefined) {
        tokens.push(current);
        break;
      }

      if (match.index > 0) {
        tokens.push(current.substring(0, match.index));
      }

      const [full, , linkText, linkUrl, codeText, boldText, italicText] = match;

      if (linkText && linkUrl) {
        tokens.push(
          <a
            key={key++}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            {linkText}
          </a>
        );
      } else if (codeText) {
        tokens.push(
          <code
            key={key++}
            className="px-1.5 py-0.5 rounded bg-surface border border-border text-primary font-mono text-14"
          >
            {codeText}
          </code>
        );
      } else if (boldText) {
        tokens.push(<strong key={key++} className="font-semibold text-text">{boldText}</strong>);
      } else if (italicText) {
        tokens.push(<em key={key++} className="italic text-text">{italicText}</em>);
      }

      current = current.substring(match.index + full.length);
    }

    return tokens;
  };

  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let inCodeBlock = false;
  let codeBuffer: string[] = [];
  let listBuffer: { type: 'ul' | 'ol'; items: string[] } | null = null;
  let elementKey = 0;

  const flushList = () => {
    if (!listBuffer) return;
    if (listBuffer.type === 'ul') {
      elements.push(
        <ul key={elementKey++} className="list-disc list-inside space-y-1 my-3 text-text">
          {listBuffer.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
    } else {
      elements.push(
        <ol key={elementKey++} className="list-decimal list-inside space-y-1 my-3 text-text">
          {listBuffer.items.map((item, idx) => (
            <li key={idx} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ol>
      );
    }
    listBuffer = null;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        inCodeBlock = false;
        elements.push(
          <pre
            key={elementKey++}
            className="p-4 rounded-lg bg-surface border border-border text-14 font-mono overflow-x-auto my-4 text-text"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
      } else {
        flushList();
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      continue;
    }

    const trimmed = line.trim();

    if (!trimmed) {
      flushList();
      continue;
    }

    // Unordered list
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const itemText = trimmed.substring(2);
      if (listBuffer && listBuffer.type === 'ul') {
        listBuffer.items.push(itemText);
      } else {
        flushList();
        listBuffer = { type: 'ul', items: [itemText] };
      }
      continue;
    }

    // Ordered list
    const olMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
    if (olMatch) {
      const itemText = olMatch[2];
      if (listBuffer && listBuffer.type === 'ol') {
        listBuffer.items.push(itemText);
      } else {
        flushList();
        listBuffer = { type: 'ol', items: [itemText] };
      }
      continue;
    }

    // Flush any pending lists before non-list elements
    flushList();

    // Headings
    if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={elementKey++} className="text-32 font-semibold text-text tracking-tight mt-6 mb-3">
          {renderInline(trimmed.substring(2))}
        </h1>
      );
      continue;
    }
    if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={elementKey++} className="text-24 font-semibold text-text tracking-tight mt-5 mb-2.5">
          {renderInline(trimmed.substring(3))}
        </h2>
      );
      continue;
    }
    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={elementKey++} className="text-20 font-semibold text-text tracking-tight mt-4 mb-2">
          {renderInline(trimmed.substring(4))}
        </h3>
      );
      continue;
    }
    if (trimmed.startsWith('#### ')) {
      elements.push(
        <h4 key={elementKey++} className="text-16 font-semibold text-text tracking-tight mt-3 mb-1.5">
          {renderInline(trimmed.substring(5))}
        </h4>
      );
      continue;
    }

    // Blockquote
    if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote
          key={elementKey++}
          className="border-l-4 border-primary pl-4 py-1 my-3 text-text-muted italic bg-surface/40 rounded-r-lg"
        >
          {renderInline(trimmed.substring(2))}
        </blockquote>
      );
      continue;
    }

    // Standard Paragraph
    elements.push(
      <p key={elementKey++} className="text-16 text-text leading-relaxed my-2.5">
        {renderInline(line)}
      </p>
    );
  }

  flushList();

  return <div className={`prose-container space-y-1 ${className}`}>{elements}</div>;
};
