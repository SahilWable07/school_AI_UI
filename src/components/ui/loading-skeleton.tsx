import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Bot } from "lucide-react";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn("rounded-lg p-6 space-y-4", className)}
    >
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </motion.div>
  );
}

export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("flex gap-3", isUser && "flex-row-reverse")}
    >
      <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
      <div className={cn("space-y-2 max-w-[70%]", isUser && "items-end")}>
        <div className={cn("skeleton h-16 rounded-2xl", isUser ? "w-48" : "w-64")} />
      </div>
    </motion.div>
  );
}

export function TypingIndicator() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex gap-3"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
        className="h-9 w-9 rounded-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center shadow-sm"
      >
        <Bot className="w-4 h-4 text-muted-foreground" />
      </motion.div>
      <div className="bg-chat-ai text-chat-ai-foreground px-4 py-3 rounded-2xl rounded-tl-md shadow-sm">
        <div className="flex gap-1.5 items-center">
          <motion.span
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0 }}
            className="w-2 h-2 rounded-full bg-primary/60"
          />
          <motion.span
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }}
            className="w-2 h-2 rounded-full bg-primary/60"
          />
          <motion.span
            animate={{ y: [0, -4, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 1.2, repeat: Infinity, delay: 0.4 }}
            className="w-2 h-2 rounded-full bg-primary/60"
          />
        </div>
      </div>
    </motion.div>
  );
}
