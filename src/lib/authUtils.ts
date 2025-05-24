
'use server';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import type { User } from './types'; // Pretpostavljamo da User tip postoji

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'your-fallback-jwt-secret-for-agro-ad');
const COOKIE_NAME = 'agro_ad_session';

if (!process.env.JWT_SECRET) {
  console.warn("UPOZORENJE: JWT_SECRET nije postavljen u .env.local. Koristi se fallback vrijednost. Ovo NIJE SIGURNO za produkciju!");
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePasswords(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

interface SessionPayload {
  userId: string;
  role: User['role'];
  // Možete dodati još podataka u payload ako je potrebno, npr. exp
}

export async function encrypt(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h') // Token vrijedi 24 sata
    .sign(JWT_SECRET);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ['HS256'],
    });
    return payload as SessionPayload;
  } catch (error) {
    console.error('Greška pri dekriptiranju tokena:', error);
    return null;
  }
}

export async function createSession(userId: string, role: User['role']) {
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 sata
  const sessionToken = await encrypt({ userId, role });

  cookies().set(COOKIE_NAME, sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires,
    path: '/',
    sameSite: 'lax', // ili 'strict' ovisno o potrebama
  });
}

export async function getSession(): Promise<SessionPayload | null> {
  const sessionCookie = cookies().get(COOKIE_NAME)?.value;
  if (!sessionCookie) return null;
  return decrypt(sessionCookie);
}

export async function deleteSession() {
  cookies().set(COOKIE_NAME, '', { expires: new Date(0), path: '/' });
}
