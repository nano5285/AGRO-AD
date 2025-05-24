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
      setError(`TV prijemnik s ID-om "${tvId}" nije pronađen.`);
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
          campaign.ads.forEach(ad => {
            const adStartTime = ad.startTime ? new Date(ad.startTime) : campaignStartTime;
            const adEndTime = ad.endTime ? new Date(ad.endTime) : campaignEndTime;
            
            const effectiveAdStartTime = new Date(Math.max(adStartTime.getTime(), campaignStartTime.getTime()));
            const effectiveAdEndTime = new Date(Math.min(adEndTime.getTime(), campaignEndTime.getTime()));

            if (now >= effectiveAdStartTime && now <= effectiveAdEndTime) {
              relevantAds.push({ ...ad, campaignName: campaign.name });
            }
          });
        }
      }
    });
    
    setActiveAdsQueue(relevantAds);
    setCurrentIndex(0); 
    if (relevantAds.length > 0) {
        setCurrentAd(relevantAds[0]);
    } else {
        setCurrentAd(null);
    }

  }, [tvId]);

  useEffect(() => {
    loadTVInfoAndAds();
    // Optional: const interval = setInterval(loadTVInfoAndAds, 60000); 
    // return () => clearInterval(interval);
  }, [loadTVInfoAndAds]);


  useEffect(() => {
    if (activeAdsQueue.length === 0 || !activeAdsQueue[currentIndex]) {
      setCurrentAd(null); 
      return;
    }

    const adToDisplay = activeAdsQueue[currentIndex];
    setCurrentAd(adToDisplay);

    const duration = adToDisplay.type === 'video' 
      ? 30000 
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
        <h1 className="text-4xl font-bold mb-2">Greška prikaza</h1>
        <p className="text-xl text-neutral-300">{error}</p>
        <p className="mt-4 text-sm">Molimo provjerite ID TV prijemnika ili kontaktirajte podršku.</p>
      </div>
    );
  }
  
  if (!tvInfo) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-800 text-white p-8">
        <Tv2 size={96} className="text-blue-500 mb-6 animate-pulse" />
        <h1 className="text-3xl font-bold">Inicijalizacija prikaza...</h1>
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
              objectFit="contain" 
              priority
              data-ai-hint={currentAd.dataAIHint || "advertisement"}
            />
          ) : currentAd.type === 'video' ? (
            <video
              src={currentAd.url}
              className="w-full h-full object-contain"
              autoPlay
              muted 
              loop 
              playsInline
              onError={(e) => console.error("Video greška:", e)}
            />
          ) : (
            <div className="text-white text-2xl">Nepodržana vrsta oglasa</div>
          )}
          {/* 
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-50 text-white p-2 text-xs">
            <p>TV: {tvInfo.name} (ID: {tvInfo.id})</p>
            <p>Kampanja: {currentAd.campaignName}</p>
            <p>Oglas: {currentAd.name} ({currentAd.type})</p>
          </div>
          */}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-white p-8">
            <Tv2 size={96} className="text-neutral-500 mb-6" />
            <h1 className="text-3xl font-bold mb-2">{tvInfo.name}</h1>
            <p className="text-xl text-neutral-400">Trenutno nema zakazanih oglasa za ovaj prikaz.</p>
            <p className="mt-2 text-sm text-neutral-500">Molimo provjerite rasporede kampanja ili kontaktirajte administratora.</p>
        </div>
      )}
    </div>
  );
}
