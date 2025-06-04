
import { NextRequest, NextResponse } from 'next/server';
import { uploadFileToBlobStorage } from '@/lib/azure-blob-storage';
import { getSession } from '@/lib/authUtils'; // Zaštita rute

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session?.userId) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;
  if (!AZURE_STORAGE_CONTAINER_NAME) {
    console.error("AZURE_STORAGE_CONTAINER_NAME is not set in environment variables.");
    return NextResponse.json({ success: false, error: 'Server configuration error for storage container.' }, { status: 500 });
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file provided.' }, { status: 400 });
    }

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'video/ogg'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ success: false, error: `Unsupported file type: ${file.type}. Supported types are: ${allowedTypes.join(', ')}` }, { status: 400 });
    }
    
    // Ograničenje veličine datoteke na npr. 10MB za slike, 100MB za video
    const maxSizeImage = 10 * 1024 * 1024; // 10 MB
    const maxSizeVideo = 100 * 1024 * 1024; // 100 MB

    if ((file.type.startsWith('image/')) && file.size > maxSizeImage) {
      return NextResponse.json({ success: false, error: `Image file too large. Max size is ${maxSizeImage / (1024*1024)}MB.` }, { status: 400 });
    }
    if ((file.type.startsWith('video/')) && file.size > maxSizeVideo) {
      return NextResponse.json({ success: false, error: `Video file too large. Max size is ${maxSizeVideo / (1024*1024)}MB.` }, { status: 400 });
    }


    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const fileUrl = await uploadFileToBlobStorage(buffer, AZURE_STORAGE_CONTAINER_NAME, file.name, file.type);

    return NextResponse.json({ success: true, url: fileUrl }, { status: 200 });
  } catch (error: any) {
    console.error('Error uploading file to Azure Blob Storage:', error);
    return NextResponse.json({ success: false, error: `Failed to upload file: ${error.message || 'Unknown error'}` }, { status: 500 });
  }
}
