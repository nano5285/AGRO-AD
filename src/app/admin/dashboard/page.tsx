import { PageHeader } from '@/components/shared/PageHeader';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Tv, Clapperboard, PlusCircle } from 'lucide-react';
import { getTVs, getCampaigns } from '@/lib/data';

export default function DashboardPage() {
  const tvs = getTVs();
  const campaigns = getCampaigns();
  const activeCampaigns = campaigns.filter(c => {
    const now = new Date();
    const start = new Date(c.startTime);
    const end = new Date(c.endTime);
    return start <= now && now <= end;
  });

  return (
    <>
      <PageHeader title="Nadzorna ploča" description="Dobrodošli u AdVantage. Upravljajte svojim digitalnim natpisima bez napora." />
      
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno TV prijemnika</CardTitle>
            <Tv className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{tvs.length}</div>
            <p className="text-xs text-muted-foreground">Upravljanih zaslonskih jedinica</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/admin/tvs/new"><PlusCircle className="mr-2 h-4 w-4" /> Dodaj novi TV</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ukupno kampanja</CardTitle>
            <Clapperboard className="h-5 w-5 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{campaigns.length}</div>
            <p className="text-xs text-muted-foreground">{activeCampaigns.length} trenutno aktivnih</p>
            <Button asChild size="sm" className="mt-4">
              <Link href="/admin/campaigns/new"><PlusCircle className="mr-2 h-4 w-4" /> Stvori kampanju</Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="md:col-span-2 lg:col-span-1">
          <CardHeader>
            <CardTitle>Brze poveznice</CardTitle>
            <CardDescription>Brzo pristupite ključnim odjeljcima.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col space-y-2">
            <Button variant="outline" asChild>
              <Link href="/admin/tvs">Upravljanje TV prijemnicima</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/admin/campaigns">Upravljanje kampanjama</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Placeholder for future charts or activity feed */}
      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Pregled aktivnosti</h2>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Grafikoni aktivnosti i zapisi bit će prikazani ovdje u budućem ažuriranju.</p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
