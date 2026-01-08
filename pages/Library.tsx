import React from 'react';
import { Story } from '../types';
import { Button } from '../components/Button';
import { Edit, BookOpen, Trash2, ArrowLeft } from 'lucide-react';

interface LibraryProps {
  stories: Story[];
  onEdit: (story: Story) => void;
  onRead: (story: Story) => void;
  onBack: () => void;
}

export const Library: React.FC<LibraryProps> = ({ stories, onEdit, onRead, onBack }) => {
  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center mb-8 gap-4">
        <Button variant="outline" size="sm" onClick={onBack} icon={<ArrowLeft />}>Back</Button>
        <h1 className="text-4xl font-extrabold text-kid-purple">My E-Book Library 📚</h1>
      </div>

      {stories.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-[3rem] border-4 border-dashed border-gray-300">
          <p className="text-2xl text-gray-400 font-bold mb-4">No stories yet!</p>
          <p className="text-gray-500">Go create your first magical adventure.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {stories.map(story => (
            <div key={story.id} className="bg-white rounded-3xl shadow-xl overflow-hidden border-4 border-gray-100 hover:border-kid-blue transition-all hover:scale-105 group">
              <div className="h-48 overflow-hidden relative bg-gray-100">
                <img src={story.coverImage} alt={story.title} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
              </div>
              <div className="p-6">
                <h3 
                    className={`text-2xl font-bold mb-2 truncate ${story.styling.fontFamily}`} 
                    style={{ color: story.styling.titleColor }}
                >
                    {story.title}
                </h3>
                <p className="text-gray-500 text-sm mb-4">By {story.authorName} • {new Date(story.createdAt).toLocaleDateString()}</p>
                
                <div className="flex gap-2">
                  <Button 
                    className="flex-1" 
                    variant="primary" 
                    size="sm" 
                    onClick={() => onRead(story)}
                    icon={<BookOpen size={16} />}
                  >
                    Read
                  </Button>
                  <Button 
                    className="flex-1" 
                    variant="secondary" 
                    size="sm" 
                    onClick={() => onEdit(story)}
                    icon={<Edit size={16} />}
                  >
                    Edit
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};