import { Fraunces, Instrument_Sans } from 'next/font/google';

import Footer from '@/components/layout/Footer';
import Navbar from '@/components/navbar/Navbar';
import './globals.css';

import { GlobalProvider } from '@/context/GlobalContext';
import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

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

export const metadata = {
  title: 'Elite Cuts | Luxury Cuts',
  description: 'Explore your new favorite cut',
  keywords: 'butcher shop, steaks, poultry, pork',
};

const MainLayout = ({ children }) => {
  return (
    <GlobalProvider>
      <AuthProvider>
        <CartProvider>
          <html
            lang='en'
            className={`${fraunces.variable} ${instrument.variable}`}
          >
            <body className='bg-cream font-sans text-ink antialiased'>
              <Navbar />
              <main className='pt-20'>{children}</main>
              <Footer />
              <ToastContainer />
            </body>
          </html>
        </CartProvider>
      </AuthProvider>
    </GlobalProvider>
  );
};

export default MainLayout;
