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
  userId: string;
}

const MAX_HISTORY_MESSAGES = 10; // Last 10 messages for API context
const MAX_SESSIONS = 50; // Keep up to 50 chat sessions

// Create a unique storage key for user + client combination
const getStorageKey = (userId: string, clientId: string) => `chat_sessions_${userId}_${clientId}`;
const getCurrentSessionKey = (userId: string, clientId: string) => `current_session_${userId}_${clientId}`;

export function useChatHistory(userId: string, clientId: string) {
  const storageKey = getStorageKey(userId, clientId);
  const currentSessionKey = getCurrentSessionKey(userId, clientId);

  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    if (!userId || !clientId) return [];
    const stored = localStorage.getItem(storageKey);
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
    if (!userId || !clientId) return null;
    const stored = localStorage.getItem(currentSessionKey);
    return stored || null;
  });

  // Persist sessions whenever they change
  useEffect(() => {
    if (userId && clientId) {
      localStorage.setItem(storageKey, JSON.stringify(sessions));
    }
  }, [sessions, storageKey, userId, clientId]);

  // Persist current session ID
  useEffect(() => {
    if (userId && clientId && currentSessionId) {
      localStorage.setItem(currentSessionKey, currentSessionId);
    }
  }, [currentSessionId, currentSessionKey, userId, clientId]);

  const currentSession = sessions.find(s => s.id === currentSessionId) || null;

  const createSession = useCallback(() => {
    if (!userId || !clientId) return null;
    
    const newSession: ChatSession = {
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title: 'New Chat',
      messages: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      clientId,
      userId,
    };

    setSessions(prev => {
      const updated = [newSession, ...prev];
      // Keep only last MAX_SESSIONS
      return updated.slice(0, MAX_SESSIONS);
    });
    setCurrentSessionId(newSession.id);
    return newSession;
  }, [clientId, userId]);

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
    setSessions(prev => {
      const filtered = prev.filter(s => s.id !== sessionId);
      return filtered;
    });
    
    // If we deleted the current session, clear the selection
    if (currentSessionId === sessionId) {
      setCurrentSessionId(null);
      localStorage.removeItem(currentSessionKey);
    }
  }, [currentSessionId, currentSessionKey]);

  // Get last N messages for API context (conversational history)
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
