import React from 'react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({ currentStep, totalSteps }) => {
  const percentage = Math.min(100, Math.max(0, ((currentStep + 1) / totalSteps) * 100));

  return (
    <div className="w-full max-w-xl mx-auto mb-6">
      <div className="flex justify-between text-sm font-bold text-kid-blue mb-1">
        <span>Start</span>
        <span>Finish!</span>
      </div>
      <div className="h-6 w-full bg-gray-200 rounded-full border-2 border-white shadow-inner overflow-hidden relative">
        <div 
          className="h-full bg-gradient-to-r from-kid-green to-kid-yellow transition-all duration-500 ease-out rounded-full"
          style={{ width: `${percentage}%` }}
        >
            <div className="absolute right-0 top-0 bottom-0 w-full h-full animate-pulse bg-white/20"></div>
        </div>
      </div>
    </div>
  );
};