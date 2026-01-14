import { motion } from 'framer-motion';
import { User, Bot, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

interface MessageBubbleProps {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Parse and format response content
function formatContent(content: string): string {
  try {
    const trimmed = content.trim();
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) || 
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
      const parsed = JSON.parse(trimmed);
      if (parsed.response) {
        return parsed.response;
      }
      return JSON.stringify(parsed, null, 2);
    }
  } catch {
    // Not JSON, return as is
  }
  return content;
}

// Render markdown-like content to JSX
function renderFormattedText(text: string): React.ReactNode[] {
  const elements: React.ReactNode[] = [];
  const lines = text.split('\n');
  
  lines.forEach((line, lineIndex) => {
    const trimmedLine = line.trim();
    
    // Check if it's a bullet point (starts with * or -)
    const isBullet = /^[\*\-]\s+/.test(trimmedLine);
    const lineContent = isBullet ? trimmedLine.replace(/^[\*\-]\s+/, '') : line;
    
    // Parse bold text (**text**)
    const parts: React.ReactNode[] = [];
    let partIndex = 0;
    
    const boldRegex = /\*\*([^*]+)\*\*/g;
    let lastIndex = 0;
    let match;
    
    while ((match = boldRegex.exec(lineContent)) !== null) {
      if (match.index > lastIndex) {
        parts.push(
          <span key={`text-${lineIndex}-${partIndex++}`}>
            {lineContent.slice(lastIndex, match.index)}
          </span>
        );
      }
      parts.push(
        <strong key={`bold-${lineIndex}-${partIndex++}`} className="font-semibold">
          {match[1]}
        </strong>
      );
      lastIndex = match.index + match[0].length;
    }
    
    if (lastIndex < lineContent.length) {
      parts.push(
        <span key={`text-${lineIndex}-${partIndex++}`}>
          {lineContent.slice(lastIndex)}
        </span>
      );
    }
    
    if (parts.length === 0) {
      parts.push(<span key={`line-${lineIndex}`}>{lineContent}</span>);
    }
    
    if (isBullet) {
      elements.push(
        <div key={`bullet-${lineIndex}`} className="flex items-start gap-2 ml-2 my-1">
          <span className="text-primary mt-0.5">•</span>
          <span>{parts}</span>
        </div>
      );
    } else {
      elements.push(
        <span key={`line-${lineIndex}`}>
          {parts}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      );
    }
  });
  
  return elements;
}

export function MessageBubble({ role, content, timestamp }: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === 'user';
  const formattedContent = formatContent(content);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(formattedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      transition={{ 
        duration: 0.3, 
        ease: [0.23, 1, 0.32, 1],
        opacity: { duration: 0.2 }
      }}
      layout
      className={cn("flex gap-3 group", isUser && "flex-row-reverse")}
    >
      {/* Avatar */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 300 }}
        className={cn(
          "w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-sm",
          isUser
            ? "bg-gradient-to-br from-primary to-primary/80 text-primary-foreground"
            : "bg-gradient-to-br from-muted to-muted/80"
        )}
      >
        {isUser ? (
          <User className="w-4 h-4" />
        ) : (
          <Bot className="w-4 h-4 text-muted-foreground" />
        )}
      </motion.div>

      {/* Message Content */}
      <div className={cn("flex flex-col gap-1 max-w-[75%]", isUser && "items-end")}>
        <motion.div
          whileHover={{ scale: 1.01 }}
          className={cn(
            "relative px-4 py-3 rounded-2xl shadow-sm",
            isUser
              ? "bg-chat-user text-chat-user-foreground rounded-tr-md"
              : "bg-chat-ai text-chat-ai-foreground rounded-tl-md"
          )}
        >
          <div className="text-sm leading-relaxed">
            {isUser ? formattedContent : renderFormattedText(formattedContent)}
          </div>

          {/* Copy button for assistant messages */}
          {!isUser && (
            <motion.button
              initial={{ opacity: 0 }}
              whileHover={{ opacity: 1 }}
              className="absolute -right-10 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-background/80 backdrop-blur-sm border border-border/50 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={handleCopy}
            >
              {copied ? (
                <Check className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5 text-muted-foreground" />
              )}
            </motion.button>
          )}
        </motion.div>

        {/* Timestamp */}
        <span className="text-[10px] text-muted-foreground/60 px-1">
          {timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </motion.div>
  );
}
