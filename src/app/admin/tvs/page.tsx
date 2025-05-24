'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, ExternalLink, Trash2, Edit3 } from 'lucide-react';
import type { TV } from '@/lib/types';
import { getTVs as fetchTVs, deleteTV as removeTV } from '@/lib/data';
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


export default function TVsPage() {
  const [tvs, setTVs] = useState<TV[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    setTVs(fetchTVs());
  }, []);

  const handleDeleteTV = (tvId: string) => {
    const success = removeTV(tvId);
    if (success) {
      setTVs(fetchTVs()); // Refresh list
      toast({
        title: "TV Deleted",
        description: `TV with ID ${tvId} has been successfully deleted.`,
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to delete TV.",
        variant: "destructive",
      });
    }
  };

  const filteredTVs = tvs.filter(tv =>
    tv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tv.description && tv.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <>
      <PageHeader
        title="Manage TVs"
        description="View, add, or manage your display units."
        actions={
          <Button asChild>
            <Link href="/admin/tvs/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New TV</Link>
          </Button>
        }
      />

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search TVs by name or description..."
            className="pl-8 w-full sm:w-1/2 md:w-1/3"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {filteredTVs.length === 0 ? (
        <Card>
          <CardContent className="pt-6">
            <p className="text-center text-muted-foreground">
              {tvs.length === 0 ? "No TVs found. Get started by adding a new TV." : "No TVs match your search criteria."}
            </p>
            {tvs.length === 0 && (
               <div className="text-center mt-4">
                 <Button asChild>
                    <Link href="/admin/tvs/new"><PlusCircle className="mr-2 h-4 w-4" /> Add New TV</Link>
                 </Button>
               </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredTVs.map((tv) => (
            <Card key={tv.id} className="flex flex-col">
              <CardHeader>
                <CardTitle>{tv.name}</CardTitle>
                <CardDescription>{tv.description || 'No description provided.'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Badge variant="secondary">ID: {tv.id}</Badge>
                 {tv.uniqueUrl && (
                  <Button variant="link" asChild className="p-0 h-auto mt-2 block">
                    <Link href={tv.uniqueUrl} target="_blank" rel="noopener noreferrer">
                      View Display <ExternalLink className="inline-block ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                 {/* <Button variant="outline" size="sm" disabled>
                  <Edit3 className="mr-2 h-4 w-4" /> Edit
                </Button> */}
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
                        This action cannot be undone. This will permanently delete the TV
                        "{tv.name}" and unassign it from all campaigns.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTV(tv.id)}>
                        Continue
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
