'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, Edit, Trash2, CalendarDays, Tv } from 'lucide-react';
import type { Campaign } from '@/lib/types';
import { getCampaigns as fetchCampaigns, deleteCampaign as removeCampaign, getTVs } from '@/lib/data';
import { format } from 'date-fns';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();
  const allTVs = getTVs();

  useEffect(() => {
    setCampaigns(fetchCampaigns());
  }, []);

  const handleDeleteCampaign = (campaignId: string) => {
    const success = removeCampaign(campaignId);
    if (success) {
      setCampaigns(fetchCampaigns()); // Refresh list
      toast({
        title: "Campaign Deleted",
        description: `Campaign with ID ${campaignId} has been successfully deleted.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete campaign.",
        variant: "destructive",
      });
    }
  };

  const filteredCampaigns = campaigns.filter(campaign =>
    campaign.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getCampaignStatus = (campaign: Campaign): { text: string; variant: "default" | "secondary" | "destructive" | "outline" } => {
    const now = new Date();
    const startTime = new Date(campaign.startTime);
    const endTime = new Date(campaign.endTime);

    if (now < startTime) return { text: 'Scheduled', variant: 'outline' };
    if (now > endTime) return { text: 'Expired', variant: 'secondary' };
    return { text: 'Active', variant: 'default' }; // Default is often primary in Badge
  };


  return (
    <>
      <PageHeader
        title="Manage Campaigns"
        description="Create, edit, and schedule your ad campaigns."
        actions={
          <Button asChild>
            <Link href="/admin/campaigns/new"><PlusCircle className="mr-2 h-4 w-4" /> Create New Campaign</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search campaigns by name..."
            className="pl-8 w-full sm:w-1/2 md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredCampaigns.length === 0 ? (
         <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {campaigns.length === 0 ? "No campaigns found. Start by creating a new one." : "No campaigns match your search."}
            </p>
             {campaigns.length === 0 && (
               <div className="text-center mt-4">
                 <Button asChild>
                    <Link href="/admin/campaigns/new"><PlusCircle className="mr-2 h-4 w-4" /> Create Campaign</Link>
                 </Button>
               </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
          {filteredCampaigns.map((campaign) => {
            const status = getCampaignStatus(campaign);
            const assignedTVNames = campaign.assignedTvIds
              .map(tvId => allTVs.find(tv => tv.id === tvId)?.name)
              .filter(Boolean)
              .join(', ');

            return (
              <Card key={campaign.id} className="flex flex-col">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle>{campaign.name}</CardTitle>
                    <Badge variant={status.variant} className={status.variant === 'default' ? 'bg-green-500 text-white' : ''}>{status.text}</Badge>
                  </div>
                  <CardDescription className="flex items-center text-xs text-muted-foreground">
                    <CalendarDays className="h-3 w-3 mr-1" />
                    {format(new Date(campaign.startTime), 'PPp')} - {format(new Date(campaign.endTime), 'PPp')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-2">
                  <p className="text-sm">
                    <span className="font-semibold">Ads:</span> {campaign.ads.length}
                  </p>
                  <div className="text-sm">
                    <div className="font-semibold flex items-center"><Tv className="h-4 w-4 mr-1" /> Assigned TVs:</div>
                    {campaign.assignedTvIds.length > 0 ? (
                      <p className="text-xs text-muted-foreground truncate" title={assignedTVNames}>
                        {assignedTVNames || 'N/A'}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground">None</p>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-2 border-t pt-4">
                  <Button variant="outline" size="sm" asChild>
                    <Link href={`/admin/campaigns/${campaign.id}`}>
                      <Edit className="mr-2 h-4 w-4" /> Manage
                    </Link>
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="mr-2 h-4 w-4" /> Delete
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be undone. This will permanently delete the campaign
                          "{campaign.name}".
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDeleteCampaign(campaign.id)}>
                          Continue
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
