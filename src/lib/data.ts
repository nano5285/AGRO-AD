import type { TV, Campaign, AdMedia } from './types';

let tvs: TV[] = [
  { id: 'tv1', name: 'Lobby TV', description: 'Main television in the lobby area.', uniqueUrl: '/tv/tv1' },
  { id: 'tv2', name: 'Reception Screen', description: 'Screen at the reception desk.', uniqueUrl: '/tv/tv2' },
  { id: 'tv3', name: 'Cafeteria Display', description: 'Display in the main cafeteria.', uniqueUrl: '/tv/tv3' },
];

let campaigns: Campaign[] = [
  {
    id: 'campaign1',
    name: 'Summer Sale 2024',
    startTime: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(), // Active for the past week
    endTime: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),   // Active for the next week
    ads: [
      { id: 'ad1-1', name: 'Summer Discount Poster', type: 'image', url: 'https://placehold.co/1920x1080.png', fileName: 'summer_poster.png', durationSeconds: 10, dataAIHint: 'summer sale' },
      { id: 'ad1-2', name: 'Beach Getaway Video', type: 'video', url: 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4', fileName: 'beach_video.mp4', dataAIHint: 'beach vacation' },
      { id: 'ad1-3', name: 'Ice Cream GIF', type: 'gif', url: 'https://placehold.co/1920x1080.gif', fileName: 'ice_cream.gif', durationSeconds: 5, dataAIHint: 'ice cream' },
    ],
    assignedTvIds: ['tv1', 'tv2'],
  },
  {
    id: 'campaign2',
    name: 'New Product Launch',
    startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(), // Starts tomorrow
    endTime: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),  // Ends in two weeks
    ads: [
      { id: 'ad2-1', name: 'Product Teaser', type: 'image', url: 'https://placehold.co/1920x1080.png', fileName: 'product_teaser.png', durationSeconds: 15, dataAIHint: 'product launch' },
    ],
    assignedTvIds: ['tv3'],
  },
];

// TV Management Functions
export const getTVs = (): TV[] => [...tvs];
export const getTVById = (id: string): TV | undefined => tvs.find(tv => tv.id === id);
export const addTV = (tv: Omit<TV, 'id' | 'uniqueUrl'>): TV => {
  const newId = `tv${tvs.length + 1}_${Date.now()}`;
  const newTV: TV = { ...tv, id: newId, uniqueUrl: `/tv/${newId}` };
  tvs = [...tvs, newTV];
  return newTV;
};
export const updateTV = (updatedTV: TV): TV | undefined => {
  const index = tvs.findIndex(tv => tv.id === updatedTV.id);
  if (index !== -1) {
    tvs[index] = updatedTV;
    return tvs[index];
  }
  return undefined;
};
export const deleteTV = (id: string): boolean => {
  const initialLength = tvs.length;
  tvs = tvs.filter(tv => tv.id !== id);
  campaigns = campaigns.map(c => ({
    ...c,
    assignedTvIds: c.assignedTvIds.filter(tvId => tvId !== id)
  }));
  return tvs.length < initialLength;
};


// Campaign Management Functions
export const getCampaigns = (): Campaign[] => [...campaigns];
export const getCampaignById = (id: string): Campaign | undefined => campaigns.find(c => c.id === id);

export const addCampaign = (campaign: Omit<Campaign, 'id' | 'ads' | 'assignedTvIds'>): Campaign => {
  const newCampaign: Campaign = {
    ...campaign,
    id: `campaign${campaigns.length + 1}_${Date.now()}`,
    ads: [],
    assignedTvIds: [],
  };
  campaigns = [...campaigns, newCampaign];
  return newCampaign;
};

export const updateCampaign = (updatedCampaign: Campaign): Campaign | undefined => {
  const index = campaigns.findIndex(c => c.id === updatedCampaign.id);
  if (index !== -1) {
    campaigns[index] = updatedCampaign;
    return campaigns[index];
  }
  return undefined;
};

export const deleteCampaign = (id: string): boolean => {
  const initialLength = campaigns.length;
  campaigns = campaigns.filter(c => c.id !== id);
  return campaigns.length < initialLength;
};

// Ad Media Management (within a campaign)
export const addAdToCampaign = (campaignId: string, ad: Omit<AdMedia, 'id'>): AdMedia | undefined => {
  const campaign = getCampaignById(campaignId);
  if (!campaign) return undefined;
  const newAd: AdMedia = { ...ad, id: `ad${campaign.ads.length + 1}_${Date.now()}` };
  campaign.ads.push(newAd);
  updateCampaign(campaign); // Persist changes
  return newAd;
};

export const updateAdInCampaign = (campaignId: string, updatedAd: AdMedia): AdMedia | undefined => {
  const campaign = getCampaignById(campaignId);
  if (!campaign) return undefined;
  const adIndex = campaign.ads.findIndex(ad => ad.id === updatedAd.id);
  if (adIndex !== -1) {
    campaign.ads[adIndex] = updatedAd;
    updateCampaign(campaign); // Persist changes
    return campaign.ads[adIndex];
  }
  return undefined;
};

export const deleteAdFromCampaign = (campaignId: string, adId: string): boolean => {
  const campaign = getCampaignById(campaignId);
  if (!campaign) return false;
  const initialAdsLength = campaign.ads.length;
  campaign.ads = campaign.ads.filter(ad => ad.id !== adId);
  if (campaign.ads.length < initialAdsLength) {
    updateCampaign(campaign); // Persist changes
    return true;
  }
  return false;
};

// Scheduling and Conflict
export const assignCampaignToTV = (campaignId: string, tvId: string): boolean => {
  const campaign = getCampaignById(campaignId);
  const tv = getTVById(tvId);
  if (!campaign || !tv) return false;

  if (!campaign.assignedTvIds.includes(tvId)) {
    campaign.assignedTvIds.push(tvId);
    updateCampaign(campaign);
    return true;
  }
  return false; // Already assigned
};

export const unassignCampaignFromTV = (campaignId: string, tvId: string): boolean => {
  const campaign = getCampaignById(campaignId);
  if (!campaign) return false;

  const initialLength = campaign.assignedTvIds.length;
  campaign.assignedTvIds = campaign.assignedTvIds.filter(id => id !== tvId);
  if (campaign.assignedTvIds.length < initialLength) {
    updateCampaign(campaign);
    return true;
  }
  return false;
};


// This is a simplified conflict check. A real implementation would be more robust.
export const hasConflict = (tvId: string, newCampaign: Campaign): Campaign | null => {
  const tvCampaigns = campaigns.filter(c => c.assignedTvIds.includes(tvId) && c.id !== newCampaign.id);
  const newStartTime = new Date(newCampaign.startTime).getTime();
  const newEndTime = new Date(newCampaign.endTime).getTime();

  for (const existingCampaign of tvCampaigns) {
    const existingStartTime = new Date(existingCampaign.startTime).getTime();
    const existingEndTime = new Date(existingCampaign.endTime).getTime();

    // Check for overlap: (StartA <= EndB) and (EndA >= StartB)
    if (newStartTime < existingEndTime && newEndTime > existingStartTime) {
      return existingCampaign; // Conflict found
    }
  }
  return null; // No conflict
};
