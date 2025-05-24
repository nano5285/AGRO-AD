'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import type { Campaign, AdMedia, TV } from '@/lib/types';
import { getCampaigns, getTVById } from '@/lib/data';
import { WifiOff, Tv2, RefreshCw } from 'lucide-react'; // Dodana ikona RefreshCw
import { Button } from '@/components/ui/button'; // Dodan import za Button

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
  const [isLoading, setIsLoading] = useState(true);

  const loadTVInfoAndAds = useCallback(async (showLoadingIndicator = true) => {
    if (showLoadingIndicator) setIsLoading(true);
    setError(null); // Resetiraj grešku prije novog pokušaja

    try {
      const tv = await getTVById(tvId);
      if (!tv) {
        setError(`TV prijemnik s ID-om "${tvId}" nije pronađen.`);
        setTvInfo(null);
        setActiveAdsQueue([]);
        setCurrentAd(null);
        setIsLoading(false);
        return;
      }
      setTvInfo(tv);

      const allCampaigns = await getCampaigns();
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
      
      // Sortiraj oglase, npr. po nazivu ili ID-u za konzistentan redoslijed
      relevantAds.sort((a, b) => (a.name > b.name ? 1 : -1));
      
      setActiveAdsQueue(relevantAds);
      setCurrentIndex(0); 
      if (relevantAds.length > 0) {
          setCurrentAd(relevantAds[0]);
      } else {
          setCurrentAd(null);
      }
    } catch (e: any) {
        console.error("Greška pri dohvaćanju podataka za TV prikaz:", e);
        setError(`Greška pri dohvaćanju podataka: ${e.message || "Nepoznata greška"}`);
        setTvInfo(null); // Postavi tvInfo na null u slučaju greške
        setActiveAdsQueue([]);
        setCurrentAd(null);
    } finally {
        if (showLoadingIndicator) setIsLoading(false);
    }
  }, [tvId]);

  useEffect(() => {
    loadTVInfoAndAds();
    // Osvježavanje podataka svakih 60 sekundi
    const interval = setInterval(() => loadTVInfoAndAds(false), 60000); 
    return () => clearInterval(interval);
  }, [loadTVInfoAndAds]);


  useEffect(() => {
    if (activeAdsQueue.length === 0) {
      setCurrentAd(null); 
      return;
    }
    
    // Osiguraj da je currentIndex unutar granica
    const validIndex = currentIndex % activeAdsQueue.length;
    const adToDisplay = activeAdsQueue[validIndex];
    
    if (!adToDisplay) { // Dodatna provjera ako je redoslijed prazan ili indeks nevažeći
        setCurrentAd(null);
        return;
    }

    setCurrentAd(adToDisplay);

    const duration = adToDisplay.type === 'video' 
      ? 30000 // TODO: Dohvatiti stvarno trajanje videa ako je moguće
      : (adToDisplay.durationSeconds || 10) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex(prevIndex => (prevIndex + 1) % activeAdsQueue.length);
    }, duration);

    return () => clearTimeout(timer);
  }, [currentIndex, activeAdsQueue]);

  if (isLoading) {
    return (
     <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-8">
       <Tv2 size={96} className="text-blue-500 mb-6 animate-pulse" />
       <h1 className="text-3xl font-bold">Inicijalizacija prikaza...</h1>
       <p className="text-lg mt-2">Molimo pričekajte.</p>
     </div>
   );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-800 text-white p-8">
        <WifiOff size={96} className="text-red-500 mb-6" />
        <h1 className="text-4xl font-bold mb-2">Greška prikaza</h1>
        <p className="text-xl text-neutral-300 text-center">{error}</p>
        <p className="mt-4 text-sm">Molimo provjerite ID TV prijemnika ili kontaktirajte podršku.</p>
        <Button onClick={() => loadTVInfoAndAds(true)} variant="outline" className="mt-6 text-neutral-800">
            <RefreshCw className="mr-2 h-4 w-4" /> Pokušaj ponovno
        </Button>
      </div>
    );
  }
  
  if (!tvInfo) { // Ovo stanje se može dogoditi ako TV nije pronađen, ali nije greška dohvaćanja
     return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-neutral-900 text-white p-8">
        <Tv2 size={96} className="text-neutral-500 mb-6" />
        <h1 className="text-3xl font-bold">TV prijemnik nije konfiguriran</h1>
        <p className="text-lg mt-2">Provjerite je li ID TV prijemnika "{tvId}" ispravan.</p>
         <Button onClick={() => loadTVInfoAndAds(true)} variant="outline" className="mt-6 text-neutral-800">
            <RefreshCw className="mr-2 h-4 w-4" /> Osvježi
        </Button>
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
              unoptimized={currentAd.type === 'gif'} // Za GIF-ove da se ne optimiziraju (ako next/image to radi)
              onError={(e) => {
                console.error("Greška pri učitavanju slike/gifa:", currentAd.url, e);
                // Opcionalno: prikaži placeholder ili poruku o grešci za ovaj oglas
              }}
            />
          ) : currentAd.type === 'video' ? (
            <video
              key={currentAd.id} // Key da se video ponovno učita ako se URL promijeni za isti ID (malo vjerojatno ali sigurno)
              src={currentAd.url}
              className="w-full h-full object-contain"
              autoPlay
              muted 
              loop // Većina kratkih video oglasa se vrti u petlji
              playsInline // Važno za iOS
              onError={(e) => {
                console.error("Video greška:", currentAd.url, e);
                 // Opcionalno: prikaži placeholder ili poruku o grešci
              }}
            />
          ) : (
            <div className="text-white text-2xl">Nepodržana vrsta oglasa: {currentAd.type}</div>
          )}
          {/* 
          Sakriveni debug info, može se omogućiti po potrebi
          <div className="absolute bottom-0 left-0 bg-black bg-opacity-70 text-white p-2 text-xs z-10">
            <p>TV: {tvInfo.name} (ID: {tvInfo.id})</p>
            <p>Kampanja: {currentAd.campaignName}</p>
            <p>Oglas: {currentAd.name} ({currentAd.type}, ID: {currentAd.id})</p>
            <p>URL: {currentAd.url}</p>
            <p>Redoslijed: {currentIndex + 1}/{activeAdsQueue.length}</p>
          </div>
          */}
        </>
      ) : (
        <div className="flex flex-col items-center justify-center text-white p-8 text-center">
            <Tv2 size={96} className="text-neutral-500 mb-6" />
            <h1 className="text-3xl font-bold mb-2">{tvInfo.name}</h1>
            <p className="text-xl text-neutral-400">Trenutno nema zakazanih oglasa za ovaj prikaz.</p>
            <p className="mt-2 text-sm text-neutral-500">Molimo provjerite rasporede kampanja ili kontaktirajte administratora.</p>
            <Button onClick={() => loadTVInfoAndAds(false)} variant="outline" className="mt-8 text-neutral-800">
                <RefreshCw className="mr-2 h-4 w-4" /> Osvježi oglase
            </Button>
        </div>
      )}
    </div>
  );
}
