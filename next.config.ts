
import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      { // Dodano za Azure Blob Storage
        protocol: 'https',
        hostname: `${process.env.AZURE_STORAGE_ACCOUNT_NAME}.blob.core.windows.net`, // Koristi varijablu okruženja
        port: '',
        pathname: '/**', // Dozvoli sve putanje unutar containera
      },
    ],
  },
};

export default nextConfig;
