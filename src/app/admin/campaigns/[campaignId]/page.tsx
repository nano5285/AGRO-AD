
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
import { Textarea } from '@/components/ui/textarea';
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
import { ArrowLeft, PlusCircle, Trash2, Edit3, Tv as TvIconLucide, Image as ImageIcon, FileVideo, Clapperboard, Save, Info, UploadCloud, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
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

  const { fields: adFields, append: appendAd, remove: removeAdField, replace: replaceAds } = useFieldArray({
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
        
        const adsForForm = fetchedCampaign.ads.map(ad => ({
          ...ad, 
          file: ad.url, 
          startTime: ad.startTime ? format(parseISO(ad.startTime), "yyyy-MM-dd'T'HH:mm") : '',
          endTime: ad.endTime ? format(parseISO(ad.endTime), "yyyy-MM-dd'T'HH:mm") : '',
        }));

        form.reset({
          name: fetchedCampaign.name,
          startTime: format(parseISO(fetchedCampaign.startTime), "yyyy-MM-dd'T'HH:mm"),
          endTime: format(parseISO(fetchedCampaign.endTime), "yyyy-MM-dd'T'HH:mm"),
          ads: adsForForm,
          assignedTvIds: fetchedCampaign.assignedTvIds || []
        });
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
    if (!campaign) return;
    setIsSubmittingCampaign(true);
    try {
      const campaignToSave: Pick<Campaign, 'id' | 'name' | 'startTime' | 'endTime'> = {
        id: campaign.id,
        name: data.name,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      };
      const result = await saveCampaignDetails(campaignToSave);
      if (result) {
        toast({ title: "Detalji kampanje ažurirani!" });
      } else {
        // Ovo se može dogoditi ako podaci nisu promijenjeni u bazi.
        // Možemo prikazati neutralniju poruku ili istu kao za uspjeh.
        toast({ title: "Postavke kampanje spremljene.", description: "Nisu detektirane promjene ili su podaci već ažurni."});
      }
      await loadCampaignData(false); 
      router.refresh(); // Osvježi podatke sa servera
    } catch (error) {
      console.error("Greška kod spremanja detalja kampanje:", error);
      toast({ title: "Greška kod spremanja detalja kampanje", variant: "destructive" });
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  const onAddAd = async (data: AdMediaFormData) => {
    if (!campaign) return;
    
    const fileName = data.file instanceof File ? data.file.name : (typeof data.file === 'string' ? data.file.substring(data.file.lastIndexOf('/')+1) : 'nepoznata_datoteka');
    let adUrl = data.url; 
    if (data.file instanceof File) { 
      adUrl = data.type === 'video' ? 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4' : `https://placehold.co/300x200.png`;
    } else if (!adUrl) { 
      adUrl = data.type === 'video' ? 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4' : `https://placehold.co/300x200.png`;
    }
    
    const newAdData: Omit<AdMedia, 'id'> = {
      name: data.name,
      type: data.type,
      url: adUrl, 
      fileName: fileName,
      durationSeconds: data.durationSeconds,
      startTime: data.startTime && data.startTime !== '' ? new Date(data.startTime).toISOString() : undefined,
      endTime: data.endTime && data.endTime !== '' ? new Date(data.endTime).toISOString() : undefined,
      dataAIHint: data.file instanceof File ? data.name.substring(0,50) : data.dataAIHint, 
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
      const tempCampaignForCheck: Pick<Campaign, 'id' | 'startTime' | 'endTime'> = { 
        id: campaign.id, 
        startTime: new Date(form.getValues("startTime")).toISOString(), 
        endTime: new Date(form.getValues("endTime")).toISOString() 
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
            form.setValue("assignedTvIds", originalAssigned); // Vrati na originalno stanje u formi
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
            <form onSubmit={form.handleSubmit(onSubmitCampaignDetails)}>
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
                  <Button type="submit" size="sm" disabled={isSubmittingCampaign || !form.formState.isDirty}><Save className="mr-2 h-4 w-4"/> {isSubmittingCampaign ? "Spremanje..." : "Spremi detalje"}</Button>
                </CardFooter>
              </Card>
            </form>

            {/* TV Assignment Section - Not a separate form submit, uses a button onClick */}
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
                campaignStartTime={form.getValues("startTime") || campaign.startTime} 
                campaignEndTime={form.getValues("endTime") || campaign.endTime} 
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
                        <Button variant="ghost" size="icon" onClick={() => onDeleteAd(form.getValues(`ads.${index}.id`) || '')}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        { (form.watch(`ads.${index}.type`) === 'image' || form.watch(`ads.${index}.type`) === 'gif') &&
                          <Image 
                            src={ (form.watch(`ads.${index}.file`) instanceof File ? URL.createObjectURL(form.watch(`ads.${index}.file`) as File) : form.watch(`ads.${index}.file`)) as string || "https://placehold.co/100x50.png" } 
                            alt={form.watch(`ads.${index}.name`) || 'Pregled oglasa'} 
                            width={100} height={50} className="rounded border" 
                            data-ai-hint={form.watch(`ads.${index}.dataAIHint`) || "advertisement preview"}
                            onLoad={form.watch(`ads.${index}.file`) instanceof File ? () => URL.revokeObjectURL(form.watch(`ads.${index}.file`) as string) : undefined}
                          />
                        }
                        { form.watch(`ads.${index}.type`) === 'video' &&
                          <div className="text-xs text-muted-foreground">Video pregled nije dostupan. URL: <a href={form.watch(`ads.${index}.file`) as string} target="_blank" rel="noopener noreferrer" className="text-primary underline">Poveznica</a></div>
                        }
                        {(form.watch(`ads.${index}.startTime`) && form.watch(`ads.${index}.endTime`) && form.watch(`ads.${index}.startTime`) !== '' && form.watch(`ads.${index}.endTime`) !== '') && (
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

  const adForm = useForm<AdMediaFormData>({
    resolver: zodResolver(adMediaSchema),
    defaultValues: {
      name: '',
      type: 'image',
      file: undefined,
      durationSeconds: 10,
      startTime: '', 
      endTime: '',
    }
  });

  const onSubmitAd = async (data: AdMediaFormData) => {
    setIsSubmittingAd(true);
    const finalStartTime = (data.startTime === '' || data.startTime === undefined) 
        ? format(parseISO(campaignStartTime), "yyyy-MM-dd'T'HH:mm") 
        : data.startTime;
    const finalEndTime = (data.endTime === '' || data.endTime === undefined)
        ? format(parseISO(campaignEndTime), "yyyy-MM-dd'T'HH:mm")
        : data.endTime;
    
    const dataToSubmit = { ...data, startTime: finalStartTime, endTime: finalEndTime };

    try {
        await onAdAdded(dataToSubmit);
        adForm.reset({ 
            name: '', type: 'image', file: undefined, durationSeconds: 10, 
            startTime: '', endTime: '' 
        });
        setSelectedFileName(null);
    } catch (error) {
        console.error("Greška pri slanju forme za oglas:", error);
    } finally {
        setIsSubmittingAd(false);
    }
  };
  
  const adType = adForm.watch("type");
  const formattedCampaignStartTime = campaignStartTime ? format(parseISO(campaignStartTime), "yyyy-MM-dd'T'HH:mm") : "";
  const formattedCampaignEndTime = campaignEndTime ? format(parseISO(campaignEndTime), "yyyy-MM-dd'T'HH:mm") : "";


  return (
    <Form {...adForm}>
      <form onSubmit={adForm.handleSubmit(onSubmitAd)} className="space-y-4 border p-4 rounded-md">
        <h3 className="text-lg font-semibold">Dodaj novi oglas</h3>
        <FormField control={adForm.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Naziv oglasa</FormLabel><FormControl><Input placeholder="npr. Banner posebne ponude" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={adForm.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Vrsta</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Odaberite vrstu oglasa" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="image">Slika</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />

        <FormField
          control={adForm.control}
          name="file"
          render={({ field: { onChange, value, name, ref, ...rest } }) => (
            <FormItem>
              <FormLabel>Medijska datoteka</FormLabel>
              <FormControl>
                <div>
                  <Input
                    id="file-upload"
                    type="file"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      onChange(file); 
                      setSelectedFileName(file ? file.name : null);
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
            </FormItem>
          )}
        />
        
        {(adType === 'image' || adType === 'gif') && (
          <FormField control={adForm.control} name="durationSeconds" render={({ field }) => (
            <FormItem><FormLabel>Trajanje prikaza (sekunde)</FormLabel>
              <FormControl><Input type="number" placeholder="10" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <p className="text-xs text-muted-foreground flex items-center"><Info size={14} className="mr-1 text-primary" /> Vremena početka/završetka oglasa zadano su trajanje kampanje ako nisu navedena. Trajanje kampanje: {campaignStartTime ? format(parseISO(campaignStartTime), "P p", { locale: hr }) : 'N/A'} do {campaignEndTime ? format(parseISO(campaignEndTime), "P p", { locale: hr }) : 'N/A'}.</p>
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

    

    