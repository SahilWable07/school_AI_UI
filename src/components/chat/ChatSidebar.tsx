import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Mic,
  BarChart3,
  Settings,
  HelpCircle,
  Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ChatSession } from '@/hooks/useChatHistory';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useNavigate } from 'react-router-dom';

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
}: ChatSidebarProps) {
  const navigate = useNavigate();

  const navItems = [
    { icon: MessageSquare, label: 'Chat', active: true, onClick: () => {} },
    { icon: Mic, label: 'Voice Assistant', active: false, onClick: () => navigate('/voice') },
    { icon: BarChart3, label: 'Analytics', active: false, onClick: () => {} },
    { icon: Settings, label: 'Settings', active: false, onClick: () => {} },
    { icon: HelpCircle, label: 'Help', active: false, onClick: () => {} },
  ];

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
      </div>

      {/* Navigation */}
      <nav className="px-3 py-2 space-y-1">
        {navItems.map((item, index) => (
          <motion.button
            key={item.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            whileHover={{ x: 4 }}
            onClick={item.onClick}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
              item.active
                ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                : "text-sidebar-foreground hover:bg-sidebar-accent/50"
            )}
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  {item.label}
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        ))}
      </nav>

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
          <div className="px-3 pb-3 space-y-1">
            {sessions.map((session, index) => (
              <motion.div
                key={session.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.03 }}
                className="group relative"
              >
                <motion.button
                  whileHover={{ x: 2 }}
                  onClick={() => onSelectSession(session.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all",
                    currentSessionId === session.id
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                >
                  <MessageSquare className="w-4 h-4 flex-shrink-0 opacity-60" />
                  {!collapsed && (
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{session.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDate(session.updatedAt)}
                      </p>
                    </div>
                  )}
                </motion.button>

                {/* Delete button */}
                {!collapsed && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    whileHover={{ scale: 1.1 }}
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteSession(session.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-destructive/10 text-destructive transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </motion.button>
                )}
              </motion.div>
            ))}

            {sessions.length === 0 && !collapsed && (
              <div className="text-center py-8 text-muted-foreground text-sm">
                No chat history yet
              </div>
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
