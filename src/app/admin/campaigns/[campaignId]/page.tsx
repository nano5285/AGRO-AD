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
import type { Campaign, AdMedia, TV, DeepPartial } from '@/lib/types';
import { 
  getCampaignById, updateCampaign as saveCampaign, 
  addAdToCampaign as saveAd, updateAdInCampaign as modifyAd, deleteAdFromCampaign as removeAd,
  getTVs, assignCampaignToTV as linkCampaignToTV, unassignCampaignFromTV as unlinkCampaignFromTV,
  hasConflict
} from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, PlusCircle, Trash2, Edit3, TvIcon, Image as ImageIcon, FileVideo, Clapperboard, Save, Info, UploadCloud } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import Image from 'next/image';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
    resolver: zodResolver(campaignSchema.extend({ // Extend base schema for full form
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

  const { fields: adFields, append: appendAd, remove: removeAdField, update: updateAdField } = useFieldArray({
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
        startTime: format(parseISO(fetchedCampaign.startTime), "yyyy-MM-dd'T'HH:mm"),
        endTime: format(parseISO(fetchedCampaign.endTime), "yyyy-MM-dd'T'HH:mm"),
        ads: fetchedCampaign.ads.map(ad => ({
          ...ad,
          file: ad.url, // Store URL as file initially
          startTime: ad.startTime ? format(parseISO(ad.startTime), "yyyy-MM-dd'T'HH:mm") : undefined,
          endTime: ad.endTime ? format(parseISO(ad.endTime), "yyyy-MM-dd'T'HH:mm") : undefined,
        })),
        assignedTvIds: fetchedCampaign.assignedTvIds || []
      });
    } else {
      toast({ title: "Campaign not found", variant: "destructive" });
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
      setCampaign(result); // Update local state
      toast({ title: "Campaign details updated!" });
    } else {
      toast({ title: "Failed to update campaign details", variant: "destructive" });
    }
  };

  const onAddAd = (data: AdMediaFormData) => {
    if (!campaign) return;
    
    // Simulate file upload
    const fileName = data.file instanceof File ? data.file.name : (typeof data.file === 'string' ? data.file.substring(data.file.lastIndexOf('/')+1) : 'unknown_file');
    const placeholderUrl = data.type === 'video' ? 'https://sample-videos.com/video123/mp4/720/big_buck_bunny_720p_1mb.mp4' : `https://placehold.co/300x200.png?text=${encodeURIComponent(fileName)}`;
    
    const newAdData: Omit<AdMedia, 'id'> = {
      name: data.name,
      type: data.type,
      url: placeholderUrl, // Use placeholder URL
      fileName: fileName,
      durationSeconds: data.durationSeconds,
      startTime: data.startTime ? new Date(data.startTime).toISOString() : undefined,
      endTime: data.endTime ? new Date(data.endTime).toISOString() : undefined,
    };

    const newAd = saveAd(campaign.id, newAdData);
    if (newAd) {
      // Update form state correctly
      appendAd({
        ...newAd,
        file: newAd.url, // Use URL for display
        startTime: newAd.startTime ? format(parseISO(newAd.startTime), "yyyy-MM-dd'T'HH:mm") : undefined,
        endTime: newAd.endTime ? format(parseISO(newAd.endTime), "yyyy-MM-dd'T'HH:mm") : undefined,
      });
      setCampaign(getCampaignById(campaignId)!); // Refresh campaign state
      toast({ title: "Ad added successfully!" });
    } else {
      toast({ title: "Failed to add ad", variant: "destructive" });
    }
  };
  
  const onDeleteAd = (adIndex: number, adId: string) => {
    if (!campaign) return;
    const success = removeAd(campaign.id, adId);
    if (success) {
      removeAdField(adIndex);
      setCampaign(getCampaignById(campaignId)!); // Refresh campaign state
      toast({ title: "Ad deleted successfully!" });
    } else {
      toast({ title: "Failed to delete ad", variant: "destructive" });
    }
  };

  const onAssignTVs = (data: { assignedTvIds: string[] }) => {
    if (!campaign) return;

    let conflictFound = false;
    const tempCampaignForCheck = { ...campaign, startTime: new Date(form.getValues("startTime")).toISOString(), endTime: new Date(form.getValues("endTime")).toISOString() };

    for (const tvId of data.assignedTvIds) {
      // Check only if it's a new assignment
      if (!campaign.assignedTvIds.includes(tvId)) {
        const conflictingCampaign = hasConflict(tvId, tempCampaignForCheck);
        if (conflictingCampaign) {
          toast({
            title: "Scheduling Conflict",
            description: `Campaign "${campaign.name}" conflicts with "${conflictingCampaign.name}" on TV ${getTVById(tvId)?.name || tvId}.`,
            variant: "destructive",
            duration: 7000,
          });
          conflictFound = true;
          // Revert checkbox for this TV
          const currentAssigned = form.getValues("assignedTvIds");
          form.setValue("assignedTvIds", currentAssigned.filter(id => id !== tvId));
          // break; // Stop further assignments if one conflict is found
        }
      }
    }

    if (conflictFound) return; // Stop if any conflict was found

    // Proceed with assignment if no conflicts
    const currentAssigned = campaign.assignedTvIds;
    const toAdd = data.assignedTvIds.filter(id => !currentAssigned.includes(id));
    const toRemove = currentAssigned.filter(id => !data.assignedTvIds.includes(id));

    toAdd.forEach(tvId => linkCampaignToTV(campaign.id, tvId));
    toRemove.forEach(tvId => unlinkCampaignFromTV(campaign.id, tvId));
    
    setCampaign(getCampaignById(campaignId)!); // Refresh campaign
    form.setValue("assignedTvIds", data.assignedTvIds); // Sync form
    toast({ title: "TV assignments updated." });
  };


  if (isLoading) return <div className="flex justify-center items-center h-64">Loading campaign details...</div>;
  if (!campaign) return <div className="text-center py-10">Campaign not found.</div>;

  return (
    <>
      <PageHeader
        title={`Manage Campaign: ${campaign.name}`}
        description="Edit details, ads, and TV assignments for this campaign."
        actions={
          <Button variant="outline" asChild>
            <Link href="/admin/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaigns</Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: Campaign Details & TV Assignment */}
        <div className="lg:col-span-1 space-y-6">
          <Form {...form}>
            {/* Campaign Details Form */}
            <form onSubmit={form.handleSubmit(onSubmitCampaignDetails)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><Edit3 className="mr-2 h-5 w-5" /> Campaign Settings</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Name</FormLabel>
                      <FormControl><Input {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="startTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Start Time</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="endTime" render={({ field }) => (
                    <FormItem>
                      <FormLabel>End Time</FormLabel>
                      <FormControl><Input type="datetime-local" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </CardContent>
                <CardFooter>
                  <Button type="submit" size="sm"><Save className="mr-2 h-4 w-4"/> Save Details</Button>
                </CardFooter>
              </Card>
            </form>

            {/* TV Assignment Form */}
             <form onSubmit={form.handleSubmit(onAssignTVs)}>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center"><TvIcon className="mr-2 h-5 w-5" /> Assign to TVs</CardTitle>
                  <CardDescription>Select TVs where this campaign will be displayed.</CardDescription>
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
                  <Button type="submit" size="sm"><Save className="mr-2 h-4 w-4"/> Update TV Assignments</Button>
                </CardFooter>
              </Card>
            </form>
          </Form>
        </div>
        
        {/* Column 2: Ads Management */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center"><Clapperboard className="mr-2 h-5 w-5" /> Manage Ads</CardTitle>
              <CardDescription>Add, edit, or remove advertisements for this campaign.</CardDescription>
            </CardHeader>
            <CardContent>
              {/* Add New Ad Form (Simplified within this section) */}
              <AdCreator campaignId={campaignId} onAdAdded={onAddAd} campaignStartTime={campaign.startTime} campaignEndTime={campaign.endTime} />
              
              <Separator className="my-6" />

              {adFields.length === 0 ? (
                <p className="text-muted-foreground text-center py-4">No ads in this campaign yet. Add one above!</p>
              ) : (
                <ScrollArea className="h-[600px] pr-3"> {/* Adjust height as needed */}
                  <div className="space-y-4">
                  {adFields.map((adItem, index) => (
                    <Card key={adItem.id} className="overflow-hidden">
                      <CardHeader className="flex flex-row justify-between items-start bg-muted/50 p-4">
                        <div>
                          <CardTitle className="text-base">{form.watch(`ads.${index}.name`)}</CardTitle>
                          <CardDescription className="text-xs">
                            Type: {form.watch(`ads.${index}.type`)}
                            { (form.watch(`ads.${index}.type`) === 'image' || form.watch(`ads.${index}.type`) === 'gif') && 
                              ` | Duration: ${form.watch(`ads.${index}.durationSeconds`)}s`
                            }
                          </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteAd(index, adItem.id // Assuming original adItem.id is the one from DB
                        )}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </CardHeader>
                      <CardContent className="p-4 space-y-2">
                        { (form.watch(`ads.${index}.type`) === 'image' || form.watch(`ads.${index}.type`) === 'gif') &&
                          <Image src={form.watch(`ads.${index}.file`) as string || "https://placehold.co/100x50.png"} alt={form.watch(`ads.${index}.name`) || 'Ad preview'} width={100} height={50} className="rounded border" data-ai-hint="advertisement preview" />
                        }
                        { form.watch(`ads.${index}.type`) === 'video' &&
                          <div className="text-xs text-muted-foreground">Video preview not available. URL: <a href={form.watch(`ads.${index}.file`) as string} target="_blank" rel="noopener noreferrer" className="text-primary underline">Link</a></div>
                        }
                        {form.watch(`ads.${index}.startTime`) && form.watch(`ads.${index}.endTime`) && (
                            <p className="text-xs text-muted-foreground">
                                Ad Active: {format(parseISO(form.watch(`ads.${index}.startTime`)), "PPp")} - {format(parseISO(form.watch(`ads.${index}.endTime`)), "PPp")}
                            </p>
                        )}
                        {/* TODO: Add inputs here to edit existing ad, or a modal */}
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
      startTime: '', // default to campaign start/end if not specified
      endTime: '',
    }
  });

  const onSubmitAd = (data: AdMediaFormData) => {
    // Set default start/end times if not provided by user, relative to campaign
    if (!data.startTime) data.startTime = format(parseISO(campaignStartTime), "yyyy-MM-dd'T'HH:mm");
    if (!data.endTime) data.endTime = format(parseISO(campaignEndTime), "yyyy-MM-dd'T'HH:mm");

    onAdAdded(data);
    adForm.reset({ 
        name: '', type: 'image', file: undefined, durationSeconds: 10, 
        startTime: '', endTime: '' 
    }); // Reset form
  };
  
  const adType = adForm.watch("type");

  return (
    <Form {...adForm}>
      <form onSubmit={adForm.handleSubmit(onSubmitAd)} className="space-y-4 border p-4 rounded-md">
        <h3 className="text-lg font-semibold">Add New Ad</h3>
        <FormField control={adForm.control} name="name" render={({ field }) => (
          <FormItem><FormLabel>Ad Name</FormLabel><FormControl><Input placeholder="e.g., Special Offer Banner" {...field} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={adForm.control} name="type" render={({ field }) => (
          <FormItem><FormLabel>Type</FormLabel>
            <Select onValueChange={field.onChange} defaultValue={field.value}>
              <FormControl><SelectTrigger><SelectValue placeholder="Select ad type" /></SelectTrigger></FormControl>
              <SelectContent>
                <SelectItem value="image">Image</SelectItem>
                <SelectItem value="gif">GIF</SelectItem>
                <SelectItem value="video">Video</SelectItem>
              </SelectContent>
            </Select><FormMessage />
          </FormItem>
        )} />
        <FormField control={adForm.control} name="file" render={({ field }) => (
          <FormItem><FormLabel>Media File</FormLabel>
            <FormControl><Input type="file" onChange={e => field.onChange(e.target.files?.[0])} /></FormControl>
            <FormMessage />
          </FormItem>
        )} />
        {(adType === 'image' || adType === 'gif') && (
          <FormField control={adForm.control} name="durationSeconds" render={({ field }) => (
            <FormItem><FormLabel>Display Duration (seconds)</FormLabel>
              <FormControl><Input type="number" placeholder="10" {...field} onChange={e => field.onChange(parseInt(e.target.value,10))} /></FormControl>
              <FormMessage />
            </FormItem>
          )} />
        )}
        <p className="text-xs text-muted-foreground flex items-center"><Info size={14} className="mr-1 text-primary" /> Ad start/end times default to campaign duration if not specified. Max campaign duration: {format(parseISO(campaignStartTime), "P p")} to {format(parseISO(campaignEndTime), "P p")}.</p>
        <div className="grid grid-cols-2 gap-4">
            <FormField control={adForm.control} name="startTime" render={({ field }) => (
            <FormItem><FormLabel>Ad Start Time (Optional)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
            <FormField control={adForm.control} name="endTime" render={({ field }) => (
            <FormItem><FormLabel>Ad End Time (Optional)</FormLabel>
                <FormControl><Input type="datetime-local" {...field} /></FormControl>
                <FormMessage />
            </FormItem>
            )} />
        </div>
        <Button type="submit" size="sm"><UploadCloud className="mr-2 h-4 w-4" /> Add Ad to Campaign</Button>
      </form>
    </Form>
  );
}

