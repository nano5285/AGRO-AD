'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { PageHeader } from '@/components/shared/PageHeader';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlusCircle, Search, ExternalLink, Trash2, Edit3, RefreshCw } from 'lucide-react';
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
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const loadTVs = async () => {
    setIsLoading(true);
    try {
      const data = await fetchTVs();
      setTVs(data);
    } catch (error) {
      console.error("Greška pri dohvaćanju TV prijemnika:", error);
      toast({ title: "Greška pri dohvaćanju TV prijemnika", description: "Pokušajte ponovno kasnije.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadTVs();
  }, []);

  const handleDeleteTV = async (tvId: string) => {
    try {
      const success = await removeTV(tvId);
      if (success) {
        await loadTVs(); // Refresh list
        toast({
          title: "TV obrisan",
          description: `TV s ID-om ${tvId} uspješno je obrisan.`,
        });
      } else {
        toast({
          title: "Greška",
          description: "Brisanje TV-a nije uspjelo. Možda TV ne postoji.",
          variant: "destructive",
        });
      }
    } catch (error) {
       console.error("Greška pri brisanju TV-a:", error);
       toast({
        title: "Greška pri brisanju",
        description: "Dogodila se neočekivana pogreška.",
        variant: "destructive",
      });
    }
  };

  const filteredTVs = tvs.filter(tv =>
    tv.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (tv.description && tv.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );
  
  if (isLoading) {
    return (
      <>
        <PageHeader
          title="Upravljanje TV prijemnicima"
          description="Pregledajte, dodajte ili upravljajte svojim zaslonskim jedinicama."
           actions={
          <Button disabled><PlusCircle className="mr-2 h-4 w-4" /> Dodaj novi TV</Button>
        }
        />
        <div className="text-center py-10">Učitavanje TV prijemnika...</div>
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Upravljanje TV prijemnicima"
        description="Pregledajte, dodajte ili upravljajte svojim zaslonskim jedinicama."
        actions={
          <>
            <Button variant="outline" onClick={loadTVs} className="mr-2">
              <RefreshCw className="mr-2 h-4 w-4" /> Osvježi
            </Button>
            <Button asChild>
              <Link href="/admin/tvs/new"><PlusCircle className="mr-2 h-4 w-4" /> Dodaj novi TV</Link>
            </Button>
          </>
        }
      />

      <div className="mb-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Pretraži TV prijemnike po nazivu ili opisu..."
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
              {tvs.length === 0 ? "Nema pronađenih TV prijemnika. Započnite dodavanjem novog TV-a." : "Nijedan TV ne odgovara vašim kriterijima pretraživanja."}
            </p>
            {tvs.length === 0 && (
               <div className="text-center mt-4">
                 <Button asChild>
                    <Link href="/admin/tvs/new"><PlusCircle className="mr-2 h-4 w-4" /> Dodaj novi TV</Link>
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
                <CardDescription>{tv.description || 'Nema opisa.'}</CardDescription>
              </CardHeader>
              <CardContent className="flex-grow">
                <Badge variant="secondary">ID: {tv.id}</Badge>
                 {tv.uniqueUrl && (
                  <Button variant="link" asChild className="p-0 h-auto mt-2 block">
                    <Link href={tv.uniqueUrl} target="_blank" rel="noopener noreferrer">
                      Vidi prikaz <ExternalLink className="inline-block ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                )}
              </CardContent>
              <CardFooter className="flex justify-end gap-2 border-t pt-4">
                 {/* <Button variant="outline" size="sm" disabled>
                  <Edit3 className="mr-2 h-4 w-4" /> Uredi
                </Button> */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" size="sm">
                      <Trash2 className="mr-2 h-4 w-4" /> Obriši
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Jeste li sigurni?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ova se radnja ne može poništiti. Ovo će trajno obrisati TV
                        "{tv.name}" i ukloniti ga iz svih kampanja.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Odustani</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteTV(tv.id)}>
                        Nastavi
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
