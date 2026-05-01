'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';

import MobileMenu from './MobileMenu';
import ProfileMenu from './ProfileMenu';
import AuthLinks from './AuthLinks';
import DesktopMenu from './DesktopMenu';
import CartButton from '../cart/CartButton';
import Logo from './Logo';

const Navbar = () => {
  const { data: session } = useSession();

  const isLoggedIn = session && session.user;
  const isAdmin = isLoggedIn && session.user.isAdmin;
  const profileImage = isLoggedIn
    ? session.user.image
    : '/images/user-default.png';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Signed Out Successfully');
      router.replace('/');
    } catch (error) {
      console.error(error);
      toast.error('Failed To Sign Out');
    }
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  useEffect(() => {
    if (!isLoggedIn) {
      setLoading(false);
      return;
    }
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <nav className='bg-navbar-bg'>
      <div className='mx-auto max-w-7xl px-2 sm:px-6 lg:px-8'>
        <div className='relative flex h-16 items-center justify-between'>
          <div className='absolute inset-y-0 left-0 flex items-center sm:hidden'>
            <button
              type='button'
              className='inline-flex items-center justify-center rounded-md p-2 text-gray-400 hover:bg-gray-700 hover:text-white focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white'
              aria-controls='mobile-menu'
              aria-expanded={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
            >
              <span className='sr-only'>Open main menu</span>
              {isMobileMenuOpen ? (
                <svg
                  className='block h-6 w-6'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M6 18L18 6M6 6l12 12'
                  />
                </svg>
              ) : (
                <svg
                  className='block h-6 w-6'
                  xmlns='http://www.w3.org/2000/svg'
                  fill='none'
                  viewBox='0 0 24 24'
                  stroke='currentColor'
                  aria-hidden='true'
                >
                  <path
                    strokeLinecap='round'
                    strokeLinejoin='round'
                    strokeWidth='2'
                    d='M4 6h16M4 12h16M4 18h16'
                  />
                </svg>
              )}
            </button>
          </div>
          <DesktopMenu isAdmin={isAdmin} />
          <Logo />
          {isLoggedIn ? (
            <div className='flex items-center gap-4'>
              <CartButton />
              <ProfileMenu
                profileImage={profileImage}
                isProfileMenuOpen={isProfileMenuOpen}
                setIsProfileMenuOpen={setIsProfileMenuOpen}
                handleSignOut={handleSignOut}
              />
            </div>
          ) : (
            <AuthLinks handleSignIn={signIn} />
          )}
        </div>
      </div>
      {isMobileMenuOpen && (
        <MobileMenu
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          closeMobileMenu={closeMobileMenu}
          handleSignIn={signIn}
        />
      )}
    </nav>
  );
};

export default Navbar;
