import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Clock,
  UploadCloud,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatSession } from '@/hooks/useChatHistory';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ChatSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  sessions: ChatSession[];
  currentSessionId: string | null;
  onSelectSession: (id: string) => void;
  onNewChat: () => void;
  onDeleteSession: (id: string) => void;
  clientLogo?: string;
  clientName?: string;
  clientShortName?: string;
  onUploadPdf: () => void;
  isUploadingPdf: boolean;
}

export function ChatSidebar({
  collapsed,
  onToggle,
  sessions,
  currentSessionId,
  onSelectSession,
  onNewChat,
  onDeleteSession,
  clientLogo,
  clientName,
  clientShortName,
  onUploadPdf,
  isUploadingPdf,
}: ChatSidebarProps) {

  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <motion.aside
      initial={false}
      animate={{ width: collapsed ? 72 : 280 }}
      transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
      className="h-full flex flex-col border-r border-border/50 bg-sidebar relative"
    >
      {/* Client Logo Header */}
      <div className="h-16 flex items-center px-4 border-b border-sidebar-border">
        <motion.div
          whileHover={{ scale: 1.05 }}
          className="w-10 h-10 rounded-xl bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center overflow-hidden flex-shrink-0 shadow-sm"
        >
          {clientLogo ? (
            <img
              src={clientLogo}
              alt={clientName}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-sm font-bold text-muted-foreground">
              {clientShortName?.charAt(0) || '?'}
            </span>
          )}
        </motion.div>
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
              className="ml-3 flex-1 min-w-0"
            >
              <p className="text-sm font-semibold text-sidebar-foreground truncate">
                {clientName}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {clientShortName}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* New Chat Button */}
      <div className="p-3">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            onClick={onNewChat}
            className={cn(
              "w-full gradient-primary text-primary-foreground shadow-glow transition-all",
              collapsed ? "px-0" : ""
            )}
          >
            <Plus className="w-5 h-5" />
            {!collapsed && <span className="ml-2">New Chat</span>}
          </Button>
        </motion.div>
        <motion.div className="mt-2" whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="outline"
            onClick={onUploadPdf}
            disabled={isUploadingPdf}
            className={cn("w-full justify-center", collapsed ? "px-0" : "")}
          >
            <UploadCloud className="w-5 h-5" />
            {!collapsed && <span className="ml-2">{isUploadingPdf ? 'Uploading...' : 'Upload PDF'}</span>}
          </Button>
        </motion.div>
      </div>

      {/* Chat History */}
      <div className="flex-1 flex flex-col min-h-0 border-t border-sidebar-border mt-2">
        <AnimatePresence>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="px-4 py-3"
            >
              <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                <Clock className="w-3.5 h-3.5" />
                Recent Chats
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <ScrollArea className="flex-1">
          <div className="px-3 pb-3 space-y-1.5">
            <AnimatePresence mode="popLayout">
              {sessions.map((session, index) => (
                <motion.div
                  key={session.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: -20, height: 0 }}
                  transition={{ delay: index * 0.03, duration: 0.2 }}
                  layout
                  className="group relative"
                >
                  <motion.button
                    whileHover={{ x: 2 }}
                    onClick={() => onSelectSession(session.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all duration-200",
                      currentSessionId === session.id
                        ? "bg-gradient-to-r from-primary/15 to-primary/5 text-sidebar-accent-foreground border border-primary/20 shadow-sm"
                        : "text-sidebar-foreground hover:bg-sidebar-accent/50 border border-transparent"
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-colors",
                      currentSessionId === session.id 
                        ? "bg-primary/20 text-primary" 
                        : "bg-muted/50 text-muted-foreground"
                    )}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0 pr-8">
                        <p className="text-sm font-medium truncate">{session.title}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(session.updatedAt)} • {session.messages.length} messages
                        </p>
                      </div>
                    )}
                  </motion.button>

                  {/* Delete button - always visible */}
                  {!collapsed && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteSession(session.id);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all duration-200"
                    >
                      <Trash2 className="w-4 h-4" />
                    </motion.button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>

            {sessions.length === 0 && !collapsed && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-center py-12"
              >
                <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-3">
                  <MessageSquare className="w-6 h-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground text-sm">No chat history yet</p>
                <p className="text-muted-foreground/60 text-xs mt-1">Start a new conversation</p>
              </motion.div>
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Collapse Toggle */}
      <div className="p-3 border-t border-sidebar-border">
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggle}
            className="w-full justify-center text-muted-foreground"
          >
            {collapsed ? (
              <ChevronRight className="w-5 h-5" />
            ) : (
              <>
                <ChevronLeft className="w-5 h-5 mr-2" />
                <span>Collapse</span>
              </>
            )}
          </Button>
        </motion.div>
      </div>
    </motion.aside>
  );
}
