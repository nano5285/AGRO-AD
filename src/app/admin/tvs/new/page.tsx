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
        title: 'TV Created Successfully!',
        description: `TV "${newTV.name}" has been added with ID: ${newTV.id}.`,
      });
      router.push('/admin/tvs');
    } catch (error) {
      toast({
        title: 'Error Creating TV',
        description: error instanceof Error ? error.message : 'An unexpected error occurred.',
        variant: 'destructive',
      });
    }
  }

  return (
    <>
      <PageHeader
        title="Create New TV"
        description="Add a new display unit to your network."
        actions={
            <Button variant="outline" asChild>
                <Link href="/admin/tvs"><ArrowLeft className="mr-2 h-4 w-4" /> Back to TV List</Link>
            </Button>
        }
      />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <Card>
            <CardHeader>
              <CardTitle>TV Details</CardTitle>
              <CardDescription>Provide the necessary information for the new TV.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>TV Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Lobby Main Screen" {...field} />
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
                    <FormLabel>Description (Optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="e.g., Located near the main entrance, visible to all visitors." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Creating...' : 'Create TV'}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </Form>
    </>
  );
}
