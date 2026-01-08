import React from 'react';
import { Badge } from '../types';

interface BadgeNotificationProps {
  badge: Badge | null;
  onClose: () => void;
}

export const BadgeNotification: React.FC<BadgeNotificationProps> = ({ badge, onClose }) => {
  if (!badge) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div className="bg-white p-8 rounded-[3rem] border-8 border-kid-yellow shadow-2xl flex flex-col items-center text-center max-w-sm mx-4 transform transition-all scale-100 hover:scale-105">
        <div className="text-8xl mb-4 animate-bounce">
          {badge.icon}
        </div>
        <h3 className="text-3xl font-extrabold text-kid-purple mb-2">New Badge!</h3>
        <p className="text-xl font-bold text-kid-blue mb-2">{badge.name}</p>
        <p className="text-gray-500 mb-6">{badge.description}</p>
        <button 
          onClick={onClose}
          className="bg-kid-green text-white px-8 py-3 rounded-full text-xl font-bold shadow-lg hover:bg-green-500 active:scale-95 transition-transform"
        >
          Awesome! 🌟
        </button>
      </div>
    </div>
  );
};