
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea'; // Iako se ne koristi direktno, može zatrebati
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { campaignEditPageSchema, adMediaSchema, type AdMediaFormData, type CampaignEditPageFormData } from '@/lib/schemas';
import type { Campaign, AdMedia, TV } from '@/lib/types';
import { 
  getCampaignById, updateCampaign as saveCampaignDetails, 
  addAdToCampaign as saveAd, 
  deleteAdFromCampaign as removeAd,
  getTVs, assignCampaignToTV as linkCampaignToTV, unassignCampaignFromTV as unlinkCampaignFromTV,
  hasConflict, getTVById 
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Trash2, Edit3, Tv as TvIconLucide, Image as ImageIconLucide, FileVideo, Clapperboard, Save, Info, UploadCloud, RefreshCw } from 'lucide-react';
import { format, parseISO, isValid as isDateValid } from 'date-fns';
import { hr } from 'date-fns/locale';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';


export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allTVs, setAllTVs] = useState<TV[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);
  const [isSubmittingTVs, setIsSubmittingTVs] = useState(false);
  
  const form = useForm<CampaignEditPageFormData>({ 
    resolver: zodResolver(campaignEditPageSchema), 
    defaultValues: {
      name: '',
      startTime: '',
      endTime: '',
      ads: [],
      assignedTvIds: []
    },
  });

  const { fields: adFields, replace: replaceAds } = useFieldArray({
    control: form.control,
    name: "ads"
  });

  const loadCampaignData = useCallback(async (showLoadingIndicator = true) => {
    if (!campaignId || campaignId === 'undefined') {
        toast({ title: "Nevažeći ID kampanje", variant: "destructive" });
        router.push('/admin/campaigns');
        if(showLoadingIndicator) setIsLoading(false);
        return;
    }
    if(showLoadingIndicator) setIsLoading(true);
    try {
      const [fetchedCampaign, fetchedTVs] = await Promise.all([
        getCampaignById(campaignId),
        getTVs()
      ]);

      if (fetchedCampaign) {
        setCampaign(fetchedCampaign);
        setAllTVs(fetchedTVs);
        
        const adsForForm = fetchedCampaign.ads.map(ad => {
          let adStartTime = '';
          if (ad.startTime && isDateValid(parseISO(ad.startTime))) {
            adStartTime = format(parseISO(ad.startTime), "yyyy-MM-dd'T'HH:mm");
          }
        
          let adEndTime = '';
          if (ad.endTime && isDateValid(parseISO(ad.endTime))) {
            adEndTime = format(parseISO(ad.endTime), "yyyy-MM-dd'T'HH:mm");
          }
        
          let duration = ad.durationSeconds;
          if ((ad.type === 'image' || ad.type === 'gif') && (!duration || duration <= 0)) {
            duration = 10; // Default duration if invalid or missing for image/gif
          }
        
          return {
            ...ad, 
            file: ad.url, // Za postojeće oglase, 'file' je URL za prikaz
            startTime: adStartTime,
            endTime: adEndTime,
            durationSeconds: duration,
          };
        });
        
        const campStartTime = fetchedCampaign.startTime && isDateValid(parseISO(fetchedCampaign.startTime)) ? format(parseISO(fetchedCampaign.startTime), "yyyy-MM-dd'T'HH:mm") : '';
        const campEndTime = fetchedCampaign.endTime && isDateValid(parseISO(fetchedCampaign.endTime)) ? format(parseISO(fetchedCampaign.endTime), "yyyy-MM-dd'T'HH:mm") : '';

        const resetData = {
          name: fetchedCampaign.name,
          startTime: campStartTime,
          endTime: campEndTime,
          ads: adsForForm,
          assignedTvIds: fetchedCampaign.assignedTvIds || []
        };
        form.reset(resetData);
        replaceAds(adsForForm); 
      } else {
        setCampaign(null);
        toast({ title: "Kampanja nije pronađena", variant: "destructive" });
      }
    } catch (error) {
      console.error("Greška pri dohvaćanju podataka kampanje:", error);
      toast({ title: "Greška pri dohvaćanju podataka", variant: "destructive" });
      setCampaign(null);
    } finally {
      if(showLoadingIndicator) setIsLoading(false);
    }
  }, [campaignId, router, toast, form, replaceAds]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);


  const onSubmitCampaignDetails = async (data: CampaignEditPageFormData) => { 
    if (!campaign) {
      toast({ title: "Greška: Kampanja nije učitana.", variant: "destructive" });
      return;
    }
    setIsSubmittingCampaign(true);
    try {
      const campaignToSave: Pick<Campaign, 'id' | 'name' | 'startTime' | 'endTime'> = {
        id: campaign.id,
        name: data.name,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };
      
      await saveCampaignDetails(campaignToSave); 
      toast({ title: "Postavke kampanje spremljene!", description: "Podaci su uspješno ažurirani."});
      
      await loadCampaignData(false); 
      router.refresh(); 
    } catch (error) {
      console.error("Greška kod spremanja detalja kampanje:", error);
      toast({ title: "Greška kod spremanja detalja kampanje", variant: "destructive", description: error instanceof Error ? error.message : "Pokušajte ponovno." });
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const handleCampaignDetailsSubmitAttempt = async () => {
    const currentValues = form.getValues();
    try {
      campaignEditPageSchema.parse(currentValues); 
      await onSubmitCampaignDetails(currentValues);
    } catch (error) {
       toast({
        title: "Greška u validaciji forme",
        description: "Provjerite unesene podatke. Neka polja možda nisu ispravna.",
        variant: "destructive",
        duration: 7000,
      });
      if (error instanceof z.ZodError) {
        console.error("Zod validation errors:", JSON.stringify(error.flatten().fieldErrors, null, 2));
      }
    }
  };


  const onAddAd = async (adFormData: AdMediaFormData) => {
    if (!campaign) return;
    
    // `adFormData.url` će sada biti Azure Blob URL (za slike/video) ili placeholder (za video ako upload nije uspio).
    // `adFormData.fileName` je originalno ime datoteke.
    
    const newAdData: Omit<AdMedia, 'id'> = {
      name: adFormData.name,
      type: adFormData.type,
      url: adFormData.url || (adFormData.type === 'video' ? 'https://placehold.co/300x200.png?text=Video+Error' : 'https://placehold.co/300x200.png?text=Image+Error'), // Fallback ako URL nije postavljen
      fileName: adFormData.fileName || 'nepoznata_datoteka',
      durationSeconds: adFormData.durationSeconds,
      startTime: adFormData.startTime && adFormData.startTime !== '' ? new Date(adFormData.startTime).toISOString() : undefined,
      endTime: adFormData.endTime && adFormData.endTime !== '' ? new Date(adFormData.endTime).toISOString() : undefined,
      dataAIHint: adFormData.dataAIHint, 
    };

    try {
      const newAd = await saveAd(campaign.id, newAdData);
      if (newAd) {
        toast({ title: "Oglas uspješno dodan!" });
        await loadCampaignData(false);
        router.refresh();
      } else {
        toast({ title: "Dodavanje oglasa nije uspjelo", variant: "destructive" });
      }
    } catch (error) {
      console.error("Greška kod dodavanja oglasa:", error);
      toast({ title: "Greška kod dodavanja oglasa", variant: "destructive" });
    }
  };
  
  const onDeleteAd = async (adId: string) => {
    if (!campaign || !adId) { 
        toast({ title: "Greška: ID oglasa nedostaje", variant: "destructive"});
        return;
    }
    try {
      const success = await removeAd(campaign.id, adId);
      if (success) {
        toast({ title: "Oglas uspješno obrisan!" });
        await loadCampaignData(false); 
        router.refresh();
      } else {
        toast({ title: "Brisanje oglasa nije uspjelo", variant: "destructive" });
      }
    } catch (error) {
      console.error("Greška kod brisanja oglasa:", error);
      toast({ title: "Greška kod brisanja oglasa", variant: "destructive" });
    }
  };

  const onAssignTVs = async () => { 
    if (!campaign) return;
    setIsSubmittingTVs(true);

    const assignedTvIdsFromForm = form.getValues("assignedTvIds") || [];

    try {
      let conflictFound = false;
      const campStartTimeValue = form.getValues("startTime");
      const campEndTimeValue = form.getValues("endTime");

      if (!campStartTimeValue || !campEndTimeValue || !isDateValid(new Date(campStartTimeValue)) || !isDateValid(new Date(campEndTimeValue))) {
        toast({ title: "Nevažeća vremena kampanje", description: "Molimo postavite ispravna vremena početka i završetka kampanje.", variant: "destructive" });
        setIsSubmittingTVs(false);
        return;
      }

      const tempCampaignForCheck: Pick<Campaign, 'id' | 'startTime' | 'endTime'> = { 
        id: campaign.id, 
        startTime: new Date(campStartTimeValue).toISOString(), 
        endTime: new Date(campEndTimeValue).toISOString() 
      };

      const originalAssigned = campaign.assignedTvIds || [];

      for (const tvId of assignedTvIdsFromForm) {
        if (!originalAssigned.includes(tvId)) { 
          const conflictingCampaign = await hasConflict(tvId, tempCampaignForCheck);
          if (conflictingCampaign) {
            const tvDetails = await getTVById(tvId);
            toast({
              title: "Sukob rasporeda",
              description: `Kampanja "${campaign.name}" sukobljava se s kampanjom "${conflictingCampaign.name}" na TV prijemniku ${tvDetails?.name || tvId}. Molimo prilagodite vremena ili odabir TV-a.`,
              variant: "destructive",
              duration: 7000,
            });
            conflictFound = true;
            form.setValue("assignedTvIds", originalAssigned); 
            break; 
          }
        }
      }

      if (conflictFound) {
        setIsSubmittingTVs(false);
        return;
      }
      
      const finalAssignedTvIds = form.getValues("assignedTvIds") || [];
      const toAdd = finalAssignedTvIds.filter(id => !originalAssigned.includes(id));
      const toRemove = originalAssigned.filter(id => !finalAssignedTvIds.includes(id));

      if (toAdd.length > 0 || toRemove.length > 0) {
        await Promise.all(toAdd.map(tvId => linkCampaignToTV(campaign.id, tvId)));
        await Promise.all(toRemove.map(tvId => unlinkCampaignFromTV(campaign.id, tvId)));
        toast({ title: "Dodjele TV prijemnika ažurirane." });
        await loadCampaignData(false); 
        router.refresh();
      } else {
        toast({ title: "Nema promjena u dodjelama TV prijemnika." });
      }

    } catch (error) {
      console.error("Greška kod dodjele TV prijemnika:", error);
      toast({ title: "Greška kod dodjele TV prijemnika", variant: "destructive" });
    } finally {
      setIsSubmittingTVs(false);
    }
  };


  if (isLoading) return <div className="flex justify-center items-center h-64">Učitavanje detalja kampanje...</div>;
  if (!campaign && !isLoading) return (
      <div className="text-center py-10">
          <p className="text-xl font-semibold">Kampanja nije pronađena.</p>
          <p className="text-muted-foreground">Provjerite ID kampanje ili se vratite na popis.</p>
          <Button variant="outline" asChild className="mt-4">
              <Link href="/admin/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag na kampanje</Link>
          </Button>
      </div>
  );
  if (!campaign) return null;

  const campaignStartTimeForAdCreator = form.getValues("startTime") || (campaign?.startTime && isDateValid(parseISO(campaign.startTime)) ? format(parseISO(campaign.startTime), "yyyy-MM-dd'T'HH:mm") : "");
  const campaignEndTimeForAdCreator = form.getValues("endTime") || (campaign?.endTime && isDateValid(parseISO(campaign.endTime)) ? format(parseISO(campaign.endTime), "yyyy-MM-dd'T'HH:mm") : "");
  
  return (
    <>
      <PageHeader
        title={`Upravljanje kampanjom: ${form.watch("name") || campaign.name}`} 
        description="Uredite detalje, oglase i dodjele TV prijemnika za ovu kampanju."
        actions={
          <>
            <Button variant="outline" onClick={() => loadCampaignData(true)} className="mr-2">
                <RefreshCw className="mr-2 h-4 w-4" /> Osvježi podatke
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag na kampanje</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <Form {...form}>
            {/* Form za postavke kampanje */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><Edit3 className="mr-2 h-5 w-5" /> Postavke kampanje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv</FormLabel>
                    <FormControl><Input {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="startTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vrijeme početka</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="endTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Vrijeme završetka</FormLabel>
                    <FormControl><Input type="datetime-local" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
              <CardFooter>
                <Button 
                  type="button" // Promijenjeno iz "submit"
                  size="sm" 
                  disabled={isSubmittingCampaign || !form.formState.isDirty}
                  onClick={handleCampaignDetailsSubmitAttempt} 
                >
                  <Save className="mr-2 h-4 w-4"/> {isSubmittingCampaign ? "Spremanje..." : "Spremi detalje"}
                </Button>
              </CardFooter>
            </Card>

            {/* Form (sada samo logika) za dodjelu TV-a */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center"><TvIconLucide className="mr-2 h-5 w-5" /> Dodijeli TV prijemnicima</CardTitle>
                <CardDescription>Odaberite TV prijemnike na kojima će se ova kampanja prikazivati.</CardDescription>
              </CardHeader>
              <CardContent>
                <FormField
                  control={form.control}
                  name="assignedTvIds"
                  render={() => ( 
                    <FormItem>
                      <ScrollArea className="h-48">
                      {allTVs.map((tv) => (
                        <FormField
                          key={tv.id}
                          control={form.control}
                          name="assignedTvIds" 
                          render={({ field }) => {
                            return (
                              <FormItem
                                key={tv.id}
                                className="flex flex-row items-start space-x-3 space-y-0 py-2"
                              >
                                <FormControl>
                                  <Checkbox
                                    checked={field.value?.includes(tv.id)}
                                    onCheckedChange={(checked) => {
                                      const currentAssigned = field.value || [];
                                      return checked
                                        ? field.onChange([...currentAssigned, tv.id])
                                        : field.onChange(
                                            currentAssigned.filter(
                                              (value) => value !== tv.id
                                            )
                                          )
                                    }}
                                  />
                                </FormControl>
                                <FormLabel className="font-normal">
                                  {tv.name}
                                </FormLabel>
                              </FormItem>
                            )
                          }}
                        />
                      ))}
                      </ScrollArea>
                      <FormMessage /> 
                    </FormItem>
                  )}
                />
              </CardContent>
              <CardFooter>
                <Button type="button" size="sm" onClick={onAssignTVs} disabled={isSubmittingTVs}>
                  <Save className="mr-2 h-4 w-4"/> {isSubmittingTVs ? "Ažuriranje..." : "Ažuriraj dodjele TV-a"}
                </Button>
              </CardFooter>
            </Card>
          </Form> 
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Clapperboard className="mr-2 h-5 w-5" /> Upravljanje oglasima</CardTitle>
              <CardDescription>Dodajte, uredite ili uklonite oglase za ovu kampanju.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdCreator 
                campaignId={campaignId} 
                onAdAdded={onAddAd} 
                campaignStartTime={campaignStartTimeForAdCreator} 
                campaignEndTime={campaignEndTimeForAdCreator}
              />
              
              <Separator className="my-6" />

              {adFields.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">U ovoj kampanji još nema oglasa. Dodajte jedan iznad!</p>
              ) : (
                <ScrollArea className="h-[600px] pr-3">
                  <div className="space-y-4">
                  {adFields.map((adItem, index) => (
                    <Card key={adItem.id || `new-ad-${index}`} className="overflow-hidden">
                      <CardHeader className="flex flex-row justify-between items-start bg-muted/50 p-4">
                        <div>
                          <CardTitle className="text-base">{form.watch(`ads.${index}.name`)}</CardTitle>
                          <CardDescription className="text-xs">
                            Vrsta: {form.watch(`ads.${index}.type`)}
                            { (form.watch(`ads.${index}.type`) === 'image' || form.watch(`ads.${index}.type`) === 'gif') && 
                              ` | Trajanje: ${form.watch(`ads.${index}.durationSeconds`)}s`
                            }
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteAd(form.getValues(`ads.${index}.id`) || '')} disabled={!form.getValues(`ads.${index}.id`)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        { (form.watch(`ads.${index}.type`) === 'image' || form.watch(`ads.${index}.type`) === 'gif') &&
                          <Image 
                            src={ form.watch(`ads.${index}.file`) as string || "https://placehold.co/100x50.png" } 
                            alt={form.watch(`ads.${index}.name`) || 'Pregled oglasa'} 
                            width={100} height={50} className="rounded border object-contain" 
                            data-ai-hint={form.watch(`ads.${index}.dataAIHint`) || "advertisement preview"}
                            onError={(e) => console.error("Greška pri učitavanju slike oglasa:", e.currentTarget.src)}
                          />
                        }
                        { form.watch(`ads.${index}.type`) === 'video' &&
                          <div className="text-xs text-muted-foreground">
                            {form.watch(`ads.${index}.file`) ? (
                                 <a href={form.watch(`ads.${index}.file`) as string} target="_blank" rel="noopener noreferrer" className="text-primary underline">Pogledaj video</a>
                            ) : (
                                "Video URL nije dostupan."
                            )}
                           
                          </div>
                        }
                        {(form.watch(`ads.${index}.startTime`) && form.watch(`ads.${index}.endTime`) && form.watch(`ads.${index}.startTime`) !== '' && form.watch(`ads.${index}.endTime`) !== '' && isDateValid(parseISO(form.watch(`ads.${index}.startTime`) as string)) && isDateValid(parseISO(form.watch(`ads.${index}.endTime`) as string))) && (
                            <p className="text-xs text-muted-foreground">
                                Oglas aktivan: {format(parseISO(form.watch(`ads.${index}.startTime`) as string), "PPp", { locale: hr })} - {format(parseISO(form.watch(`ads.${index}.endTime`) as string), "PPp", { locale: hr })}
                            </p>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}


interface AdCreatorProps {
  campaignId: string;
  onAdAdded: (data: AdMediaFormData) => Promise<void>;
  campaignStartTime: string;
  campaignEndTime: string;
}

function AdCreator({ campaignId, onAdAdded, campaignStartTime, campaignEndTime }: AdCreatorProps) {
  const [isSubmittingAd, setIsSubmittingAd] = useState(false);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const { toast } = useToast();

  const adForm = useForm<AdMediaFormData>({
    resolver: zodResolver(adMediaSchema),
    defaultValues: {
      name: '',
      type: 'image',
      file: undefined, 
      url: undefined,  
      fileName: undefined,
      durationSeconds: 10,
      startTime: '', 
      endTime: '',
      dataAIHint: undefined,
    }
  });

  const onSubmitAd = async (data: AdMediaFormData) => {
    setIsSubmittingAd(true);
    
    let uploadedFileUrl = data.url; 
    let finalFileName = data.fileName;
    let finalDataAIHint = data.dataAIHint;

    if (data.file instanceof File) {
      finalFileName = data.file.name;
      finalDataAIHint = data.name ? data.name.substring(0, 50) : data.file.name.substring(0, 50);

      const formData = new FormData();
      formData.append('file', data.file);

      try {
        const response = await fetch('/api/upload-media', {
          method: 'POST',
          body: formData,
        });
        const result = await response.json();

        if (response.ok && result.success) {
          uploadedFileUrl = result.url;
          toast({ title: "Datoteka uspješno učitana!", description: `URL: ${result.url}` });
        } else {
          throw new Error(result.error || "Greška pri učitavanju datoteke na server.");
        }
      } catch (error: any) {
        console.error("Greška pri uploadu datoteke u AdCreator:", error);
        toast({ title: "Greška pri učitavanju datoteke", description: error.message, variant: "destructive" });
        setIsSubmittingAd(false);
        return;
      }
    } else if (!uploadedFileUrl) { // Fallback ako nema ni datoteke ni postojećeg URL-a (npr. ako se ne odabere datoteka za video)
      if (data.type === 'video') {
        uploadedFileUrl = 'https://placehold.co/600x400.png?text=Video+Not+Uploaded'; // Korisnik mora ručno unijeti URL za video ako ga ne uploada
        finalDataAIHint = "sample video placeholder";
      } else { // Za slike/gif ako nije odabrana datoteka, a nema ni URL-a
        uploadedFileUrl = `https://placehold.co/300x200.png`;
        finalDataAIHint = "placeholder image";
      }
    }
    
    let finalStartTime = data.startTime;
    if (!finalStartTime || finalStartTime === '') {
        finalStartTime = campaignStartTime && isDateValid(new Date(campaignStartTime)) ? campaignStartTime : undefined;
    }

    let finalEndTime = data.endTime;
    if (!finalEndTime || finalEndTime === '') {
        finalEndTime = campaignEndTime && isDateValid(new Date(campaignEndTime)) ? campaignEndTime : undefined;
    }
    
    const dataToSubmit: AdMediaFormData = { 
        ...data, 
        url: uploadedFileUrl, 
        fileName: finalFileName,
        dataAIHint: finalDataAIHint,
        startTime: finalStartTime, 
        endTime: finalEndTime,
        file: undefined // File objekt više nije potreban nakon uploada, šaljemo samo URL
    };

    try {
        await onAdAdded(dataToSubmit); 
        adForm.reset({ 
            name: '', type: 'image', file: undefined, url: undefined, fileName: undefined, 
            durationSeconds: 10, startTime: '', endTime: '', dataAIHint: undefined,
        });
        setSelectedFileName(null);
        setPreviewUrl(null);
    } catch (error) {
        console.error("Greška pri slanju forme za oglas (iz AdCreator):", error);
         toast({
            title: "Greška kod dodavanja oglasa",
            description: error instanceof Error ? error.message : "Pokušajte ponovno.",
            variant: "destructive",
        });
    } finally {
        setIsSubmittingAd(false);
    }
  };
  
  const adType = adForm.watch("type");
  const currentFile = adForm.watch("file");

  useEffect(() => {
    if (currentFile instanceof File && (adType === 'image' || adType === 'gif')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(currentFile);
    } else {
      setPreviewUrl(null);
    }
  }, [currentFile, adType]);

  const formattedCampaignStartTime = campaignStartTime && isDateValid(new Date(campaignStartTime)) ? campaignStartTime : undefined; 
  const formattedCampaignEndTime = campaignEndTime && isDateValid(new Date(campaignEndTime)) ? campaignEndTime : undefined;     


  return (
    <Form {...adForm}>
      <form onSubmit={adForm.handleSubmit(onSubmitAd)} className="space-y-4 border p-4 rounded-md">
        <h3 className="text-lg font-semibold">Dodaj novi oglas</h3>
        <FormField control={adForm.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Naziv oglasa</FormLabel><FormControl><Input placeholder="npr. Banner posebne ponude" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={adForm.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Vrsta</FormLabel>
            <Select onValueChange={(value) => {
                field.onChange(value);
                adForm.setValue("file", undefined);
                setSelectedFileName(null);
                setPreviewUrl(null);
                adForm.setValue("url", undefined); 
            }} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Odaberite vrstu oglasa" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="image">Slika (JPG, PNG)</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="video">Video (MP4, WebM)</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />

        <FormField
          control={adForm.control}
          name="file" 
          render={({ field: { onChange, value, name, ref, ...rest } }) => ( 
            <FormItem>
              <FormLabel>
                {adType === 'video' ? 'Video datoteka (ili unesite URL ispod)' : 'Medijska datoteka'}
              </FormLabel>
              <FormControl>
                <div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden" 
                    accept={
                        adType === 'image' ? 'image/jpeg, image/png' : 
                        adType === 'gif' ? 'image/gif' : 
                        adType === 'video' ? 'video/mp4, video/webm, video/ogg' : '*'
                    }
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file); 
                      setSelectedFileName(file ? file.name : null);
                      if (file) { // Ako je datoteka odabrana, resetiraj URL polje
                        adForm.setValue("url", undefined);
                      }
                    }}
                    ref={ref} 
                    {...rest} 
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex items-center justify-center w-full px-4 py-2 border border-input rounded-md shadow-sm text-sm font-medium text-muted-foreground bg-background hover:bg-accent hover:text-accent-foreground cursor-pointer"
                  >
                    <UploadCloud className="mr-2 h-5 w-5" />
                    {selectedFileName || "Odaberi medijsku datoteku"}
                  </label>
                </div>
              </FormControl>
              <FormMessage />
              {previewUrl && (adType === 'image' || adType === 'gif') && (
                <div className="mt-2">
                  <Image src={previewUrl} alt="Pregled" width={100} height={100} className="rounded border object-contain" />
                </div>
              )}
            </FormItem>
          )}
        />
        
         {adType === 'video' && (
            <FormField
            control={adForm.control}
            name="url" // Koristimo postojeće 'url' polje za unos URL-a videa ako se ne uploada
            render={({ field }) => (
                <FormItem>
                <FormLabel>Ili unesite URL videa</FormLabel>
                <FormControl>
                    <Input 
                    placeholder="https://example.com/video.mp4" 
                    {...field} 
                    onChange={(e) => {
                        field.onChange(e.target.value);
                        if (e.target.value) { // Ako je URL unesen, resetiraj file input
                            adForm.setValue("file", undefined);
                            setSelectedFileName(null);
                            setPreviewUrl(null);
                        }
                    }}
                    />
                </FormControl>
                <FormMessage />
                </FormItem>
            )}
            />
        )}
        
        {(adType === 'image' || adType === 'gif') && (
          <FormField control={adForm.control} name="durationSeconds" render={({ field }) => (
            <FormItem><FormLabel>Trajanje prikaza (sekunde)</FormLabel>
              <FormControl><Input type="number" placeholder="10" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <p className="text-xs text-muted-foreground flex items-center"><Info size={14} className="mr-1 text-primary" /> 
            Vremena početka/završetka oglasa zadano su trajanje kampanje ako nisu navedena. 
            Trajanje kampanje: 
            {(campaignStartTime && isDateValid(new Date(campaignStartTime))) ? format(new Date(campaignStartTime), "P p", { locale: hr }) : 'N/A'} do {(campaignEndTime && isDateValid(new Date(campaignEndTime))) ? format(new Date(campaignEndTime), "P p", { locale: hr }) : 'N/A'}.
        </p>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={adForm.control} name="startTime" render={({ field }) => (
            <FormItem><FormLabel>Vrijeme početka oglasa (nije obavezno)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} min={formattedCampaignStartTime} max={formattedCampaignEndTime} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={adForm.control} name="endTime" render={({ field }) => (
            <FormItem><FormLabel>Vrijeme završetka oglasa (nije obavezno)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} min={formattedCampaignStartTime} max={formattedCampaignEndTime} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
        </div>
        <Button type="submit" size="sm" disabled={isSubmittingAd}><UploadCloud className="mr-2 h-4 w-4" /> {isSubmittingAd ? "Dodavanje..." : "Dodaj oglas u kampanju"}</Button>
      </form>
    </Form>
  );
}
    
