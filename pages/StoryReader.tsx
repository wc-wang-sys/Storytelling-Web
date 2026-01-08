import React, { useState, useRef, useEffect } from 'react';
import { Story, Language } from '../types';
import { Button } from '../components/Button';
import { generateSpeech } from '../services/geminiService';
import { generatePDF } from '../services/pdfService';
import { translations } from '../locales';
import { ArrowLeft, ArrowRight, X, Volume2, StopCircle, Download, Loader2 } from 'lucide-react';

interface StoryReaderProps {
  story: Story;
  onExit: () => void;
  language?: Language;
}

// Voices mapping for UI
const VOICES = [
  { id: 'Kore', label: 'Storyteller', icon: '👩' },
  { id: 'Puck', label: 'Buddy', icon: '🧒' },
  { id: 'Fenrir', label: 'Grandpa', icon: '👴' },
];

export const StoryReader: React.FC<StoryReaderProps> = ({ story, onExit, language = 'en' }) => {
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedVoice, setSelectedVoice] = useState('Kore');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoadingAudio, setIsLoadingAudio] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  const t = translations[language].common;

  // Audio Context Refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<AudioBufferSourceNode | null>(null);

  useEffect(() => {
    return () => {
      stopAudio();
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Stop current playback
  const stopAudio = () => {
    if (sourceNodeRef.current) {
      try {
        sourceNodeRef.current.stop();
      } catch (e) {
        // Ignore errors if already stopped
      }
      sourceNodeRef.current = null;
    }
    setIsPlaying(false);
  };

  // Decode Base64 Audio
  const decodeAndPlay = async (base64Data: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }

      // Resume context if suspended (browser policy)
      if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
      }

      // 1. Decode Base64 to ArrayBuffer
      const binaryString = atob(base64Data);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      
      // 2. Convert raw PCM to AudioBuffer
      // NOTE: gemini-2.5-flash-preview-tts returns raw PCM 16-bit 24kHz mono
      const dataInt16 = new Int16Array(bytes.buffer);
      const numChannels = 1;
      const sampleRate = 24000;
      const frameCount = dataInt16.length / numChannels;
      
      const audioBuffer = audioContextRef.current.createBuffer(numChannels, frameCount, sampleRate);
      
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = audioBuffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }

      // 3. Play
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.onended = () => setIsPlaying(false);
      
      sourceNodeRef.current = source;
      source.start();
      setIsPlaying(true);

    } catch (e) {
      console.error("Error playing audio", e);
      alert("Could not play audio. Please try again.");
      setIsPlaying(false);
    }
  };

  const handlePlay = async () => {
    if (isPlaying) {
      stopAudio();
      return;
    }

    const text = story.pages[currentPage].text;
    if (!text) return;

    setIsLoadingAudio(true);
    try {
      // In a real app, we would cache this in the story object to avoid re-generating
      const base64 = await generateSpeech(text, selectedVoice);
      if (base64) {
        await decodeAndPlay(base64);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoadingAudio(false);
    }
  };

  const handleDownload = async () => {
      setIsDownloading(true);
      try {
          await generatePDF(story);
      } catch (error) {
          console.error("PDF generation failed", error);
          alert("Could not download PDF. Try again!");
      } finally {
          setIsDownloading(false);
      }
  };

  const handleNext = () => {
    stopAudio();
    if (currentPage < story.pages.length - 1) {
      setCurrentPage(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    stopAudio();
    if (currentPage > 0) {
      setCurrentPage(prev => prev - 1);
    }
  };

  const page = story.pages[currentPage];

  return (
    <div className="fixed inset-0 bg-kid-blue/10 flex flex-col z-50 overflow-hidden font-sans">
      {/* Top Bar */}
      <div className="bg-white p-4 shadow-md flex justify-between items-center z-10">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onExit} icon={<X />}>
            {t.exit}
          </Button>
          <span className="font-bold text-kid-purple text-lg truncate max-w-xs hidden md:block">
            {story.title}
          </span>
        </div>
        
        <div className="flex items-center gap-2">
            <Button 
                variant="accent" 
                size="sm" 
                onClick={handleDownload} 
                disabled={isDownloading}
                icon={isDownloading ? <Loader2 className="animate-spin" size={16}/> : <Download size={16}/>}
            >
                {isDownloading ? t.downloading : t.download}
            </Button>

            <div className="hidden sm:flex items-center gap-2 bg-gray-100 p-1 rounded-2xl ml-2">
            {VOICES.map(v => (
                <button
                key={v.id}
                onClick={() => { stopAudio(); setSelectedVoice(v.id); }}
                className={`px-3 py-2 rounded-xl text-sm font-bold flex items-center gap-1 transition-all ${selectedVoice === v.id ? 'bg-white shadow-sm text-kid-blue' : 'text-gray-400'}`}
                >
                <span>{v.icon}</span> <span className="hidden sm:inline">{v.label}</span>
                </button>
            ))}
            </div>
        </div>
      </div>

      {/* Book View */}
      <div className="flex-1 flex items-center justify-center p-4 md:p-8 overflow-y-auto">
        <div className="bg-white w-full max-w-6xl aspect-[4/3] md:aspect-[16/9] rounded-[3rem] shadow-2xl border-8 border-white overflow-hidden flex flex-col md:flex-row relative">
          
          {/* Image Side */}
          <div className="md:w-1/2 h-1/2 md:h-full relative bg-gray-100">
             <img 
               src={page.imageUrl} 
               alt={`Page ${currentPage + 1}`} 
               className="w-full h-full object-cover"
             />
             <div className="absolute top-4 left-4 bg-white/80 backdrop-blur px-4 py-2 rounded-full font-bold text-gray-600 border-2 border-white shadow-sm">
                Page {currentPage + 1}
             </div>
          </div>

          {/* Text Side */}
          <div className="md:w-1/2 h-1/2 md:h-full p-8 md:p-12 flex flex-col justify-center items-center bg-yellow-50/50">
             <p 
                className={`text-2xl md:text-3xl lg:text-4xl leading-relaxed text-gray-800 text-center ${story.styling.fontFamily}`}
                style={{ color: story.styling.titleColor }}
             >
                {page.text}
             </p>

             <div className="mt-8 md:mt-12">
               <button 
                  onClick={handlePlay}
                  disabled={isLoadingAudio}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg transform transition-all active:scale-95 border-4 border-white ${isPlaying ? 'bg-kid-pink animate-pulse' : 'bg-kid-green hover:bg-green-400'}`}
               >
                 {isLoadingAudio ? (
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
                 ) : isPlaying ? (
                    <StopCircle size={40} className="text-white fill-current" />
                 ) : (
                    <Volume2 size={40} className="text-white fill-current" />
                 )}
               </button>
               <p className="text-center text-gray-400 font-bold mt-2 text-sm uppercase tracking-wide">
                  {isPlaying ? 'Listen' : 'Read to Me'}
               </p>
             </div>
          </div>

        </div>
      </div>

      {/* Navigation Bar */}
      <div className="bg-white p-4 pb-8 flex justify-center items-center gap-8 shadow-[0_-10px_40px_rgba(0,0,0,0.1)]">
         <Button 
            variant="secondary" 
            size="lg" 
            onClick={handlePrev} 
            disabled={currentPage === 0}
            className={currentPage === 0 ? 'opacity-50' : ''}
            icon={<ArrowLeft />}
         >
           {t.back}
         </Button>

         <div className="text-2xl font-bold text-gray-300">
           {currentPage + 1} / {story.pages.length}
         </div>

         <Button 
            variant="primary" 
            size="lg" 
            onClick={handleNext} 
            disabled={currentPage === story.pages.length - 1}
            className={currentPage === story.pages.length - 1 ? 'opacity-50' : ''}
         >
           {t.yes} <ArrowRight className="inline ml-2" size={24}/>
         </Button>
      </div>
    </div>
  );
};