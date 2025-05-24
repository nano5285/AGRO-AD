'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { Campaign, AdMedia, TV } from '@/lib/types';
import { getCampaigns, getTVById } from '@/lib/data';
import { WifiOff, Tv2 } from 'lucide-react';

interface CurrentAd extends AdMedia {
  campaignName: string;
}

export default function TVDisplayPage() {
  const params = useParams();
  const tvId = params.tvId as string;

  const [currentAd, setCurrentAd] = useState<CurrentAd | null>(null);
  const [tvInfo, setTvInfo] = useState<TV | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [activeAdsQueue, setActiveAdsQueue] = useState<CurrentAd[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const loadTVInfoAndAds = useCallback(() => {
    const tv = getTVById(tvId);
    if (!tv) {
      setError(`TV with ID "${tvId}" not found.`);
      setTvInfo(null);
      setActiveAdsQueue([]);
      return;
    }
    setTvInfo(tv);
    setError(null);

    const allCampaigns = getCampaigns();
    const now = new Date();

    const relevantAds: CurrentAd[] = [];
    allCampaigns.forEach(campaign => {
      if (campaign.assignedTvIds.includes(tvId)) {
        const campaignStartTime = new Date(campaign.startTime);
        const campaignEndTime = new Date(campaign.endTime);

        if (now >= campaignStartTime && now <= campaignEndTime) {
          // Campaign is active
          campaign.ads.forEach(ad => {
            const adStartTime = ad.startTime ? new Date(ad.startTime) : campaignStartTime;
            const adEndTime = ad.endTime ? new Date(ad.endTime) : campaignEndTime;
            
            // Ensure ad times are within campaign times
            const effectiveAdStartTime = new Date(Math.max(adStartTime.getTime(), campaignStartTime.getTime()));
            const effectiveAdEndTime = new Date(Math.min(adEndTime.getTime(), campaignEndTime.getTime()));

            if (now >= effectiveAdStartTime && now <= effectiveAdEndTime) {
              relevantAds.push({ ...ad, campaignName: campaign.name });
            }
          });
        }
      }
    });
    
    // Sort ads by some logic if needed, e.g., by campaign, then by ad order. For now, keep as is.
    setActiveAdsQueue(relevantAds);
    setCurrentIndex(0); // Reset index when ads are reloaded
    if (relevantAds.length > 0) {
        setCurrentAd(relevantAds[0]);
    } else {
        setCurrentAd(null);
    }

  }, [tvId]);

  useEffect(() => {
    loadTVInfoAndAds();
    // Optional: Reload ads periodically if schedules might change frequently
    // const interval = setInterval(loadTVInfoAndAds, 60000); // every minute
    // return () => clearInterval(interval);
  }, [loadTVInfoAndAds]);


  useEffect(() => {
    if (activeAdsQueue.length === 0 || !activeAdsQueue[currentIndex]) {
      setCurrentAd(null); // No ads to display or index out of bounds
      return;
    }

    const adToDisplay = activeAdsQueue[currentIndex];
    setCurrentAd(adToDisplay);

    const duration = adToDisplay.type === 'video' 
      ? 30000 // Placeholder for video actual duration; a real video player would handle this
      : (adToDisplay.durationSeconds || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % activeAdsQueue.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, activeAdsQueue]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-800 text-white p-8">
        <WifiOff size={96} className="text-red-500 mb-6" />
        <h1 className="text-4xl font-bold mb-2">Display Error</h1>
        <p className="text-xl text-neutral-300">{error}</p>
        <p className="mt-4 text-sm">Please check the TV ID or contact support.</p>
      </div>
    );
  }
  
  if (!tvInfo) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-800 text-white p-8">
        <Tv2 size={96} className="text-blue-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold">Initializing Display...</h1>
      </div>
    );
  }


  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black flex items-center justify-center">
      {currentAd ? (
        <>
          {currentAd.type === 'image' || currentAd.type === 'gif' ? (
            <Image
              src={currentAd.url}
              alt={currentAd.name}
              layout="fill"
              objectFit="contain" // Or "cover" depending on desired behavior
              priority
              data-ai-hint={currentAd.dataAIHint || "advertisement"}
            />
          ) : currentAd.type === 'video' ? (
            <video
              src={currentAd.url}
              className="w-full h-full object-contain"
              autoPlay
              muted // Important for autoplay in browsers
              loop // For single video campaigns or if desired
              playsInline
              onError={(e) => console.error("Video error:", e)}
            />
          ) : (
            <div className="text-white text-2xl">Unsupported ad type</div>
          )}
          {/* Optional: Display ad info overlay
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white p-2 text-xs">
            <p>TV: {tvInfo.name} (ID: {tvInfo.id})</p>
            <p>Campaign: {currentAd.campaignName}</p>
            <p>Ad: {currentAd.name} ({currentAd.type})</p>
          </div>
          */}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-white p-8">
            <Tv2 size={96} className="text-neutral-500 mb-6" />
            <h1 className="text-3xl font-bold mb-2">{tvInfo.name}</h1>
            <p className="text-xl text-neutral-400">No advertisements currently scheduled for this display.</p>
            <p className="mt-2 text-sm text-neutral-500">Please check campaign schedules or contact an administrator.</p>
        </div>
      )}
    </div>
  );
}
