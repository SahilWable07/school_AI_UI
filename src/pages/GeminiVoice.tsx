import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Send,
  ArrowLeft,
  Volume2,
  VolumeX,
  Loader2,
  Mic,
  Square,
  Sparkles,
  Key,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { GeminiAudioSession, playAudioBlob } from '@/lib/gemini-audio';
import { useToast } from '@/hooks/use-toast';

type Status = 'idle' | 'connecting' | 'connected' | 'processing' | 'playing' | 'error';

const STORAGE_KEY = 'gemini_api_key';

const GeminiVoice = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [inputText, setInputText] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [textResponse, setTextResponse] = useState('');
  const [lastQuery, setLastQuery] = useState('');
  const [apiKey, setApiKey] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || '';
  });
  const [showApiKeyInput, setShowApiKeyInput] = useState(false);
  
  const sessionRef = useRef<GeminiAudioSession | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const { selectedClient } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const clientDetails = selectedClient?.orgn_details[0];

  useEffect(() => {
    if (!selectedClient) {
      navigate('/clients');
    }
  }, [selectedClient, navigate]);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
    };
  }, []);

  const handleSaveApiKey = () => {
    localStorage.setItem(STORAGE_KEY, apiKey);
    setShowApiKeyInput(false);
    toast({
      title: 'API Key Saved',
      description: 'Your Gemini API key has been saved locally.',
    });
  };

  const handleSubmit = useCallback(async () => {
    if (!inputText.trim()) return;

    if (!apiKey) {
      setShowApiKeyInput(true);
      toast({
        title: 'API Key Required',
        description: 'Please enter your Gemini API key to continue.',
        variant: 'destructive',
      });
      return;
    }

    setLastQuery(inputText);
    setTextResponse('');
    setStatus('connecting');

    try {
      // Create new session for each request
      const session = new GeminiAudioSession({
        apiKey: apiKey,
        voiceName: 'Zephyr',
        onTextResponse: (text) => {
          setTextResponse(text);
        },
        onAudioReady: async (audioBlob) => {
          if (!isMuted) {
            setStatus('playing');
            try {
              // Use Audio element for better compatibility
              const url = URL.createObjectURL(audioBlob);
              if (audioRef.current) {
                audioRef.current.src = url;
                await audioRef.current.play();
              } else {
                await playAudioBlob(audioBlob);
              }
            } catch (err) {
              console.error('Audio playback error:', err);
            }
            setStatus('connected');
          }
        },
        onError: (error) => {
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
          setStatus('error');
        },
        onStatusChange: setStatus,
      });

      sessionRef.current = session;
      await session.connect();
      await session.sendMessage(inputText);
      setInputText('');
    } catch (error) {
      console.error('Gemini error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to Gemini. Please try again.',
        variant: 'destructive',
      });
      setStatus('error');
    }
  }, [inputText, isMuted, toast, apiKey]);

  const handleStop = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    sessionRef.current?.close();
    setStatus('idle');
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const isLoading = status === 'connecting' || status === 'processing';
  const isPlaying = status === 'playing';

  const getStatusText = () => {
    switch (status) {
      case 'connecting':
        return 'Connecting to Gemini...';
      case 'processing':
        return 'Processing your request...';
      case 'playing':
        return 'Speaking...';
      case 'connected':
        return 'Ready';
      case 'error':
        return 'Error occurred';
      default:
        return 'Enter text and click send';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setStatus('connected')}
        className="hidden"
      />

      {/* Header */}
      <motion.header
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="h-16 flex items-center justify-between px-6 border-b border-border/50 bg-card/50 backdrop-blur-sm"
      >
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/chat')}
            className="rounded-full"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-foreground flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Gemini Voice Assistant
            </h1>
            <p className="text-xs text-muted-foreground">
              {clientDetails?.orgn_name || 'Native Audio Streaming'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowApiKeyInput(!showApiKeyInput)}
            className="rounded-full"
          >
            <Key className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsMuted(!isMuted)}
            className="rounded-full"
          >
            {isMuted ? (
              <VolumeX className="w-5 h-5 text-muted-foreground" />
            ) : (
              <Volume2 className="w-5 h-5" />
            )}
          </Button>
        </div>
      </motion.header>

      {/* API Key Input Panel */}
      <AnimatePresence>
        {showApiKeyInput && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="border-b border-border/50 bg-card/30 backdrop-blur-sm overflow-hidden"
          >
            <div className="p-4 max-w-md mx-auto">
              <p className="text-sm text-muted-foreground mb-3">
                Enter your Gemini API key from{' '}
                <a
                  href="https://aistudio.google.com/app/apikey"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  Google AI Studio
                </a>
              </p>
              <div className="flex gap-2">
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="Enter your Gemini API key..."
                  className="flex-1"
                />
                <Button onClick={handleSaveApiKey} disabled={!apiKey.trim()}>
                  Save
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Voice Visualization */}
        <div className="relative mb-12">
          {/* Outer rings */}
          <motion.div
            animate={
              isLoading || isPlaying
                ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }
                : { scale: 1, opacity: 0.3 }
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 w-48 h-48 -m-12 rounded-full bg-primary/20"
          />
          <motion.div
            animate={
              isLoading || isPlaying
                ? { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }
                : { scale: 1, opacity: 0.4 }
            }
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="absolute inset-0 w-40 h-40 -m-8 rounded-full bg-primary/30"
          />
          <motion.div
            animate={
              isLoading || isPlaying
                ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }
                : { scale: 1, opacity: 0.5 }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="absolute inset-0 w-32 h-32 -m-4 rounded-full bg-primary/40"
          />

          {/* Main icon */}
          <motion.div
            animate={isPlaying ? { scale: [1, 1.05, 1] } : {}}
            transition={{ duration: 0.5, repeat: Infinity }}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isLoading
                ? 'bg-muted'
                : isPlaying
                ? 'gradient-primary shadow-glow'
                : 'bg-card border border-border'
            }`}
          >
            {isLoading ? (
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            ) : isPlaying ? (
              <Volume2 className="w-10 h-10 text-primary-foreground" />
            ) : (
              <Mic className="w-10 h-10 text-primary" />
            )}
          </motion.div>
        </div>

        {/* Status Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={status}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center mb-8"
          >
            <p
              className={`text-lg font-medium ${
                status === 'error'
                  ? 'text-destructive'
                  : isLoading || isPlaying
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {getStatusText()}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Last Query */}
        <AnimatePresence>
          {lastQuery && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md mb-6"
            >
              <div className="bg-chat-user text-chat-user-foreground px-5 py-4 rounded-2xl shadow-soft">
                <p className="text-sm font-medium text-muted-foreground mb-1">You said:</p>
                <p className="text-base">{lastQuery}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Response */}
        <AnimatePresence>
          {textResponse && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md mb-8"
            >
              <div className="bg-chat-ai text-chat-ai-foreground px-5 py-4 rounded-2xl shadow-soft">
                <p className="text-sm font-medium text-muted-foreground mb-1">Response:</p>
                <p className="text-base leading-relaxed">{textResponse}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="flex gap-2">
            <Input
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 h-12 rounded-xl bg-card border-border focus:border-primary"
            />
            {isPlaying ? (
              <Button
                onClick={handleStop}
                variant="destructive"
                size="icon"
                className="h-12 w-12 rounded-xl"
              >
                <Square className="w-5 h-5" />
              </Button>
            ) : (
              <Button
                onClick={handleSubmit}
                disabled={isLoading || !inputText.trim()}
                size="icon"
                className="h-12 w-12 rounded-xl gradient-primary"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            )}
          </div>
        </motion.div>

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground mt-8 text-center max-w-sm"
        >
          Type your message and press Enter or click Send. The AI will respond with voice using
          Gemini's native audio streaming.
        </motion.p>
      </div>
    </div>
  );
};

export default GeminiVoice;
