'use client';

import { useState, useEffect } from 'react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import MobileMenu from './MobileMenu';
import ProfileMenu from './ProfileMenu';
import AuthLinks from './AuthLinks';
import DesktopMenu from './DesktopMenu';
import CartButton from '../cart/CartButton';
import Logo from './Logo';

const SCROLL_THRESHOLD = 60;

const Navbar = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isLoggedIn = Boolean(session?.user);
  const isAdmin = isLoggedIn && session.user.isAdmin;
  const profileImage = isLoggedIn
    ? session.user.image
    : '/images/user-default.png';

  // Only the home route shows the navbar transparent over a hero;
  // every other route stays in the readable cream/ink state.
  const isOverHero = pathname === '/';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(!isOverHero);

  useEffect(() => {
    if (!isOverHero) {
      setScrolled(true);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, [isOverHero]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const closeMobileMenu = () => setIsMobileMenuOpen(false);

  const headerToneClass = scrolled
    ? 'bg-cream/85 backdrop-blur-lg border-b border-line py-3.5'
    : 'bg-transparent border-b border-transparent py-5';

  const triggerToneClass = scrolled
    ? 'text-ink-soft hover:bg-cream-deep'
    : 'text-cream hover:bg-white/10';

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,padding,border-color] duration-400 ease-out ${headerToneClass}`}
    >
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-10'>
          <Logo scrolled={scrolled} />
          <DesktopMenu isAdmin={isAdmin} scrolled={scrolled} />
        </div>

        <div className='flex items-center gap-4'>
          {isLoggedIn ? (
            <>
              <CartButton scrolled={scrolled} />
              <ProfileMenu
                profileImage={profileImage}
                isProfileMenuOpen={isProfileMenuOpen}
                setIsProfileMenuOpen={setIsProfileMenuOpen}
                handleSignOut={handleSignOut}
              />
            </>
          ) : (
            <AuthLinks handleSignIn={signIn} scrolled={scrolled} />
          )}

          <button
            type='button'
            className={`inline-flex items-center justify-center rounded-md p-2 transition-colors focus:outline-none focus:ring-2 focus:ring-oxblood md:hidden ${triggerToneClass}`}
            aria-controls='mobile-menu'
            aria-expanded={isMobileMenuOpen}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            <span className='sr-only'>Open main menu</span>
            <svg
              className='h-6 w-6'
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
                d={
                  isMobileMenuOpen
                    ? 'M6 18L18 6M6 6l12 12'
                    : 'M4 6h16M4 12h16M4 18h16'
                }
              />
            </svg>
          </button>
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
    </header>
  );
};

export default Navbar;
