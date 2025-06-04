
'use server';

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Readable } from 'stream';

const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;

if (!AZURE_STORAGE_CONNECTION_STRING) {
  throw new Error("Azure Storage Connection String not found in environment variables.");
}
if (!AZURE_STORAGE_ACCOUNT_NAME) {
  throw new Error("Azure Storage Account Name not found in environment variables.");
}

const blobServiceClient = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function getContainerClient(containerName: string): Promise<ContainerClient> {
  const containerClient = blobServiceClient.getContainerClient(containerName);
  // Opcionalno: provjerite postoji li container i kreirajte ga ako ne postoji (samo za razvojne svrhe)
  // await containerClient.createIfNotExists({ access: 'blob' }); // 'blob' za javni pristup blobovima
  return containerClient;
}

export async function uploadFileToBlobStorage(
  fileBuffer: Buffer,
  containerName: string,
  originalFileName: string,
  contentType: string
): Promise<string> {
  if (!fileBuffer) {
    throw new Error('File buffer is required for upload.');
  }
  if (!containerName) {
    throw new Error('Container name is required.');
  }
  if (!originalFileName) {
    throw new Error('Original file name is required.');
  }

  const containerClient = await getContainerClient(containerName);
  
  // Kreiranje jedinstvenog imena za blob kako bi se izbjegli konflikti
  const uniqueBlobName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${originalFileName.replace(/\s+/g, '_')}`;
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: contentType }
  });

  // URL do bloka je: https://<accountName>.blob.core.windows.net/<containerName>/<blobName>
  return `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${uniqueBlobName}`;
}
