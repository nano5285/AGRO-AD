
export interface AdMedia {
  id: string;
  name: string;
  type: 'image' | 'gif' | 'video';
  url: string; 
  fileName: string;
  durationSeconds?: number; 
  startTime?: string; 
  endTime?: string; 
  dataAIHint?: string;
}

export interface Campaign {
  id: string;
  name: string;
  startTime: string; 
  endTime: string; 
  ads: AdMedia[];
  assignedTvIds: string[];
}

export interface TV {
  id: string;
  name: string;
  description?: string;
  uniqueUrl?: string; 
}

export interface User {
  id: string;
  username: string;
  role: 'admin' | 'user';
}

// Utility type for form data
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
