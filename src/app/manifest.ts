import type { MetadataRoute } from 'next';

// Lets owners add Memba to their home screen from the browser. No offline mode yet.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Memba',
    short_name: 'Memba',
    description: 'Remind customers who owe you money, and record what they pay.',
    start_url: '/today',
    display: 'standalone',
    background_color: '#F6F4EE',
    theme_color: '#F6F4EE',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
