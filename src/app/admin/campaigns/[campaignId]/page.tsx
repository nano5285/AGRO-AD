'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { campaignSchema, adMediaSchema, type CampaignFormData, type AdMediaFormData } from '@/lib/schemas';
import type { Campaign, AdMedia, TV } from '@/lib/types';
import { 
  getCampaignById, updateCampaign as saveCampaign, 
  addAdToCampaign as saveAd, updateAdInCampaign as modifyAd, deleteAdFromCampaign as removeAd,
  getTVs, assignCampaignToTV as linkCampaignToTV, unassignCampaignFromTV as unlinkCampaignFromTV,
  hasConflict, getTVById // Added getTVById
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Trash2, Edit3, TvIcon, Image as ImageIcon, FileVideo, Clapperboard, Save, Info, UploadCloud } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { hr } from 'date-fns/locale';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label'; // Not directly used but good to keep if Checkbox relies on it
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface CampaignEditFormData extends CampaignFormData {
  ads: AdMediaFormData[];
  assignedTvIds: string[];
}

export default function CampaignDetailPage() {
  const router = useRouter();
  const params = useParams();
  const campaignId = params.campaignId as string;
  const { toast } = useToast();

  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [allTVs, setAllTVs] = useState<TV[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const form = useForm<CampaignEditFormData>({
    resolver: zodResolver(campaignSchema.extend({ 
      ads: z.array(adMediaSchema),
      assignedTvIds: z.array(z.string())
    })),
    defaultValues: {
      name: '',
      startTime: '',
      endTime: '',
      ads: [],
      assignedTvIds: []
    },
  });

  const { fields: adFields, append: appendAd, remove: removeAdField } = useFieldArray({
    control: form.control,
    name: "ads"
  });

  const loadCampaignData = useCallback(() => {
    const fetchedCampaign = getCampaignById(campaignId);
    const fetchedTVs = getTVs();
    if (fetchedCampaign) {
      setCampaign(fetchedCampaign);
      setAllTVs(fetchedTVs);
      form.reset({
        name: fetchedCampaign.name,
        startTime: format(parseISO(fetchedCampaign.startTime), "yyyy-MM-dd'T'HH:mm"), // For datetime-local input
        endTime: format(parseISO(fetchedCampaign.endTime), "yyyy-MM-dd'T'HH:mm"),   // For datetime-local input
        ads: fetchedCampaign.ads.map(ad => ({
          ...ad,
          file: ad.url, 
          startTime: ad.startTime ? format(parseISO(ad.startTime), "yyyy-MM-dd'T'HH:mm") : undefined,
          endTime: ad.endTime ? format(parseISO(ad.endTime), "yyyy-MM-dd'T'HH:mm") : undefined,
        })),
        assignedTvIds: fetchedCampaign.assignedTvIds || []
      });
    } else {
      toast({ title: "Kampanja nije pronađena", variant: "destructive" });
      router.push('/admin/campaigns');
    }
    setIsLoading(false);
  }, [campaignId, router, toast, form]);

  useEffect(() => {
    loadCampaignData();
  }, [loadCampaignData]);


  const onSubmitCampaignDetails = (data: CampaignFormData) => {
    if (!campaign) return;
    const updatedCampaignData: Campaign = {
      ...campaign,
      name: data.name,
      startTime: new Date(data.startTime).toISOString(),
      endTime: new Date(data.endTime).toISOString(),
    };
    const result = saveCampaign(updatedCampaignData);
    if (result) {
      setCampaign(result); 
      toast({ title: "Detalji kampanje ažurirani!" });
    } else {
      toast({ title: "Ažuriranje detalja kampanje nije uspjelo", variant: "destructive" });
    }
  };

  const onAddAd = (data: AdMediaFormData) => {
    if (!campaign) return;
    
    const fileName = data.file instanceof File ? data.file.name : (typeof data.file === 'string' ? data.file.substring(data.file.lastIndexOf('/')+1) : 'nepoznata_datoteka');
    const placeholderUrl = data.type === 'video' ? 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4' : `https://placehold.co/300x200.png?text=${encodeURIComponent(fileName)}`;
    
    const newAdData: Omit<AdMedia, 'id'> = {
      name: data.name,
      type: data.type,
      url: placeholderUrl, 
      fileName: fileName,
      durationSeconds: data.durationSeconds,
      startTime: data.startTime ? new Date(data.startTime).toISOString() : undefined,
      endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
    };

    const newAd = saveAd(campaign.id, newAdData);
    if (newAd) {
      appendAd({
        ...newAd,
        file: newAd.url, 
        startTime: newAd.startTime ? format(parseISO(newAd.startTime), "yyyy-MM-dd'T'HH:mm") : undefined,
        endTime: newAd.endTime ? format(parseISO(newAd.endTime), "yyyy-MM-dd'T'HH:mm") : undefined,
      });
      setCampaign(getCampaignById(campaignId)!); 
      toast({ title: "Oglas uspješno dodan!" });
    } else {
      toast({ title: "Dodavanje oglasa nije uspjelo", variant: "destructive" });
    }
  };
  
  const onDeleteAd = (adIndex: number, adId: string) => {
    if (!campaign) return;
    const success = removeAd(campaign.id, adId);
    if (success) {
      removeAdField(adIndex);
      setCampaign(getCampaignById(campaignId)!); 
      toast({ title: "Oglas uspješno obrisan!" });
    } else {
      toast({ title: "Brisanje oglasa nije uspjelo", variant: "destructive" });
    }
  };

  const onAssignTVs = (data: { assignedTvIds: string[] }) => {
    if (!campaign) return;

    let conflictFound = false;
    const tempCampaignForCheck = { ...campaign, startTime: new Date(form.getValues("startTime")).toISOString(), endTime: new Date(form.getValues("endTime")).toISOString() };

    for (const tvId of data.assignedTvIds) {
      if (!campaign.assignedTvIds.includes(tvId)) {
        const conflictingCampaign = hasConflict(tvId, tempCampaignForCheck);
        if (conflictingCampaign) {
          toast({
            title: "Sukob rasporeda",
            description: `Kampanja "${campaign.name}" sukobljava se s kampanjom "${conflictingCampaign.name}" na TV prijemniku ${getTVById(tvId)?.name || tvId}.`,
            variant: "destructive",
            duration: 7000,
          });
          conflictFound = true;
          const currentAssigned = form.getValues("assignedTvIds");
          form.setValue("assignedTvIds", currentAssigned.filter(id => id !== tvId));
        }
      }
    }

    if (conflictFound) return; 

    const currentAssigned = campaign.assignedTvIds;
    const toAdd = data.assignedTvIds.filter(id => !currentAssigned.includes(id));
    const toRemove = currentAssigned.filter(id => !data.assignedTvIds.includes(id));

    toAdd.forEach(tvId => linkCampaignToTV(campaign.id, tvId));
    toRemove.forEach(tvId => unlinkCampaignFromTV(campaign.id, tvId));
    
    setCampaign(getCampaignById(campaignId)!); 
    form.setValue("assignedTvIds", data.assignedTvIds); 
    toast({ title: "Dodjele TV prijemnika ažurirane." });
  };


  if (isLoading) return <div className="flex justify-center items-center h-64">Učitavanje detalja kampanje...</div>;
  if (!campaign) return <div className="text-center py-10">Kampanja nije pronađena.</div>;

  return (
    <>
      <PageHeader
        title={`Upravljanje kampanjom: ${campaign.name}`}
        description="Uredite detalje, oglase i dodjele TV prijemnika za ovu kampanju."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag na kampanje</Link>
          </Button>
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
                  <Button type="submit" size="sm"><Save className="mr-2 h-4 w-4"/> Spremi detalje</Button>
                </CardFooter>
              </Card>
            </form>

             <form onSubmit={form.handleSubmit(onAssignTVs)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><TvIcon className="mr-2 h-5 w-5" /> Dodijeli TV prijemnicima</CardTitle>
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
                                        return checked
                                          ? field.onChange([...(field.value || []), tv.id])
                                          : field.onChange(
                                              (field.value || []).filter(
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
                  <Button type="submit" size="sm"><Save className="mr-2 h-4 w-4"/> Ažuriraj dodjele TV-a</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
        
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Clapperboard className="mr-2 h-5 w-5" /> Upravljanje oglasima</CardTitle>
              <CardDescription>Dodajte, uredite ili uklonite oglase za ovu kampanju.</CardDescription>
            </CardHeader>
            <CardContent>
              <AdCreator campaignId={campaignId} onAdAdded={onAddAd} campaignStartTime={campaign.startTime} campaignEndTime={campaign.endTime} />
              
              <Separator className="my-6" />

              {adFields.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">U ovoj kampanji još nema oglasa. Dodajte jedan iznad!</p>
              ) : (
                <ScrollArea className="h-[600px] pr-3">
                  <div className="space-y-4">
                  {adFields.map((adItem, index) => (
                    <Card key={adItem.id} className="overflow-hidden">
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
                        <Button variant="ghost" size="icon" onClick={() => onDeleteAd(index, adItem.id )}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        { (form.watch(`ads.${index}.type`) === 'image' || form.watch(`ads.${index}.type`) === 'gif') &&
                          <Image src={form.watch(`ads.${index}.file`) as string || "https://placehold.co/100x50.png"} alt={form.watch(`ads.${index}.name`) || 'Pregled oglasa'} width={100} height={50} className="rounded border" data-ai-hint="advertisement preview" />
                        }
                        { form.watch(`ads.${index}.type`) === 'video' &&
                          <div className="text-xs text-muted-foreground">Video pregled nije dostupan. URL: <a href={form.watch(`ads.${index}.file`) as string} target="_blank" rel="noopener noreferrer" className="text-primary underline">Poveznica</a></div>
                        }
                        {form.watch(`ads.${index}.startTime`) && form.watch(`ads.${index}.endTime`) && (
                            <p className="text-xs text-muted-foreground">
                                Oglas aktivan: {format(parseISO(form.watch(`ads.${index}.startTime`)), "PPp", { locale: hr })} - {format(parseISO(form.watch(`ads.${index}.endTime`)), "PPp", { locale: hr })}
                            </p>
                        )}
                        {/* TODO: Ovdje dodati inpute za uređivanje postojećeg oglasa ili modal */}
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
  onAdAdded: (data: AdMediaFormData) => void;
  campaignStartTime: string;
  campaignEndTime: string;
}

function AdCreator({ campaignId, onAdAdded, campaignStartTime, campaignEndTime }: AdCreatorProps) {
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

  const onSubmitAd = (data: AdMediaFormData) => {
    if (!data.startTime) data.startTime = format(parseISO(campaignStartTime), "yyyy-MM-dd'T'HH:mm");
    if (!data.endTime) data.endTime = format(parseISO(campaignEndTime), "yyyy-MM-dd'T'HH:mm");

    onAdAdded(data);
    adForm.reset({ 
        name: '', type: 'image', file: undefined, durationSeconds: 10, 
        startTime: '', endTime: '' 
    });
  };
  
  const adType = adForm.watch("type");

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
        <FormField control={adForm.control} name="file" render={({ field }) => (
          <FormItem><FormLabel>Medijska datoteka</FormLabel>
            <FormControl><Input type="file" onChange={e => field.onChange(e.target.files?.[0])} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {(adType === 'image' || adType === 'gif') && (
          <FormField control={adForm.control} name="durationSeconds" render={({ field }) => (
            <FormItem><FormLabel>Trajanje prikaza (sekunde)</FormLabel>
              <FormControl><Input type="number" placeholder="10" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <p className="text-xs text-muted-foreground flex items-center"><Info size={14} className="mr-1 text-primary" /> Vremena početka/završetka oglasa zadano su trajanje kampanje ako nisu navedena. Maksimalno trajanje kampanje: {format(parseISO(campaignStartTime), "P p", { locale: hr })} do {format(parseISO(campaignEndTime), "P p", { locale: hr })}.</p>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={adForm.control} name="startTime" render={({ field }) => (
            <FormItem><FormLabel>Vrijeme početka oglasa (nije obavezno)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={adForm.control} name="endTime" render={({ field }) => (
            <FormItem><FormLabel>Vrijeme završetka oglasa (nije obavezno)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
        </div>
        <Button type="submit" size="sm"><UploadCloud className="mr-2 h-4 w-4" /> Dodaj oglas u kampanju</Button>
      </form>
    </Form>
  );
}
