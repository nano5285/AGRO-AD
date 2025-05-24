
'use client';
// Ova stranica će sada biti zaštićena middleware-om.
// Ako korisnik nije prijavljen, middleware će ga preusmjeriti na /login.
// Ako je prijavljen, bit će preusmjeren na /admin/dashboard (ili će ostati ovdje ako je /admin/dashboard početna ruta).
// Stoga, ova komponenta se možda neće ni prikazivati ako je middleware uvijek preusmjeri.
// Za sada, zadržat ćemo preusmjeravanje na dashboard, ali middleware ima glavnu ulogu.

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function HomePage() {
  const router = useRouter();

  useEffect(() => {
    // Middleware bi trebao odraditi preusmjeravanje, ali ovo može poslužiti kao fallback
    // ili ako korisnik direktno dođe na '/' nakon prijave.
    router.replace('/admin/dashboard');
  }, [router]);

  return (
    <div className="flex h-screen items-center justify-center">
      <p>Preusmjeravanje...</p>
    </div>
  );
}
