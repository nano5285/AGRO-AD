'use server';

import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';
import { Readable } from 'stream';

// Deklariramo varijable za instancu klijenta, ali ih ne inicijaliziramo odmah
let blobServiceClientInstance: BlobServiceClient | null = null;

// Funkcija za dohvaćanje ili inicijalizaciju BlobServiceClient instance
function getBlobServiceClient(): BlobServiceClient {
  if (!blobServiceClientInstance) {
    const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
    if (!AZURE_STORAGE_CONNECTION_STRING) {
      throw new Error("Azure Storage Connection String not found in environment variables.");
    }
    blobServiceClientInstance = BlobServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);
  }
  return blobServiceClientInstance;
}

// Funkcija za upload datoteke na Blob Storage
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

  // Provjere environment varijabli koje su potrebne za URL, ovdje se rade pri pozivu funkcije
  const AZURE_STORAGE_ACCOUNT_NAME = process.env.AZURE_STORAGE_ACCOUNT_NAME;
  const AZURE_STORAGE_CONTAINER_NAME = process.env.AZURE_STORAGE_CONTAINER_NAME;

  if (!AZURE_STORAGE_ACCOUNT_NAME) {
    throw new Error("Azure Storage Account Name not found in environment variables for URL construction.");
  }
  if (!AZURE_STORAGE_CONTAINER_NAME) {
    throw new Error("Azure Storage Container Name is not set in environment variables.");
  }

  // Dohvaćanje BlobServiceClient instance kroz odgođenu inicijalizaciju
  const blobServiceClient = getBlobServiceClient();
  const containerClient = blobServiceClient.getContainerClient(containerName);
  
  // Opcionalno: kreiranje containera ako ne postoji (samo za razvojne svrhe)
  // await containerClient.createIfNotExists({ access: 'blob' }); // 'blob' za javni pristup blobovima

  // Kreiranje jedinstvenog imena za blob kako bi se izbjegli konflikti
  const uniqueBlobName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}-${originalFileName.replace(/\s+/g, '_')}`;
  const blockBlobClient = containerClient.getBlockBlobClient(uniqueBlobName);

  await blockBlobClient.uploadData(fileBuffer, {
    blobHTTPHeaders: { blobContentType: contentType }
  });

  // URL do bloka je: https://<accountName>.blob.core.windows.net/<containerName>/<blobName>
  return `https://${AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net/${containerName}/${uniqueBlobName}`;
}