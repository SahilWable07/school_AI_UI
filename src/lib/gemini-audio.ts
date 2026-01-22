import {
  GoogleGenAI,
  LiveServerMessage,
  MediaResolution,
  Modality,
  Session,
} from '@google/genai';

interface WavConversionOptions {
  numChannels: number;
  sampleRate: number;
  bitsPerSample: number;
}

function parseMimeType(mimeType: string): WavConversionOptions {
  const [fileType, ...params] = mimeType.split(';').map(s => s.trim());
  const [_, format] = fileType.split('/');

  const options: Partial<WavConversionOptions> = {
    numChannels: 1,
    bitsPerSample: 16,
  };

  if (format && format.startsWith('L')) {
    const bits = parseInt(format.slice(1), 10);
    if (!isNaN(bits)) {
      options.bitsPerSample = bits;
    }
  }

  for (const param of params) {
    const [key, value] = param.split('=').map(s => s.trim());
    if (key === 'rate') {
      options.sampleRate = parseInt(value, 10);
    }
  }

  return options as WavConversionOptions;
}

function createWavHeader(dataLength: number, options: WavConversionOptions): Uint8Array {
  const { numChannels, sampleRate, bitsPerSample } = options;

  const byteRate = sampleRate * numChannels * bitsPerSample / 8;
  const blockAlign = numChannels * bitsPerSample / 8;
  const buffer = new ArrayBuffer(44);
  const view = new DataView(buffer);

  // RIFF header
  const encoder = new TextEncoder();
  const riff = encoder.encode('RIFF');
  const wave = encoder.encode('WAVE');
  const fmt = encoder.encode('fmt ');
  const data = encoder.encode('data');

  new Uint8Array(buffer, 0, 4).set(riff);
  view.setUint32(4, 36 + dataLength, true);
  new Uint8Array(buffer, 8, 4).set(wave);
  new Uint8Array(buffer, 12, 4).set(fmt);
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  new Uint8Array(buffer, 36, 4).set(data);
  view.setUint32(40, dataLength, true);

  return new Uint8Array(buffer);
}

function base64ToUint8Array(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

function convertToWav(rawData: string[], mimeType: string): Uint8Array {
  const options = parseMimeType(mimeType);
  
  const audioBuffers = rawData.map(data => base64ToUint8Array(data));
  const dataLength = audioBuffers.reduce((a, b) => a + b.length, 0);
  const wavHeader = createWavHeader(dataLength, options);
  
  const result = new Uint8Array(wavHeader.length + dataLength);
  result.set(wavHeader, 0);
  
  let offset = wavHeader.length;
  for (const buffer of audioBuffers) {
    result.set(buffer, offset);
    offset += buffer.length;
  }
  
  return result;
}

export interface GeminiAudioConfig {
  apiKey: string;
  voiceName?: string;
  onTextResponse?: (text: string) => void;
  onAudioReady?: (audioBlob: Blob) => void;
  onError?: (error: string) => void;
  onStatusChange?: (status: 'connecting' | 'connected' | 'processing' | 'playing' | 'idle' | 'error') => void;
}

export class GeminiAudioSession {
  private ai: GoogleGenAI;
  private session: Session | undefined;
  private responseQueue: LiveServerMessage[] = [];
  private audioParts: string[] = [];
  private lastMimeType: string = '';
  private config: GeminiAudioConfig;
  private isProcessing = false;

  constructor(config: GeminiAudioConfig) {
    this.config = config;
    this.ai = new GoogleGenAI({
      apiKey: config.apiKey,
    });
  }

  async connect(): Promise<void> {
    this.config.onStatusChange?.('connecting');

    const model = 'models/gemini-2.5-flash-native-audio-preview-12-2025';

    const sessionConfig = {
      responseModalities: [Modality.AUDIO],
      mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: this.config.voiceName || 'Zephyr',
          },
        },
      },
      contextWindowCompression: {
        triggerTokens: '25600',
        slidingWindow: { targetTokens: '12800' },
      },
    };

    this.session = await this.ai.live.connect({
      model,
      callbacks: {
        onopen: () => {
          console.debug('Gemini session opened');
          this.config.onStatusChange?.('connected');
        },
        onmessage: (message: LiveServerMessage) => {
          this.responseQueue.push(message);
        },
        onerror: (e: ErrorEvent) => {
          console.error('Gemini error:', e.message);
          this.config.onError?.(e.message);
          this.config.onStatusChange?.('error');
        },
        onclose: (e: CloseEvent) => {
          console.debug('Gemini session closed:', e.reason);
          this.config.onStatusChange?.('idle');
        },
      },
      config: sessionConfig,
    });
  }

  async sendMessage(text: string): Promise<void> {
    if (!this.session) {
      throw new Error('Session not connected');
    }

    this.isProcessing = true;
    this.audioParts = [];
    this.lastMimeType = '';
    this.responseQueue = [];
    this.config.onStatusChange?.('processing');

    this.session.sendClientContent({
      turns: [text],
    });

    await this.handleTurn();
  }

  private async handleTurn(): Promise<void> {
    let done = false;
    while (!done) {
      const message = await this.waitMessage();
      if (message.serverContent?.turnComplete) {
        done = true;
      }
    }

    // Convert collected audio to WAV and play
    if (this.audioParts.length > 0 && this.lastMimeType) {
      const wavData = convertToWav(this.audioParts, this.lastMimeType);
      const audioBlob = new Blob([new Uint8Array(wavData).buffer as ArrayBuffer], { type: 'audio/wav' });
      this.config.onAudioReady?.(audioBlob);
      this.config.onStatusChange?.('playing');
    }

    this.isProcessing = false;
  }

  private async waitMessage(): Promise<LiveServerMessage> {
    while (true) {
      const message = this.responseQueue.shift();
      if (message) {
        this.handleModelTurn(message);
        return message;
      }
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  private handleModelTurn(message: LiveServerMessage): void {
    if (message.serverContent?.modelTurn?.parts) {
      const part = message.serverContent.modelTurn.parts[0];

      if (part?.inlineData) {
        this.audioParts.push(part.inlineData.data ?? '');
        this.lastMimeType = part.inlineData.mimeType ?? '';
      }

      if (part?.text) {
        console.log('Text response:', part.text);
        this.config.onTextResponse?.(part.text);
      }
    }
  }

  close(): void {
    this.session?.close();
    this.session = undefined;
    this.config.onStatusChange?.('idle');
  }

  isConnected(): boolean {
    return this.session !== undefined;
  }
}

export async function playAudioBlob(blob: Blob): Promise<void> {
  const audioContext = new AudioContext();
  const arrayBuffer = await blob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const source = audioContext.createBufferSource();
  source.buffer = audioBuffer;
  source.connect(audioContext.destination);
  source.start(0);
  
  return new Promise(resolve => {
    source.onended = () => {
      audioContext.close();
      resolve();
    };
  });
}
