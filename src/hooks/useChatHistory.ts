import { useState, useCallback, useEffect } from 'react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
  updatedAt: Date;
  clientId: string;
}

const MAX_HISTORY_MESSAGES = 10; // Last 10 messages for API context
const MAX_SESSIONS = 50; // Keep up to 50 chat sessions

export function useChatHistory(clientId: string) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    const stored = localStorage.getItem(`chat_sessions_${clientId}`);
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        return parsed.map((s: ChatSession) => ({
          ...s,
          createdAt: new Date(s.createdAt),
          updatedAt: new Date(s.updatedAt),
          messages: s.messages.map((m: Message) => ({
            ...m,
            timestamp: new Date(m.timestamp),
          })),
        }));
      } catch {
        return [];
      }
    }
    return [];
  });

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(() => {
    const stored = localStorage.getItem(`current_session_${clientId}`);
    return stored || null;
  });

  // Persist sessions
  useEffect(() => {
    localStorage.setItem(`chat_sessions_${clientId}`, JSON.stringify(sessions));
  }, [sessions, clientId]);

  // Persist current session
  useEffect(() => {
    if (currentSessionId) {
      localStorage.setItem(`current_session_${clientId}`, currentSessionId);
    }
  }, [currentSessionId, clientId]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createSession = useCallback(() => {
    const newSession: ChatSession = {
      id: Date.now().toString(),
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      clientId,
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      // Keep only last MAX_SESSIONS
      return updated.slice(0, MAX_SESSIONS);
    });
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [clientId]);

  const selectSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
  }, []);

  const addMessage = useCallback((message: Message) => {
    setSessions(prev => {
      return prev.map(session => {
        if (session.id === currentSessionId) {
          const updatedMessages = [...session.messages, message];
          // Generate title from first user message
          let title = session.title;
          if (session.title === 'New Chat' && message.role === 'user') {
            title = message.content.slice(0, 40) + (message.content.length > 40 ? '...' : '');
          }
          return {
            ...session,
            title,
            messages: updatedMessages,
            updatedAt: new Date(),
          };
        }
        return session;
      });
    });
  }, [currentSessionId]);

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId));
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
    }
  }, [currentSessionId]);

  // Get last N messages for API context
  const getConversationContext = useCallback(() => {
    if (!currentSession) return [];
    const messages = currentSession.messages.slice(-MAX_HISTORY_MESSAGES);
    return messages.map(m => ({
      role: m.role,
      content: m.content,
    }));
  }, [currentSession]);

  return {
    sessions,
    currentSession,
    currentSessionId,
    createSession,
    selectSession,
    addMessage,
    deleteSession,
    getConversationContext,
  };
}
