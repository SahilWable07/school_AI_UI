import { useState, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic,
  MicOff,
  ArrowLeft,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';

const VoiceAssistant = () => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [response, setResponse] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(false);

  const { user, selectedClient, accessToken } = useAuth();
  const navigate = useNavigate();

  const clientDetails = selectedClient?.orgn_details[0];

  useEffect(() => {
    if (!selectedClient) {
      navigate('/clients');
    }
  }, [selectedClient, navigate]);

  // Speech recognition setup
  const startListening = useCallback(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setResponse('Speech recognition is not supported in your browser.');
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = false;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setTranscript('');
      setResponse('');
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
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.start();
  }, []);

  const handleVoiceQuery = async (query: string) => {
    setIsProcessing(true);

    try {
      const res = await fetch('http://127.0.0.1:8000/api/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          user_id: user?.id,
          client_id: selectedClient?.id,
          bearer_token: accessToken,
          query,
          conversation: [],
        }),
      });

      const data = await res.json();
      const responseText = data.response || 'Sorry, I could not process your request.';
      setResponse(responseText);

      // Speak the response
      if (!isMuted && 'speechSynthesis' in window) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(responseText);
        utterance.onend = () => setIsSpeaking(false);
        speechSynthesis.speak(utterance);
      }
    } catch (error) {
      setResponse('Sorry, there was an error processing your request.');
    } finally {
      setIsProcessing(false);
    }
  };

  const stopSpeaking = () => {
    speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // Get animation state
  const getAnimationState = () => {
    if (isListening) return 'listening';
    if (isSpeaking) return 'speaking';
    return 'idle';
  };

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
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
            <h1 className="font-semibold text-foreground">Voice Assistant</h1>
            <p className="text-xs text-muted-foreground">
              {clientDetails?.orgn_name}
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
              isListening
                ? { scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }
                : isSpeaking
                ? { scale: [1, 1.1, 1], opacity: [0.2, 0.5, 0.2] }
                : { scale: 1, opacity: 0.3 }
            }
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute inset-0 w-48 h-48 -m-12 rounded-full bg-primary/20"
          />
          <motion.div
            animate={
              isListening
                ? { scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }
                : isSpeaking
                ? { scale: [1, 1.08, 1], opacity: [0.3, 0.6, 0.3] }
                : { scale: 1, opacity: 0.4 }
            }
            transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
            className="absolute inset-0 w-40 h-40 -m-8 rounded-full bg-primary/30"
          />
          <motion.div
            animate={
              isListening
                ? { scale: [1, 1.1, 1], opacity: [0.5, 0.8, 0.5] }
                : isSpeaking
                ? { scale: [1, 1.05, 1], opacity: [0.4, 0.7, 0.4] }
                : { scale: 1, opacity: 0.5 }
            }
            transition={{ duration: 1.1, repeat: Infinity, ease: "easeInOut", delay: 0.4 }}
            className="absolute inset-0 w-32 h-32 -m-4 rounded-full bg-primary/40"
          />

          {/* Main button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={isListening ? undefined : startListening}
            disabled={isProcessing}
            className={`relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg transition-all ${
              isListening
                ? 'gradient-primary shadow-glow'
                : isProcessing
                ? 'bg-muted'
                : 'bg-card border border-border hover:border-primary'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-10 h-10 text-muted-foreground animate-spin" />
            ) : isListening ? (
              <MicOff className="w-10 h-10 text-primary-foreground" />
            ) : (
              <Mic className="w-10 h-10 text-primary" />
            )}
          </motion.button>
        </div>

        {/* Status Text */}
        <AnimatePresence mode="wait">
          <motion.div
            key={isListening ? 'listening' : isProcessing ? 'processing' : isSpeaking ? 'speaking' : 'idle'}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-center mb-8"
          >
            {isListening && (
              <p className="text-lg font-medium text-primary">Listening...</p>
            )}
            {isProcessing && (
              <p className="text-lg font-medium text-muted-foreground">
                Processing...
              </p>
            )}
            {isSpeaking && (
              <p className="text-lg font-medium text-primary">Speaking...</p>
            )}
            {!isListening && !isProcessing && !isSpeaking && (
              <p className="text-lg font-medium text-muted-foreground">
                Tap to speak
              </p>
            )}
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
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  You said:
                </p>
                <p className="text-base">{transcript}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Response */}
        <AnimatePresence>
          {response && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="w-full max-w-md"
            >
              <div className="bg-chat-ai text-chat-ai-foreground px-5 py-4 rounded-2xl shadow-soft">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Assistant:
                  </p>
                  {isSpeaking && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={stopSpeaking}
                      className="h-6 px-2 text-xs"
                    >
                      Stop
                    </Button>
                  )}
                </div>
                <p className="text-base leading-relaxed">{response}</p>
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
          Ask anything about {clientDetails?.orgn_name}. The assistant will
          respond with voice.
        </motion.p>
      </div>
    </div>
  );
};

export default VoiceAssistant;
