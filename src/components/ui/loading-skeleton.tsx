import { cn } from "@/lib/utils";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={cn("rounded-lg p-6 space-y-4", className)}>
      <div className="skeleton h-12 w-12 rounded-full" />
      <div className="space-y-2">
        <div className="skeleton h-4 w-3/4" />
        <div className="skeleton h-3 w-1/2" />
      </div>
    </div>
  );
}

export function SkeletonMessage({ isUser = false }: { isUser?: boolean }) {
  return (
    <div className={cn("flex gap-3", isUser && "flex-row-reverse")}>
      <div className="skeleton h-8 w-8 rounded-full flex-shrink-0" />
      <div className={cn("space-y-2 max-w-[70%]", isUser && "items-end")}>
        <div className={cn("skeleton h-16 rounded-2xl", isUser ? "w-48" : "w-64")} />
      </div>
    </div>
  );
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-semibold text-primary">AI</span>
      </div>
      <div className="bg-chat-ai text-chat-ai-foreground px-4 py-3 rounded-2xl rounded-bl-md">
        <div className="flex gap-1">
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 typing-dot" />
          <span className="w-2 h-2 rounded-full bg-muted-foreground/50 typing-dot" />
        </div>
      </div>
    </div>
  );
}
