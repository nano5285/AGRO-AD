
import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/authUtils';

export async function POST() {
  try {
    await deleteSession();
    return NextResponse.json({ message: 'Odjava uspješna' }, { status: 200 });
  } catch (error) {
    console.error('Greška pri odjavi:', error);
    return NextResponse.json({ message: 'Interna greška servera prilikom odjave' }, { status: 500 });
  }
}
