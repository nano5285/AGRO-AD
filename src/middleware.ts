
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/authUtils'; // Koristimo getSession za provjeru JWT-a
import { getUserById } from '@/lib/data'; // Za dohvaćanje korisničkih podataka ako je potrebno

const PUBLIC_PATHS = ['/login', '/api/auth/login']; // Stranice koje ne zahtijevaju prijavu

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Ako je putanja javna, dopusti pristup
  if (PUBLIC_PATHS.some(path => pathname.startsWith(path))) {
    return NextResponse.next();
  }
  
  // Za sve ostale rute, provjeri sesiju
  const session = await getSession();

  if (!session?.userId) {
    // Ako nema sesije (ili userId nije u njoj), preusmjeri na prijavu
    // Ako je korisnik već na /login, ne preusmjeravaj ponovno da se izbjegne petlja
    if (pathname !== '/login') {
      const loginUrl = new URL('/login', request.url);
      // Dodaj 'from' query parametar da znamo odakle je korisnik došao, ako nije /admin/dashboard
      if (pathname !== '/admin/dashboard' && !pathname.startsWith('/api')) {
          loginUrl.searchParams.set('from', pathname);
      }
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next(); // Ako je već na /login, a nema sesije, pusti ga
  }
  
  // Ako korisnik ima sesiju i pokušava pristupiti /login, preusmjeri ga na dashboard
  if (session?.userId && pathname === '/login') {
    return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  }

  // Ako je sesija validna i korisnik nije na /login, dopusti pristup
  // Ovdje se kasnije može dodati provjera uloga (session.role) za specifične /admin rute
  // Primjer:
  // if (pathname.startsWith('/admin/users') && session.role !== 'admin') {
  //   return NextResponse.redirect(new URL('/admin/dashboard?error=unauthorized', request.url));
  // }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Podudaranje svih putanja osim:
     * - _next/static (statičke datoteke)
     * - _next/image (optimizacija slika)
     * - favicon.ico (favicon datoteka)
     * - /tv/* (javni TV prikaz)
     * - /api/test-db (za testiranje baze)
     * Cilj je da middleware obrađuje sve što je relevantno za autentifikaciju.
     */
    '/((?!_next/static|_next/image|favicon.ico|tv/.*|api/test-db).*)',
  ],
};
