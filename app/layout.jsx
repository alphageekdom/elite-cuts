import Footer from '@/components/Footer';
import Navbar from '@/components/navbar/Navbar';
import './globals.css';

import { GlobalProvider } from '@/context/GlobalContext';
import AuthProvider from '@/components/AuthProvider';
import { CartProvider } from '@/context/CartContext';

import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import 'photoswipe/dist/photoswipe.css';

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
          <html lang='en'>
            <body>
              <Navbar />
              <main>{children}</main>
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
