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
import { Textarea } from '@/components/ui/textarea';
import { tvSchema, type TVFormData } from '@/lib/schemas';
import { addTV } from '@/lib/data';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft } from 'lucide-react';

export default function NewTVPage() {
  const router = useRouter();
  const { toast } = useToast();
  const form = useForm<TVFormData>({
    resolver: zodResolver(tvSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  function onSubmit(data: TVFormData) {
    try {
      const newTV = addTV(data);
      toast({
        title: 'TV uspješno stvoren!',
        description: `TV "${newTV.name}" je dodan s ID-om: ${newTV.id}.`,
      });
      router.push('/admin/tvs');
    } catch (error) {
      toast({
        title: 'Greška pri stvaranju TV-a',
        description: error instanceof Error ? error.message : 'Dogodila se neočekivana pogreška.',
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Stvori novi TV"
        description="Dodajte novu zaslonsku jedinicu u svoju mrežu."
        actions={
            <Button variant="outline" asChild>
                <Link href="/admin/tvs"><ArrowLeft className="mr-2 h-4 w-4" /> Natrag na popis TV prijemnika</Link>
            </Button>
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>Detalji TV-a</CardTitle>
              <CardDescription>Unesite potrebne informacije za novi TV.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Naziv TV-a</FormLabel>
                    <FormControl>
                      <Input placeholder="npr. Glavni zaslon u predvorju" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Opis (nije obavezno)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="npr. Smješten blizu glavnog ulaza, vidljiv svim posjetiteljima." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Stvaranje...' : 'Stvori TV'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}
