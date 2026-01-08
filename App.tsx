import React, { useState } from 'react';
import { Login } from './pages/Login';
import { StoryWizard } from './pages/StoryWizard';
import { Library } from './pages/Library';
import { StoryEditor } from './pages/StoryEditor';
import { StoryReader } from './pages/StoryReader';
import { User, Story, WizardState, Language } from './types';
import { Button } from './components/Button';
import { Plus, BookOpen, LogOut, Globe } from 'lucide-react';
import { translations } from './locales';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguage] = useState<Language>('en');
  const [view, setView] = useState<'dashboard' | 'create' | 'library' | 'editor' | 'read'>('dashboard');
  
  const [stories, setStories] = useState<Story[]>([]);
  const [currentStory, setCurrentStory] = useState<Story | null>(null);

  const t = translations[language];

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    setUser(null);
    setView('dashboard');
  };

  const cycleLanguage = () => {
      if (language === 'en') setLanguage('zh-CN');
      else if (language === 'zh-CN') setLanguage('zh-TW');
      else setLanguage('en');
  };

  const getLangLabel = () => {
      if (language === 'en') return 'EN';
      if (language === 'zh-CN') return '简';
      return '繁';
  }

  const handleWizardFinish = (data: WizardState, action: 'save' | 'edit') => {
    const newStory: Story = {
      id: Date.now().toString(),
      title: `${data.character?.description}'s Adventure`,
      coverImage: data.generatedPages[0]?.imageUrl || data.character?.imageUrl || '',
      authorId: user!.id,
      authorName: user!.name,
      ageGroup: data.ageGroup!,
      character: { 
          name: data.character?.description || '', 
          description: data.character?.description || '', 
          imageUrl: data.character?.imageUrl || '' 
      },
      place: { 
          name: data.place?.description || '', 
          description: data.place?.description || '', 
          imageUrl: data.place?.imageUrl || '' 
      },
      time: data.time || 'Once upon a time',
      pages: data.generatedPages,
      styling: {
          titleColor: '#7209B7',
          fontFamily: 'font-comic'
      },
      createdAt: Date.now(),
      language: language
    };

    setStories(prev => [newStory, ...prev]);

    if (action === 'edit') {
        setCurrentStory(newStory);
        setView('editor');
    } else {
        setView('dashboard');
    }
  };

  const handleEditStory = (story: Story) => {
      setCurrentStory(story);
      setView('editor');
  }

  const handleReadStory = (story: Story) => {
      setCurrentStory(story);
      setView('read');
  }

  const handleSaveEditor = (updatedStory: Story) => {
      setStories(prev => prev.map(s => s.id === updatedStory.id ? updatedStory : s));
      setCurrentStory(null);
      setView('library');
  }

  // --- View Routing ---

  // Language Switcher Component
  const LangSwitch = () => (
      <button 
        onClick={cycleLanguage}
        className="fixed top-4 right-4 z-50 bg-white border-2 border-kid-blue text-kid-blue font-bold rounded-full w-12 h-12 flex items-center justify-center shadow-md hover:scale-110 transition-transform"
      >
        {getLangLabel()}
      </button>
  );

  if (!user) {
    return (
        <>
            <LangSwitch />
            <Login onLogin={handleLogin} language={language} />
        </>
    );
  }

  if (view === 'create') {
    return (
      <StoryWizard 
        user={user} 
        onFinish={handleWizardFinish} 
        onCancel={() => setView('dashboard')} 
        language={language}
      />
    );
  }

  if (view === 'library') {
      return (
          <Library 
            stories={stories} 
            onEdit={handleEditStory} 
            onRead={handleReadStory} 
            onBack={() => setView('dashboard')}
            language={language}
          />
      )
  }

  if (view === 'editor' && currentStory) {
      return (
          <StoryEditor 
            story={currentStory} 
            onSave={handleSaveEditor} 
            onDiscard={() => setView('library')} 
            language={language}
          />
      )
  }

  if (view === 'read' && currentStory) {
      return (
          <StoryReader
            story={currentStory}
            onExit={() => setView('library')}
            language={language}
          />
      )
  }

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto font-sans">
      <LangSwitch />
      <header className="flex flex-col md:flex-row justify-between items-center mb-12 gap-4 animate-fade-in pt-8">
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-extrabold text-kid-purple mb-2">
            {t.dashboard.welcome.replace('{name}', user.name)}
          </h1>
          <p className="text-xl text-gray-600">{t.dashboard.subtitle}</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          onClick={handleLogout} 
          icon={<LogOut size={20}/>}
          className="bg-white"
        >
          {t.dashboard.logout}
        </Button>
      </header>

      <main className="grid grid-cols-1 md:grid-cols-2 gap-8 px-4 animate-slide-up">
        <button 
          onClick={() => setView('create')}
          className="group relative bg-white p-8 rounded-[3rem] border-8 border-kid-blue shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent to-kid-blue/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="bg-kid-blue/10 p-8 rounded-full mb-6 group-hover:bg-kid-blue/20 transition-colors">
            <Plus size={64} className="text-kid-blue" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3 group-hover:text-kid-blue transition-colors">
            {t.dashboard.create_title}
          </h2>
          <p className="text-gray-500 text-lg">
            {t.dashboard.create_desc}
          </p>
        </button>

        <button 
          onClick={() => setView('library')}
          className="group relative bg-white p-8 rounded-[3rem] border-8 border-kid-yellow shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300 flex flex-col items-center text-center overflow-hidden"
        >
           <div className="absolute inset-0 bg-gradient-to-b from-transparent to-kid-yellow/5 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="bg-kid-yellow/10 p-8 rounded-full mb-6 group-hover:bg-kid-yellow/20 transition-colors">
            <BookOpen size={64} className="text-kid-yellow" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800 mb-3 group-hover:text-yellow-600 transition-colors">
            {t.dashboard.library_title}
          </h2>
          <p className="text-gray-500 text-lg">
            {t.dashboard.library_desc}
          </p>
        </button>
      </main>
    </div>
  );
}