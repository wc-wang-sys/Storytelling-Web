import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { Button } from './Button';
import { Language } from '../types';

interface VoiceInputProps {
  onTextReceived: (text: string) => void;
  languageHint?: Language;
}

export const VoiceInput: React.FC<VoiceInputProps> = ({ onTextReceived, languageHint = 'en' }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  
  // Refs for cleanup
  const audioContextRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const sessionRef = useRef<Promise<any> | null>(null);

  const cleanup = async () => {
    if (processorRef.current) {
        processorRef.current.disconnect();
        processorRef.current = null;
    }
    if (sourceRef.current) {
        sourceRef.current.disconnect();
        sourceRef.current = null;
    }
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        await audioContextRef.current.close();
        audioContextRef.current = null;
    }
    if (sessionRef.current) {
        try {
            const session = await sessionRef.current;
            session.close();
        } catch (e) {
            console.error("Error closing session:", e);
        }
        sessionRef.current = null;
    }
  };

  const startRecording = async () => {
    try {
      setIsConnecting(true);
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
        sampleRate: 16000, 
      });
      audioContextRef.current = audioContext;

      if (audioContext.state === 'suspended') {
          await audioContext.resume();
      }

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const langName = languageHint === 'zh-CN' ? 'Mandarin Chinese' : 
                       languageHint === 'zh-TW' ? 'Traditional Chinese' : 'English';
      
      // Updated instruction for better transcription behavior
      const systemInstruction = `You are a helpful assistant listening to a child telling a story. Language: ${langName}. Listen quietly and let the system transcribe the speech.`;

      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            console.log("Gemini Live Connected");
            setIsConnecting(false);
            setIsRecording(true);
            
            const source = audioContext.createMediaStreamSource(stream);
            sourceRef.current = source;
            
            // 4096 buffer size is ~250ms at 16kHz
            const scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
            processorRef.current = scriptProcessor;

            scriptProcessor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createBlob(inputData);
              
              sessionPromise.then(session => {
                  session.sendRealtimeInput({ media: pcmBlob });
              });
            };

            source.connect(scriptProcessor);
            scriptProcessor.connect(audioContext.destination);
          },
          onmessage: (message: LiveServerMessage) => {
            if (message.serverContent?.inputTranscription) {
                const text = message.serverContent.inputTranscription.text;
                if (text) {
                    onTextReceived(text);
                }
            }
          },
          onclose: () => {
            console.log("Gemini Live Closed");
            setIsRecording(false);
            setIsConnecting(false);
          },
          onerror: (err) => {
            console.error("Gemini Live Error:", err);
            setIsRecording(false);
            setIsConnecting(false);
            cleanup(); 
          }
        },
        config: {
           responseModalities: [Modality.AUDIO],
           speechConfig: {
             voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } }
           },
           inputAudioTranscription: {}, 
           systemInstruction: systemInstruction,
        }
      });
      
      sessionRef.current = sessionPromise;

    } catch (error) {
      console.error("Failed to start recording:", error);
      setIsConnecting(false);
      alert("Could not access microphone. Please check permissions.");
      cleanup();
    }
  };

  const stopRecording = () => {
    setIsRecording(false);
    setIsConnecting(false);
    cleanup();
  };

  function createBlob(data: Float32Array) {
    const l = data.length;
    const int16 = new Int16Array(l);
    for (let i = 0; i < l; i++) {
        const s = Math.max(-1, Math.min(1, data[i]));
        int16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
    }
    
    let binary = '';
    const bytes = new Uint8Array(int16.buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    
    return {
        data: btoa(binary),
        mimeType: 'audio/pcm;rate=16000',
    };
  }

  useEffect(() => {
      return () => { cleanup(); };
  }, []);

  return (
    <Button 
        variant={isRecording ? "accent" : "secondary"}
        onClick={isRecording ? stopRecording : startRecording}
        disabled={isConnecting}
        className={isRecording ? "animate-pulse" : ""}
        icon={
            isConnecting ? <Loader2 className="animate-spin" size={24}/> :
            isRecording ? <MicOff size={24} /> : 
            <Mic size={24} />
        }
        type="button" 
        title={isRecording ? "Stop Recording" : "Start Recording"}
    />
  );
};