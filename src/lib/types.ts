export interface AdMedia {
  id: string;
  name: string;
  type: 'image' | 'gif' | 'video';
  url: string; // placeholder URL or actual URL from blob storage
  fileName: string;
  durationSeconds?: number; // For images/GIFs. Video duration is inherent.
  startTime?: string; // ISO date string, specific to this ad within the campaign
  endTime?: string; // ISO date string, specific to this ad within the campaign
}

export interface Campaign {
  id: string;
  name: string;
  startTime: string; // ISO date string for the whole campaign
  endTime: string; // ISO date string for the whole campaign
  ads: AdMedia[];
  assignedTvIds: string[];
}

export interface TV {
  id: string;
  name: string;
  description?: string;
  uniqueUrl?: string; // e.g., /tv/tv-lobby-1
}

// Utility type for form data
export type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};
