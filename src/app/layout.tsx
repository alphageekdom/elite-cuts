import type { Metadata } from 'next';
import type { ReactNode } from 'react';

import { Fraunces, Instrument_Sans, JetBrains_Mono } from 'next/font/google';

import './globals.css';

import { GlobalProvider } from '@/context/GlobalContext';
import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext';

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

export const metadata: Metadata = {
  title: 'Elite Cuts | Luxury Cuts',
  description: 'Explore your next saved cut',
  keywords: 'butcher shop, steaks, poultry, pork',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <GlobalProvider>
      <AuthProvider>
        <CartProvider>
          <html
            lang="en"
            className={`${fraunces.variable} ${instrument.variable} ${jetbrains.variable}`}
          >
            <body className="bg-cream font-sans text-ink antialiased">
              {children}
              <Toaster richColors position='bottom-right' />
            </body>
          </html>
        </CartProvider>
      </AuthProvider>
    </GlobalProvider>
  );
}
