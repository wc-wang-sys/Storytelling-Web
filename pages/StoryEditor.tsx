import React, { useState } from 'react';
import { Story, StoryPage } from '../types';
import { Button } from '../components/Button';
import { generateImage, generateText } from '../services/geminiService';
import { Save, X, RefreshCw, Type, Palette, Image as ImageIcon, LayoutTemplate } from 'lucide-react';

interface StoryEditorProps {
  story: Story;
  onSave: (updatedStory: Story) => void;
  onDiscard: () => void;
}

type EditorTab = 'cover' | 'content';

export const StoryEditor: React.FC<StoryEditorProps> = ({ story, onSave, onDiscard }) => {
  const [editedStory, setEditedStory] = useState<Story>({ ...story });
  const [activeTab, setActiveTab] = useState<EditorTab>('cover');
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // --- Cover Editing Functions ---

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedStory(prev => ({ ...prev, title: e.target.value }));
  };

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditedStory(prev => ({ 
        ...prev, 
        styling: { ...prev.styling, titleColor: e.target.value } 
    }));
  };

  const handleFontChange = (font: any) => {
    setEditedStory(prev => ({ 
        ...prev, 
        styling: { ...prev.styling, fontFamily: font } 
    }));
  };

  const regenerateCoverImage = async () => {
    setIsRegenerating(true);
    try {
        const prompt = `Children's book cover for a story about ${editedStory.character.description} in ${editedStory.place.description}. Title: ${editedStory.title}. Colorful, inviting.`;
        const newUrl = await generateImage(prompt);
        
        setEditedStory(prev => {
            // Create a copy of pages to update the first page
            const newPages = prev.pages.map(p => ({...p}));
            
            // Sync: Update page 1 (index 0) to match the new cover
            if (newPages.length > 0) {
                newPages[0].imageUrl = newUrl;
            }
            
            return { ...prev, coverImage: newUrl, pages: newPages };
        });
    } catch (e) {
        alert("Could not regenerate cover.");
    } finally {
        setIsRegenerating(false);
    }
  };

  // --- Content Editing Functions ---

  const handlePageTextChange = (text: string) => {
      const newPages = [...editedStory.pages];
      newPages[currentPageIndex] = { ...newPages[currentPageIndex], text: text };
      setEditedStory(prev => ({ ...prev, pages: newPages }));
  };

  const regeneratePageImage = async () => {
    setIsRegenerating(true);
    const page = editedStory.pages[currentPageIndex];
    try {
        const prompt = page.imagePrompt || `Illustration for: ${page.text}`;
        const newUrl = await generateImage(prompt);
        
        setEditedStory(prev => {
            // Update the specific page image
            const newPages = prev.pages.map((p, idx) => {
                if (idx === currentPageIndex) {
                    return { ...p, imageUrl: newUrl };
                }
                return p;
            });

            const updates: Partial<Story> = { pages: newPages };

            // Sync: If we are editing the first page (index 0), update the cover image too
            if (currentPageIndex === 0) {
                updates.coverImage = newUrl;
            }

            return { ...prev, ...updates };
        });
    } catch (e) {
        alert("Could not regenerate image.");
    } finally {
        setIsRegenerating(false);
    }
  };

  const regeneratePageText = async () => {
    setIsRegenerating(true);
    const page = editedStory.pages[currentPageIndex];
    try {
        const newText = await generateText(`Rewrite this slightly for a ${editedStory.ageGroup} year old: "${page.text}"`, editedStory.ageGroup);
        
        setEditedStory(prev => {
             const newPages = [...prev.pages];
             newPages[currentPageIndex] = { ...newPages[currentPageIndex], text: newText };
             return { ...prev, pages: newPages };
        });
    } catch (e) {
        alert("Could not rewrite text.");
    } finally {
        setIsRegenerating(false);
    }
  }

  // --- Render Helpers ---

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Top Toolbar */}
      <header className="bg-white border-b-4 border-kid-blue p-4 flex justify-between items-center sticky top-0 z-50 shadow-sm">
        <h2 className="text-2xl font-extrabold text-kid-purple flex items-center gap-2">
            <LayoutTemplate /> Editing Mode
        </h2>
        <div className="flex gap-4">
            <Button variant="outline" onClick={onDiscard} icon={<X />}>Discard Changes</Button>
            <Button variant="primary" onClick={() => onSave(editedStory)} icon={<Save />}>Save and Exit</Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-white border-r border-gray-200 flex flex-col p-4 overflow-y-auto">
            <div className="mb-6">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Sections</h3>
                <button 
                    onClick={() => setActiveTab('cover')}
                    className={`w-full text-left p-3 rounded-xl font-bold mb-2 transition-colors ${activeTab === 'cover' ? 'bg-kid-blue text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                    Book Cover
                </button>
                <button 
                    onClick={() => setActiveTab('content')}
                    className={`w-full text-left p-3 rounded-xl font-bold transition-colors ${activeTab === 'content' ? 'bg-kid-blue text-white' : 'hover:bg-gray-100 text-gray-600'}`}
                >
                    Story Pages
                </button>
            </div>

            {activeTab === 'content' && (
                <div>
                     <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-2">Pages</h3>
                     <div className="space-y-2">
                        {editedStory.pages.map((p, idx) => (
                            <button
                                key={idx}
                                onClick={() => setCurrentPageIndex(idx)}
                                className={`w-full p-2 rounded-lg border-2 flex items-center gap-2 ${currentPageIndex === idx ? 'border-kid-pink bg-pink-50' : 'border-gray-100 hover:border-gray-300'}`}
                            >
                                <div className="w-8 h-8 rounded bg-gray-200 overflow-hidden flex-shrink-0">
                                    <img src={p.imageUrl} className="w-full h-full object-cover" />
                                </div>
                                <span className="text-xs font-bold truncate">Page {idx + 1}</span>
                            </button>
                        ))}
                     </div>
                </div>
            )}
        </aside>

        {/* Main Editor Area */}
        <main className="flex-1 p-8 overflow-y-auto bg-gray-50 flex justify-center">
            
            {/* --- COVER EDITOR --- */}
            {activeTab === 'cover' && (
                <div className="w-full max-w-2xl bg-white rounded-[2rem] shadow-xl overflow-hidden border-8 border-white animate-fade-in">
                    <div className="relative h-96 group">
                        <img src={editedStory.coverImage} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button 
                                onClick={regenerateCoverImage} 
                                icon={isRegenerating ? <RefreshCw className="animate-spin"/> : <RefreshCw />} 
                                variant="secondary"
                                disabled={isRegenerating}
                            >
                                {isRegenerating ? "Creating..." : "Redraw Picture"}
                            </Button>
                        </div>
                    </div>
                    <div className="p-8 space-y-6">
                        <div>
                            <label className="block text-gray-500 font-bold mb-2 text-sm uppercase">Story Title</label>
                            <input 
                                value={editedStory.title}
                                onChange={handleTitleChange}
                                className={`w-full text-3xl font-bold border-b-4 border-gray-200 focus:border-kid-blue outline-none py-2 ${editedStory.styling.fontFamily}`}
                                style={{ color: editedStory.styling.titleColor }}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-8">
                            <div>
                                <label className="block text-gray-500 font-bold mb-2 text-sm uppercase flex items-center gap-2">
                                    <Palette size={16}/> Title Color
                                </label>
                                <div className="flex items-center gap-3">
                                    <input 
                                        type="color" 
                                        value={editedStory.styling.titleColor}
                                        onChange={handleColorChange}
                                        className="w-12 h-12 rounded-full cursor-pointer border-none"
                                    />
                                    <span className="text-gray-400 font-mono">{editedStory.styling.titleColor}</span>
                                </div>
                            </div>
                            <div>
                                <label className="block text-gray-500 font-bold mb-2 text-sm uppercase flex items-center gap-2">
                                    <Type size={16}/> Font Style
                                </label>
                                <div className="flex gap-2">
                                    {['font-sans', 'font-serif', 'font-comic'].map(f => (
                                        <button
                                            key={f}
                                            onClick={() => handleFontChange(f)}
                                            className={`w-10 h-10 rounded-lg border-2 flex items-center justify-center text-xl ${f} ${editedStory.styling.fontFamily === f ? 'border-kid-blue bg-blue-50 text-kid-blue' : 'border-gray-200'}`}
                                        >
                                            Aa
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- PAGE CONTENT EDITOR --- */}
            {activeTab === 'content' && (
                <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8 items-start animate-fade-in">
                    {/* Visual Side */}
                    <div className="flex-1 w-full relative group">
                         <div className="aspect-square bg-white rounded-3xl border-8 border-white shadow-lg overflow-hidden relative">
                             <img src={editedStory.pages[currentPageIndex].imageUrl} className="w-full h-full object-cover" />
                             {isRegenerating && <div className="absolute inset-0 bg-white/80 flex items-center justify-center"><RefreshCw className="animate-spin text-kid-blue" size={48}/></div>}
                         </div>
                         <div className="mt-4 flex justify-center">
                            <Button size="sm" variant="secondary" onClick={regeneratePageImage} icon={<ImageIcon />} disabled={isRegenerating}>
                                {isRegenerating ? "Drawing..." : "Redraw Picture"}
                            </Button>
                         </div>
                    </div>

                    {/* Text Side */}
                    <div className="flex-1 w-full bg-white p-6 rounded-3xl border-4 border-kid-yellow shadow-sm">
                        <label className="block text-gray-500 font-bold mb-2 text-sm uppercase">Story Text</label>
                        <textarea 
                            className="w-full h-48 p-4 text-xl leading-relaxed font-comic border-2 border-dashed border-gray-300 rounded-xl focus:border-kid-yellow outline-none resize-none"
                            value={editedStory.pages[currentPageIndex].text}
                            onChange={(e) => handlePageTextChange(e.target.value)}
                        />
                         <div className="mt-4 flex justify-end">
                            <Button size="sm" variant="outline" onClick={regeneratePageText} icon={<RefreshCw />} disabled={isRegenerating}>
                                {isRegenerating ? "Writing..." : "Rewrite Text"}
                            </Button>
                         </div>
                    </div>
                </div>
            )}

        </main>
      </div>
    </div>
  );
};