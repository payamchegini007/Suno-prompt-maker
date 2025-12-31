
export interface Variation {
  style: string;
  description: string;
  lyrics: string;
}

export interface GeneratedPrompt {
  id: string;
  timestamp: number;
  input: {
    description: string;
    genre: string;
    mood: string;
    vocals: string;
  };
  variations: Variation[];
}

export interface PromptFormData {
  description: string;
  genre: string;
  mood: string;
  vocals: string;
}

export enum VocalType {
  MALE = 'Male',
  FEMALE = 'Female',
  DUET = 'Duet',
  INSTRUMENTAL = 'Instrumental',
  ANY = 'Any/None'
}
