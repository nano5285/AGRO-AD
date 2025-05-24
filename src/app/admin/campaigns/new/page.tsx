'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { campaignSchema, type CampaignFormData } from '@/lib/schemas';
import { addCampaign } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      endTime: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"), // Default to one week later
    },
  });

  function onSubmit(data: CampaignFormData) {
    try {
      const newCampaign = addCampaign({
        name: data.name,
        startTime: new Date(data.startTime).toISOString(),
        endTime: new Date(data.endTime).toISOString(),
      });
      toast({
        title: 'Campaign Created Successfully!',
        description: `Campaign "${newCampaign.name}" has been added. You can now add ads and assign it to TVs.`,
      });
      router.push(`/admin/campaigns/${newCampaign.id}`);
    } catch (error) {
      toast({
        title: 'Error Creating Campaign',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Create New Campaign"
        description="Set up a new advertising campaign."
         actions={
            <Button variant="outline" asChild>
                <Link href="/admin/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Back to Campaign List</Link>
            </Button>
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Campaign Details</CardTitle>
              <CardDescription>Define the name and duration for your new campaign.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Campaign Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Summer Sale Extravaganza" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <FormField
                  control={form.control}
                  name="startTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Start Date & Time</FormLabel>
                       <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="endTime"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>End Date & Time</FormLabel>
                       <FormControl>
                        <Input type="datetime-local" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create Campaign & Add Ads'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}
