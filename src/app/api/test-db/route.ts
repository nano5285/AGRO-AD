import { NextResponse } from 'next/server';
import { testDBConnection } from '@/lib/db';

export async function GET() {
  console.log("API ruta /api/test-db pozvana");
  const result = await testDBConnection();
  if (result.success) {
    return NextResponse.json({ message: result.message });
  } else {
    return NextResponse.json({ error: result.message }, { status: 500 });
  }
}
