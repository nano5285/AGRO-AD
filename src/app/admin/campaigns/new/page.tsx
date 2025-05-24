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
import { ArrowLeft } from 'lucide-react';
import { format } from 'date-fns';
// Ne treba `hr` locale za `datetime-local` inpute

export default function NewCampaignPage() {
  const router = useRouter();
  const { toast } = useToast();
  
  const form = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      name: '',
      startTime: format(new Date(), "yyyy-MM-dd'T'HH:mm"), // Format za datetime-local input
      endTime: format(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), "yyyy-MM-dd'T'HH:mm"), // Format za datetime-local input
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
        title: 'Kampanja uspješno stvorena!',
        description: `Kampanja "${newCampaign.name}" je dodana. Sada možete dodati oglase i dodijeliti je TV prijemnicima.`,
      });
      router.push(`/admin/campaigns/${newCampaign.id}`);
    } catch (error) {
      toast({
        title: 'Greška pri stvaranju kampanje',
        description: error instanceof Error ? error.message : 'Dogodila se neočekivana pogreška.',
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Stvori novu kampanju"
        description="Postavite novu oglasnu kampanju."
         actions={
            <Button variant="outline" asChild>
                <Link href="/admin/campaigns"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag na popis kampanja</Link>
            </Button>
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Detalji kampanje</CardTitle>
              <CardDescription>Definirajte naziv i trajanje za svoju novu kampanju.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv kampanje</FormLabel>
                    <FormControl>
                      <Input placeholder="npr. Ljetna rasprodaja" {...field} />
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
                      <FormLabel>Datum i vrijeme početka</FormLabel>
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
                      <FormLabel>Datum i vrijeme završetka</FormLabel>
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
                {form.formState.isSubmitting ? 'Stvaranje...' : 'Stvori kampanju i dodaj oglase'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}
