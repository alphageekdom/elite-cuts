import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

import './globals.css';

import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext';
import { ShopSettingsProvider } from '@/context/ShopSettingsContext';
import { getShopSettings } from '@/lib/shopSettings';

import { Toaster } from 'sonner';

import 'photoswipe/dist/photoswipe.css';

const fraunces = Fraunces({
  subsets: ['latin'],
  variable: '--font-fraunces',
  display: 'swap',
});

const instrument = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-instrument',
  display: 'swap',
});

const jetbrains = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains',
  display: 'swap',
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getShopSettings();
  return {
    title: {
      default: `${settings.shopName} — Premium Butcher, ${settings.city}`,
      template: `%s · ${settings.shopName}`,
    },
    description: settings.description,
  };
}

export default async function RootLayout({ children }: { children: ReactNode }) {
  const settings = await getShopSettings();
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable}`}
    >
      <body className="bg-cream font-sans text-ink antialiased">
        <AuthProvider>
          <CartProvider>
            <ShopSettingsProvider value={settings}>
              {children}
            </ShopSettingsProvider>
          </CartProvider>
        </AuthProvider>
        <Toaster richColors position='bottom-right' />
      </body>
    </html>
  );
}
