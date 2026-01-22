import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Volume2,
  VolumeX,
  Loader2,
  Mic,
  MicOff,
  Square,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { GeminiAudioSession, playAudioBlob } from '@/lib/gemini-audio';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

type Status = 'idle' | 'connecting' | 'connected' | 'listening' | 'processing' | 'playing' | 'error';

const GeminiVoice = () => {
  const [status, setStatus] = useState<Status>('idle');
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [textResponse, setTextResponse] = useState('');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [isLoadingKey, setIsLoadingKey] = useState(true);
  
  const sessionRef = useRef<GeminiAudioSession | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const recognitionRef = useRef<any>(null);

  const { selectedClient } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const clientDetails = selectedClient?.orgn_details[0];

  // Fetch API key from edge function on mount
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('gemini-api-key');
        
        if (error) {
          console.error('Error fetching API key:', error);
          toast({
            title: 'Configuration Error',
            description: 'Failed to load API configuration. Please try again.',
            variant: 'destructive',
          });
          setIsLoadingKey(false);
          return;
        }

        if (data?.apiKey) {
          setApiKey(data.apiKey);
        } else {
          toast({
            title: 'API Key Not Configured',
            description: 'Please configure the GEMINI_API_KEY in your backend secrets.',
            variant: 'destructive',
          });
        }
      } catch (err) {
        console.error('Error fetching API key:', err);
        toast({
          title: 'Error',
          description: 'Failed to initialize voice assistant.',
          variant: 'destructive',
        });
      } finally {
        setIsLoadingKey(false);
      }
    };

    fetchApiKey();
  }, [toast]);

  useEffect(() => {
    if (!selectedClient) {
      navigate('/clients');
    }
  }, [selectedClient, navigate]);

  useEffect(() => {
    return () => {
      sessionRef.current?.close();
      recognitionRef.current?.stop();
    };
  }, []);

  // Initialize speech recognition
  const initSpeechRecognition = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      toast({
        title: 'Not Supported',
        description: 'Speech recognition is not supported in your browser.',
        variant: 'destructive',
      });
      return null;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    return recognition;
  }, [toast]);

  // Handle voice query with Gemini
  const handleVoiceQuery = useCallback(async (query: string) => {
    if (!apiKey) {
      toast({
        title: 'API Key Missing',
        description: 'Please configure the Gemini API key.',
        variant: 'destructive',
      });
      return;
    }

    setStatus('processing');
    setTextResponse('');

    try {
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
              const url = URL.createObjectURL(audioBlob);
              if (audioRef.current) {
                audioRef.current.src = url;
                await audioRef.current.play();
              } else {
                await playAudioBlob(audioBlob);
              }
            } catch (err) {
              console.error('Audio playback error:', err);
              setStatus('connected');
            }
          } else {
            setStatus('idle');
          }
        },
        onError: (error) => {
          console.error('Gemini error:', error);
          toast({
            title: 'Error',
            description: error,
            variant: 'destructive',
          });
          setStatus('error');
        },
        onStatusChange: (newStatus) => {
          if (newStatus === 'connected') {
            // Don't override our more specific statuses
          }
        },
      });

      sessionRef.current = session;
      await session.connect();
      await session.sendMessage(query);
    } catch (error) {
      console.error('Gemini error:', error);
      toast({
        title: 'Connection Error',
        description: 'Failed to connect to Gemini. Please try again.',
        variant: 'destructive',
      });
      setStatus('error');
    }
  }, [apiKey, isMuted, toast]);

  // Start listening
  const startListening = useCallback(() => {
    if (!apiKey) {
      toast({
        title: 'Not Ready',
        description: 'Voice assistant is still loading. Please wait.',
        variant: 'destructive',
      });
      return;
    }

    const recognition = initSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;

    recognition.onstart = () => {
      setStatus('listening');
      setTranscript('');
      setTextResponse('');
    };

    recognition.onresult = (event: any) => {
      const current = event.resultIndex;
      const result = event.results[current];
      setTranscript(result[0].transcript);

      if (result.isFinal) {
        handleVoiceQuery(result[0].transcript);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error);
      if (event.error !== 'no-speech') {
        toast({
          title: 'Recognition Error',
          description: `Speech recognition error: ${event.error}`,
          variant: 'destructive',
        });
      }
      setStatus('idle');
    };

    recognition.onend = () => {
      if (status === 'listening') {
        setStatus('idle');
      }
    };

    recognition.start();
  }, [apiKey, initSpeechRecognition, handleVoiceQuery, status, toast]);

  // Stop everything
  const handleStop = useCallback(() => {
    recognitionRef.current?.stop();
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    sessionRef.current?.close();
    setStatus('idle');
  }, []);

  const isListening = status === 'listening';
  const isProcessing = status === 'processing' || status === 'connecting';
  const isPlaying = status === 'playing';
  const isActive = isListening || isProcessing || isPlaying;

  const getStatusText = () => {
    if (isLoadingKey) return 'Initializing...';
    switch (status) {
      case 'listening':
        return 'Listening...';
      case 'connecting':
        return 'Connecting to Gemini...';
      case 'processing':
        return 'Processing...';
      case 'playing':
        return 'Speaking...';
      case 'error':
        return 'Error occurred';
      default:
        return 'Tap to speak';
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={() => setStatus('idle')}
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
              {clientDetails?.orgn_name || 'Voice to Voice'}
            </p>
          </div>
        </div>

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
      </motion.header>

      {/* Main Content */}
      <div className="flex-1 flex flex-col items-center justify-center p-8">
        {/* Voice Visualization */}
        <div className="relative mb-12">
          {/* Outer rings */}
          <motion.div
            animate={
              isActive
                ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }
                : { scale: 1, opacity: 0.3 }
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            className="absolute inset-0 w-48 h-48 -m-12 rounded-full bg-primary/20"
          />
          <motion.div
            animate={
              isActive
                ? { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }
                : { scale: 1, opacity: 0.4 }
            }
            transition={{ duration: 1.3, repeat: Infinity, ease: 'easeInOut', delay: 0.2 }}
            className="absolute inset-0 w-40 h-40 -m-8 rounded-full bg-primary/30"
          />
          <motion.div
            animate={
              isActive
                ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }
                : { scale: 1, opacity: 0.5 }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: 'easeInOut', delay: 0.4 }}
            className="absolute inset-0 w-32 h-32 -m-4 rounded-full bg-primary/40"
          />

          {/* Main button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isActive ? handleStop : startListening}
            disabled={isLoadingKey || isProcessing}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all disabled:opacity-50 ${
              isListening
                ? 'gradient-primary shadow-glow'
                : isProcessing
                ? 'bg-muted'
                : isPlaying
                ? 'gradient-primary shadow-glow'
                : 'bg-card border border-border hover:border-primary'
            }`}
          >
            {isLoadingKey ? (
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            ) : isProcessing ? (
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            ) : isListening ? (
              <MicOff className="w-10 h-10 text-primary-foreground" />
            ) : isPlaying ? (
              <Square className="w-10 h-10 text-primary-foreground" />
            ) : (
              <Mic className="w-10 h-10 text-primary" />
            )}
          </motion.button>
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
                  : isActive
                  ? 'text-primary'
                  : 'text-muted-foreground'
              }`}
            >
              {getStatusText()}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Transcript */}
        <AnimatePresence>
          {transcript && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md mb-6"
            >
              <div className="bg-chat-user text-chat-user-foreground px-5 py-4 rounded-2xl shadow-soft">
                <p className="text-sm font-medium text-muted-foreground mb-1">You said:</p>
                <p className="text-base">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Text Response (if available) */}
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

        {/* Help text */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="text-sm text-muted-foreground mt-8 text-center max-w-sm"
        >
          {isLoadingKey
            ? 'Loading voice assistant...'
            : `Tap the microphone and speak. ${clientDetails?.orgn_name ? `Ask anything about ${clientDetails.orgn_name}.` : 'The AI will respond with voice.'}`}
        </motion.p>
      </div>
    </div>
  );
};

export default GeminiVoice;
