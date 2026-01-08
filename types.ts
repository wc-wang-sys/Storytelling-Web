export enum UserRole {
  STUDENT = 'Student',
  TEACHER = 'Teacher',
  TESTER = 'Tester'
}

export enum AgeGroup {
  TODDLER = '3-5',
  EARLY_READER = '5-7',
  PRE_TEEN = '8-10'
}

export type Language = 'en' | 'zh-CN' | 'zh-TW';

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
}

export interface User {
  id: string;
  name: string;
  role: UserRole;
  points: number;
  badges: Badge[];
}

export interface StoryPage {
  text: string;
  imageUrl: string;
  imagePrompt?: string; // Added to help with regeneration
  audioBase64?: string;
}

export interface StoryStyling {
  titleColor: string;
  fontFamily: 'font-sans' | 'font-serif' | 'font-mono' | 'font-comic';
}

export interface Story {
  id: string;
  title: string;
  coverImage: string;
  authorId: string;
  authorName: string;
  ageGroup: AgeGroup;
  character: { name: string; description: string; imageUrl: string };
  place: { name: string; description: string; imageUrl: string };
  time: string;
  pages: StoryPage[];
  styling: StoryStyling;
  createdAt: number;
  language: Language; // Track language of the story
}

export enum WizardStep {
  AGE_SELECTION = 0,
  CHARACTER = 1,
  PLACE = 2,
  TIME = 3,
  PLOT = 4,
  PREVIEW = 5
}

export interface WizardState {
  step: WizardStep;
  ageGroup: AgeGroup | null;
  character: { description: string; imageUrl: string } | null;
  place: { description: string; imageUrl: string } | null;
  time: string | null;
  plotInput: string;
  generatedPages: StoryPage[];
}