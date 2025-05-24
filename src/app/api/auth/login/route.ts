
import { NextRequest, NextResponse } from 'next/server';
import { getUserByUsernameWithPassword } from '@/lib/data';
import { comparePasswords, createSession } from '@/lib/authUtils';
import { z } from 'zod';

const loginSchema = z.object({
  username: z.string(),
  password: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json({ message: 'Nevažeći podaci.' }, { status: 400 });
    }

    const { username, password } = parsed.data;
    const user = await getUserByUsernameWithPassword(username);

    // Poboljšana provjera korisnika i njegove hashirane lozinke
    if (!user || !user.passwordHash || typeof user.passwordHash !== 'string' || user.passwordHash.trim() === '') {
      if (user && (!user.passwordHash || typeof user.passwordHash !== 'string' || user.passwordHash.trim() === '')) {
          console.error(`Pokušaj prijave za korisnika ${username}: Korisnik pronađen, ali hash lozinke je neispravan ili prazan.`);
      }
      return NextResponse.json({ message: 'Korisnik nije pronađen ili podaci nisu ispravni.' }, { status: 401 });
    }

    const passwordsMatch = await comparePasswords(password, user.passwordHash);
    if (!passwordsMatch) {
      return NextResponse.json({ message: 'Netočna lozinka.' }, { status: 401 });
    }

    // Kreiraj sesiju (postavi kolačić)
    await createSession(user.id, user.role);

    return NextResponse.json({ message: 'Prijava uspješna!' }, { status: 200 });
  } catch (error) {
    console.error('Greška pri prijavi:', error); // Ova linija logira stvarnu grešku na serveru
    return NextResponse.json({ message: 'Interna greška servera.' }, { status: 500 });
  }
}

