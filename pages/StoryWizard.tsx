import React, { useState, useEffect, useCallback } from 'react';
import { WizardState, WizardStep, AgeGroup, User, UserRole, Badge, StoryPage, Language } from '../types';
import { Button } from '../components/Button';
import { ProgressBar } from '../components/ProgressBar';
import { BadgeNotification } from '../components/BadgeNotification';
import { VoiceInput } from '../components/VoiceInput';
import { generateImage, generateSuggestions, generateStorySegments } from '../services/geminiService';
import { Volume2, ArrowRight, Wand2, RefreshCw, Star, Edit, Save, Printer, HelpCircle, Check } from 'lucide-react';
import { translations } from '../locales';

interface StoryWizardProps {
  user: User;
  onFinish: (storyData: WizardState, action: 'save' | 'edit') => void;
  onCancel: () => void;
  language: Language;
}

type InteractionMode = 'input' | 'options' | 'confirmation';

interface OptionCard {
  label: string;
  imageUrl: string | null;
  loading: boolean;
}

export const StoryWizard: React.FC<StoryWizardProps> = ({ user, onFinish, onCancel, language }) => {
  const [state, setState] = useState<WizardState>({
    step: WizardStep.AGE_SELECTION,
    ageGroup: null,
    character: null,
    place: null,
    time: null,
    plotInput: '',
    generatedPages: []
  });

  const [isLoading, setIsLoading] = useState(false);
  const [inactivityTimer, setInactivityTimer] = useState(0);
  const [mode, setMode] = useState<InteractionMode>('input');
  const [suggestedOptions, setSuggestedOptions] = useState<OptionCard[]>([]);
  const [autoSelectCandidate, setAutoSelectCandidate] = useState<OptionCard | null>(null);
  const [currentPoints, setCurrentPoints] = useState(user.points);
  const [newBadge, setNewBadge] = useState<Badge | null>(null);
  const [tempInput, setTempInput] = useState('');

  const t = translations[language].wizard;
  const common = translations[language].common;

  const resetTimer = useCallback(() => {
    setInactivityTimer(0);
    if (mode === 'confirmation') {
    } else {
        setMode('input');
    }
  }, [mode]);

  useEffect(() => {
    const activeSteps = [WizardStep.CHARACTER, WizardStep.PLACE, WizardStep.TIME];
    if (isLoading || !activeSteps.includes(state.step)) return;

    const interval = setInterval(() => {
      setInactivityTimer(prev => {
        const t = prev + 1;
        if (t === 30 && mode === 'input' && tempInput === '') {
           handleShowOptions();
        }
        if (t === 60 && mode === 'options') {
           handleShowConfirmation();
        }
        if (t === 70 && mode === 'confirmation') {
           handleAutoSelect();
        }
        return t;
      });
    }, 1000);

    const events = ['mousemove', 'keydown', 'touchstart'];
    const handler = () => {
        if (mode === 'input') setInactivityTimer(0);
    };
    
    events.forEach(e => window.addEventListener(e, handler));

    return () => {
      clearInterval(interval);
      events.forEach(e => window.removeEventListener(e, handler));
    };
  }, [state.step, mode, isLoading, tempInput]);

  useEffect(() => {
      setTempInput('');
  }, [state.step]);

  const getContext = () => {
      if (state.step === WizardStep.PLACE) return 'place';
      if (state.step === WizardStep.TIME) return 'time';
      return 'character';
  }

  const handleShowOptions = async () => {
    setMode('options');
    const context = getContext();
    
    // Pass language to generateSuggestions
    const texts = await generateSuggestions(context, state.ageGroup || AgeGroup.EARLY_READER, language);
    
    const initialOptions = texts.map(t => ({ label: t, imageUrl: null, loading: true }));
    setSuggestedOptions(initialOptions);

    texts.forEach(async (text, index) => {
        try {
            // For prompt generation, it's safer to use the user's language input, 
            // but the model translates for the prompt internally or we just prompt with the text.
            const prompt = state.step === WizardStep.PLACE 
                ? `A cartoon background of ${text}` 
                : `A cute ${text} character`;
            
            const url = await generateImage(prompt);
            
            setSuggestedOptions(prev => {
                const next = [...prev];
                next[index] = { ...next[index], imageUrl: url, loading: false };
                return next;
            });
        } catch (e) {
             setSuggestedOptions(prev => {
                const next = [...prev];
                next[index] = { ...next[index], loading: false };
                return next;
            });
        }
    });
  };

  const handleShowConfirmation = () => {
    setMode('confirmation');
    const candidate = suggestedOptions[0] || { label: "Magic Friend", imageUrl: null, loading: false };
    setAutoSelectCandidate(candidate);
  };

  const handleAutoSelect = () => {
      if (autoSelectCandidate) {
          handleSelection(autoSelectCandidate.label, autoSelectCandidate.imageUrl || undefined);
      } else {
          handleSelection("Magic Friend");
      }
  };

  const handleSelection = async (choice: string, preGeneratedImage?: string) => {
      setInactivityTimer(0);
      setMode('input');
      setIsLoading(true);
      
      try {
        if (state.step === WizardStep.CHARACTER) {
            const img = preGeneratedImage || await generateImage(`A cute ${choice} character`);
            setState(prev => ({ ...prev, character: { description: choice, imageUrl: img } }));
        } else if (state.step === WizardStep.PLACE) {
            const img = preGeneratedImage || await generateImage(`A cartoon background of ${choice}`);
            setState(prev => ({ ...prev, place: { description: choice, imageUrl: img } }));
        } else if (state.step === WizardStep.TIME) {
            setState(prev => ({ ...prev, time: choice }));
        }
      } catch (e) {
          console.error(e);
      } finally {
        setIsLoading(false);
        setTempInput('');
      }
  };

  const awardPoints = (amount: number) => {
      setCurrentPoints(prev => prev + amount);
  };

  const checkBadges = (step: WizardStep) => {
      let badge: Badge | null = null;
      if (step === WizardStep.CHARACTER) {
          badge = { id: 'char_creator', name: 'Character Creator', icon: '🦁', description: 'You made a new friend!' };
      } else if (step === WizardStep.PLACE) {
          badge = { id: 'world_builder', name: 'World Builder', icon: '🌍', description: 'You discovered a new place!' };
      }
      if (badge) {
          setNewBadge(badge);
      }
  };

  const confirmStep = () => {
      awardPoints(10);
      checkBadges(state.step);
      setState(prev => ({ ...prev, step: prev.step + 1 }));
      setMode('input');
      setSuggestedOptions([]);
      setAutoSelectCandidate(null);
  };

  const generatePage = async () => {
      if (!state.character || !state.place || !state.time) return;
      setIsLoading(true);
      
      try {
        // Pass language to generateStorySegments
        const segments = await generateStorySegments({
            character: state.character.description,
            place: state.place.description,
            time: state.time,
            plot: state.plotInput || "They started an adventure."
        }, state.ageGroup!, language);

        const pagePromises = segments.map(async (seg) => {
            const img = await generateImage(seg.imagePrompt);
            return {
                text: seg.text,
                imageUrl: img,
                imagePrompt: seg.imagePrompt
            } as StoryPage;
        });

        const newPages = await Promise.all(pagePromises);

        awardPoints(50);
        setNewBadge({ id: 'master_story', name: 'Master Storyteller', icon: '👑', description: 'You created a whole book!' });

        setState(prev => ({
            ...prev,
            generatedPages: newPages,
            step: WizardStep.PREVIEW
        }));
      } catch (e) {
          console.error(e);
          alert("Oops, we had a little trouble writing the story. Please try again!");
      } finally {
          setIsLoading(false);
      }
  };

  const handleDownload = () => {
      window.print();
  };

  const handleVoiceInput = (text: string) => {
      setInactivityTimer(0);
      
      const appendText = (current: string, newText: string) => {
          const cleanNew = newText.trim();
          if (!cleanNew) return current;
          // Simple heuristic: if current doesn't end with space and new doesn't start with space/punctuation
          const needsSpace = current.length > 0 && !current.endsWith(' ') && !/^[.,!?;:]/.test(cleanNew);
          return current + (needsSpace ? " " : "") + cleanNew;
      };

      if (state.step === WizardStep.PLOT) {
          setState(prev => ({ 
              ...prev, 
              plotInput: appendText(prev.plotInput, text)
          }));
      } else {
          setTempInput(prev => appendText(prev, text));
      }
  };

  // --- Render Steps ---

  const renderAgeSelection = () => (
    <div className="text-center space-y-8 animate-fade-in">
      <h2 className="text-3xl font-bold text-kid-blue">{t.age_q}</h2>
      <div className="flex flex-col gap-4 max-w-sm mx-auto">
        {Object.values(AgeGroup).map(age => (
          <Button 
            key={age} 
            size="lg" 
            variant="secondary"
            onClick={() => setState(prev => ({ ...prev, ageGroup: age, step: WizardStep.CHARACTER }))}
          >
            {t.age_btn.replace('{age}', age)}
          </Button>
        ))}
      </div>
    </div>
  );

  const renderInputStep = (title: string, value: string | null, field: 'character' | 'place' | 'time', placeholder: string) => {
    const hasValue = state[field] !== null;
    const data = state[field];
    
    const imageUrl = (typeof data === 'object' && data !== null && 'imageUrl' in data) ? data.imageUrl : null;
    const displayValue = hasValue 
        ? (typeof data === 'string' ? data : data.description)
        : tempInput;

    return (
      <div className="flex flex-col items-center space-y-6 w-full max-w-4xl mx-auto">
        <h2 className="text-4xl font-bold text-kid-purple">{title}</h2>
        
        <div className="w-full relative min-h-[400px] flex flex-col items-center justify-center">
            
            {isLoading && (
               <div className="animate-bounce text-6xl">🎨</div>
            )}

            {!isLoading && imageUrl && (
                <div className="w-64 h-64 bg-white rounded-3xl border-4 border-kid-blue overflow-hidden shadow-lg mb-4">
                    <img src={imageUrl} alt="Selected" className="w-full h-full object-cover" />
                </div>
            )}

            {!isLoading && !hasValue && mode === 'options' && (
                <div className="w-full animate-fade-in">
                    <p className="text-xl font-bold text-kid-blue mb-6 text-center">{t.hint_idle}</p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {suggestedOptions.map((opt, idx) => (
                            <button 
                                key={idx}
                                onClick={() => handleSelection(opt.label, opt.imageUrl || undefined)}
                                className="bg-white p-4 rounded-3xl border-4 border-kid-yellow hover:border-kid-pink hover:scale-105 transition-all shadow-md flex flex-col items-center gap-3"
                            >
                                <div className="w-32 h-32 bg-gray-100 rounded-2xl overflow-hidden flex items-center justify-center">
                                    {opt.loading ? (
                                        <span className="text-2xl animate-spin">⏳</span>
                                    ) : opt.imageUrl ? (
                                        <img src={opt.imageUrl} className="w-full h-full object-cover" />
                                    ) : (
                                        <span className="text-4xl">✨</span>
                                    )}
                                </div>
                                <span className="font-bold text-gray-700">{opt.label}</span>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!isLoading && !hasValue && mode === 'confirmation' && autoSelectCandidate && (
                <div className="bg-white p-8 rounded-[3rem] border-8 border-kid-green shadow-2xl animate-bounce-in max-w-md w-full text-center">
                    <h3 className="text-2xl font-bold text-kid-purple mb-4">{t.hint_confirm}</h3>
                    <div className="w-48 h-48 mx-auto bg-gray-100 rounded-3xl overflow-hidden mb-4 border-4 border-gray-100">
                         {autoSelectCandidate.imageUrl ? (
                            <img src={autoSelectCandidate.imageUrl} className="w-full h-full object-cover" />
                         ) : (
                            <div className="w-full h-full flex items-center justify-center text-6xl">🤔</div>
                         )}
                    </div>
                    <p className="text-xl font-bold text-gray-700 mb-6">{autoSelectCandidate.label}</p>
                    <div className="flex gap-4 justify-center">
                        <Button variant="secondary" onClick={() => setMode('options')}>{common.no}</Button>
                        <Button variant="primary" icon={<Check />} onClick={() => handleSelection(autoSelectCandidate.label, autoSelectCandidate.imageUrl || undefined)}>
                            {common.yes}
                        </Button>
                    </div>
                </div>
            )}

            {!isLoading && !hasValue && mode === 'input' && (
               <div className="w-full max-w-xl text-center">
                   <div className="w-full h-64 bg-white/50 rounded-3xl border-4 border-dashed border-gray-300 flex items-center justify-center mb-8 p-4">
                       {tempInput ? (
                           <span className="text-3xl font-bold text-kid-blue break-words">{tempInput}</span>
                       ) : (
                           <span className="text-gray-400 font-bold text-xl">{t.input_idle}</span>
                       )}
                   </div>
               </div>
            )}

        </div>

        {!hasValue && mode !== 'confirmation' && (
             <div className="w-full max-w-xl space-y-4">
                <div className="flex gap-2">
                    <input 
                        type="text" 
                        placeholder={placeholder}
                        value={tempInput}
                        className="flex-1 p-4 rounded-2xl border-4 border-gray-300 text-xl focus:border-kid-pink outline-none"
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSelection(tempInput);
                        }}
                        onChange={(e) => {
                            setInactivityTimer(0);
                            setTempInput(e.target.value);
                        }}
                    />
                    <VoiceInput onTextReceived={handleVoiceInput} languageHint={language} />
                    
                    {tempInput && (
                         <Button variant="primary" icon={<Check />} onClick={() => handleSelection(tempInput)}>
                             {common.done}
                         </Button>
                    )}
                </div>
                <p className="text-gray-500 text-center">{t.voice_hint}</p>
             </div>
        )}

        {hasValue && (
            <div className="flex gap-4">
                <Button variant="outline" icon={<RefreshCw />} onClick={() => setState(prev => ({...prev, [field]: null}))}>
                    {t.btn_change}
                </Button>
                <Button variant="primary" icon={<ArrowRight />} size="lg" onClick={confirmStep}>
                    {t.btn_next}
                </Button>
            </div>
        )}
      </div>
    );
  };

  const renderPlotStep = () => (
      <div className="flex flex-col items-center space-y-6 max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-kid-green">{t.plot_q}</h2>
          
          <div className="flex gap-4 w-full">
            <div className="flex-1 bg-white p-4 rounded-2xl border-4 border-kid-green shadow-sm">
                <p className="text-gray-500 text-sm mb-2">Character: {state.character?.description}</p>
                <p className="text-gray-500 text-sm mb-2">Place: {state.place?.description}</p>
            </div>
          </div>

          <div className="w-full relative">
            <textarea 
                className="w-full h-40 p-4 rounded-2xl border-4 border-gray-300 text-xl focus:border-kid-green outline-none resize-none pb-16"
                placeholder={t.placeholder_plot}
                value={state.plotInput}
                onChange={(e) => setState(prev => ({...prev, plotInput: e.target.value}))}
            />
            <div className="absolute bottom-4 right-4">
                 <VoiceInput onTextReceived={handleVoiceInput} languageHint={language} />
            </div>
          </div>
          
          <Button 
            disabled={isLoading} 
            size="xl" 
            variant="primary" 
            icon={<Wand2 />} 
            onClick={generatePage}
          >
            {isLoading ? t.btn_creating : t.btn_magic}
          </Button>
      </div>
  );

  const renderPreview = () => (
      <div className="flex flex-col items-center space-y-6 w-full">
          <h2 className="text-4xl font-bold text-kid-pink">{t.preview_title}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
              <div className="aspect-square bg-gray-100 rounded-3xl overflow-hidden border-8 border-white shadow-xl relative">
                  <img 
                    src={state.generatedPages[0]?.imageUrl} 
                    alt="Story Page" 
                    className="w-full h-full object-cover"
                  />
                  {state.generatedPages.length > 1 && (
                      <div className="absolute bottom-4 right-4 bg-black/60 text-white px-3 py-1 rounded-full text-sm font-bold">
                          + {state.generatedPages.length - 1} more pages
                      </div>
                  )}
              </div>
              <div className="flex flex-col justify-center space-y-4">
                  <div className="bg-white p-6 rounded-3xl border-4 border-kid-yellow shadow-lg">
                      <p className="text-2xl font-comic leading-relaxed text-gray-700">
                          {state.generatedPages[0]?.text}
                      </p>
                  </div>
                  <Button variant="secondary" icon={<Volume2 />}>Read to me</Button>
              </div>
          </div>

          <div className="w-full max-w-4xl bg-white p-6 rounded-3xl border-4 border-kid-blue mt-8">
              <div className="flex flex-wrap gap-4 justify-center">
                  <Button variant="accent" icon={<Edit />} onClick={() => onFinish(state, 'edit')}>
                      {t.action_edit}
                  </Button>

                  <Button variant="primary" icon={<Save />} onClick={() => onFinish(state, 'save')}>
                      {t.action_save}
                  </Button>
                  
                  {user.role === UserRole.STUDENT && (
                      <Button variant="outline" icon={<Printer />} onClick={handleDownload}>
                          {t.action_print}
                      </Button>
                  )}
              </div>
          </div>
      </div>
  );

  return (
    <div className="min-h-screen p-4 pb-20 max-w-5xl mx-auto flex flex-col">
      <div className="flex items-center justify-between mb-4">
          <Button variant="outline" size="sm" onClick={onCancel}>{common.exit}</Button>
          <div className="flex items-center bg-white px-4 py-2 rounded-full border-4 border-kid-yellow shadow-sm">
              <Star className="text-kid-yellow fill-current mr-2" />
              <span className="font-bold text-xl text-kid-purple">{currentPoints} pts</span>
          </div>
      </div>

      {state.step > WizardStep.AGE_SELECTION && (
          <ProgressBar currentStep={state.step} totalSteps={6} />
      )}

      <div className="flex-1 flex flex-col justify-center">
        {state.step === WizardStep.AGE_SELECTION && renderAgeSelection()}
        {state.step === WizardStep.CHARACTER && renderInputStep(t.char_q, state.character?.description || null, 'character', t.placeholder_char)}
        {state.step === WizardStep.PLACE && renderInputStep(t.place_q, state.place?.description || null, 'place', t.placeholder_place)}
        {state.step === WizardStep.TIME && renderInputStep(t.time_q, state.time, 'time', t.placeholder_time)}
        {state.step === WizardStep.PLOT && renderPlotStep()}
        {state.step === WizardStep.PREVIEW && renderPreview()}
      </div>

      <BadgeNotification badge={newBadge} onClose={() => setNewBadge(null)} />
    </div>
  );
};