import { useState, useRef, useEffect, useCallback, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  LogOut,
  Building2,
  User,
  ChevronDown,
  MessageSquare,
  Mic,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { TypingIndicator } from '@/components/ui/loading-skeleton';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { MessageBubble } from '@/components/chat/MessageBubble';
import { useChatHistory, Message } from '@/hooks/useChatHistory';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

const CHAT_API = 'http://127.0.0.1:8000/api/v1/chat';

const ChatDashboard = () => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  const { user, selectedClient, accessToken, logout, clearClient } = useAuth();
  const navigate = useNavigate();

  const {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    selectSession,
    addMessage,
    deleteSession,
    getConversationContext,
  } = useChatHistory(user?.id || '', selectedClient?.id || '');

  useEffect(() => {
    if (!selectedClient) {
      navigate('/clients');
    }
  }, [selectedClient, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentSession?.messages]);

  // Auto-create session if none exists
  useEffect(() => {
    if (!currentSessionId && selectedClient) {
      createSession();
    }
  }, [currentSessionId, createSession, selectedClient]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    addMessage(userMessage);
    setInput('');
    setIsLoading(true);

    try {
      const conversationContext = getConversationContext();

      const response = await fetch(CHAT_API, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          client_id: selectedClient?.id,
          bearer_token: accessToken,
          query: userMessage.content,
          // Backend expects an array of strings, not structured objects
          // Send only the last 5 message texts without any role prefixes
          conversation: conversationContext.slice(-5).map((m) => m.content),
        }),
      });

      const data = await response.json();

      // Extract response - handle both direct string and object with response field
      let responseContent = data.response || data;
      if (typeof responseContent === 'object') {
        responseContent = JSON.stringify(responseContent);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: responseContent,
        timestamp: new Date(),
      };

      addMessage(assistantMessage);
    } catch (error) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, there was an error processing your request. Please try again.',
        timestamp: new Date(),
      };
      addMessage(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, addMessage, getConversationContext, user, selectedClient, accessToken]);

  const handleUploadClick = () => {
    setUploadStatus(null);
    setUploadError(null);
    uploadInputRef.current?.click();
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!selectedClient?.id) {
      setUploadError('Please select an organization before uploading.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    setUploadStatus(null);
    setUploadError(null);

    try {
      const formData = new FormData();
      formData.append('client_id', selectedClient.id);
      formData.append('pdf', file);

      const res = await fetch('https://digital-parbhani-ai.157-20-215-17.nip.io/api/v1/upload_data', {
        method: 'POST',
        body: formData,
      });

      let successMessage = 'PDF uploaded successfully.';
      try {
        const data = await res.json();
        if (data && typeof data === 'object') {
          const possibleMessage =
            (data as any).message ||
            (data as any).detail ||
            (data as any).status;
          if (typeof possibleMessage === 'string' && possibleMessage.trim().length > 0) {
            successMessage = possibleMessage;
          }
        }
      } catch {
        // If response is not JSON or parsing fails, fall back to default success message
      }

      setUploadStatus(successMessage);
    } catch (error) {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleNewChat = () => {
    createSession();
  };

  const clientDetails = selectedClient?.orgn_details[0];
  const clientInfo = selectedClient?.primary_info[0];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="h-screen flex bg-background overflow-hidden"
    >
      <input
        ref={uploadInputRef}
        type="file"
        accept="application/pdf"
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Sidebar */}
      <ChatSidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        sessions={sessions}
        currentSessionId={currentSessionId}
        onSelectSession={selectSession}
        onNewChat={handleNewChat}
        onDeleteSession={deleteSession}
        clientLogo={clientDetails?.logo}
        clientName={clientDetails?.orgn_name}
        clientShortName={clientInfo?.short_name}
        onUploadPdf={handleUploadClick}
        isUploadingPdf={isUploading}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <motion.header
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm"
        >
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {clientDetails?.orgn_name}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center"
                  >
                    <User className="w-4 h-4 text-primary" />
                  </motion.div>
                  <span className="text-sm font-medium">
                    {user?.first_name} {user?.last_name}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem
                  onClick={() => {
                    clearClient();
                    navigate('/clients');
                  }}
                >
                  <Building2 className="w-4 h-4 mr-2" />
                  Switch Organization
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </motion.header>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {(uploadStatus || uploadError) && (
            <div className="px-6 pt-3">
              <div
                className={`text-sm rounded-lg px-4 py-2 border ${
                  uploadStatus
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                    : 'border-destructive/30 bg-destructive/10 text-destructive'
                }`}
              >
                {uploadStatus || uploadError}
              </div>
            </div>
          )}
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {(!currentSession || currentSession.messages.length === 0) && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="h-full flex flex-col items-center justify-center text-center"
              >
                <motion.div
                  whileHover={{ scale: 1.05, rotate: 5 }}
                  className="w-20 h-20 rounded-2xl gradient-primary shadow-glow flex items-center justify-center mb-6"
                >
                  <MessageSquare className="w-10 h-10 text-primary-foreground" />
                </motion.div>
                <h2 className="text-2xl font-semibold text-foreground mb-3">
                  Start a conversation
                </h2>
                <p className="text-muted-foreground max-w-md leading-relaxed">
                  Ask anything about {clientDetails?.orgn_name}. I'm here to help
                  you with insights and information.
                </p>
              </motion.div>
            )}

            <AnimatePresence mode="popLayout">
              {currentSession?.messages.map((message) => (
                <MessageBubble
                  key={message.id}
                  role={message.role}
                  content={message.content}
                  timestamp={message.timestamp}
                />
              ))}
            </AnimatePresence>

            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <TypingIndicator />
              </motion.div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Input Area */}
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="p-4 border-t border-border/50 bg-card/30 backdrop-blur-sm"
          >
            <div className="max-w-4xl mx-auto">
              <motion.div
                whileFocus={{ scale: 1.01 }}
                className="flex items-end gap-3 p-2 rounded-2xl bg-background border border-border/50 shadow-soft focus-within:border-primary/50 focus-within:shadow-glow transition-all"
              >
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type your message..."
                  rows={1}
                  className="flex-1 resize-none bg-transparent border-0 focus:outline-none focus:ring-0 py-2 px-3 text-sm max-h-32"
                  style={{ minHeight: '40px' }}
                />
                <div className="flex items-center gap-2">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.95 }}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate('/voice')}
                          className="h-10 w-10 rounded-xl text-primary hover:bg-primary/10 hover:text-primary transition-all"
                        >
                          <Mic className="w-5 h-5" />
                        </Button>
                      </motion.div>
                    </TooltipTrigger>
                    <TooltipContent>Voice Assistant</TooltipContent>
                  </Tooltip>
                  <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                    <Button
                      onClick={handleSend}
                      disabled={!input.trim() || isLoading}
                      size="icon"
                      className="gradient-primary text-primary-foreground shadow-glow hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none h-10 w-10 rounded-xl"
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
              <p className="text-xs text-muted-foreground text-center mt-2">
                Press Enter to send, Shift+Enter for new line
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatDashboard;
