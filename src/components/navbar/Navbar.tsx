'use client';

import { useState, useEffect } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';

import MobileMenu from './MobileMenu';
import ProfileMenu from './ProfileMenu';
import AuthLinks from './AuthLinks';
import DesktopMenu from './DesktopMenu';
import CartButton from '../cart/CartButton';
import Logo from './Logo';
import { FOCUS_RING } from '@/lib/styles';

const SCROLL_THRESHOLD = 60;
const LG_BREAKPOINT_PX = 1024;

const Navbar = () => {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isSessionLoading = status === 'loading';
  const isLoggedIn = Boolean(session?.user);
  const isAdmin = Boolean(session?.user?.isAdmin);
  const profileImage = session?.user?.image ?? undefined;

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
    const handleScroll = () => setScrolled(window.scrollY > SCROLL_THRESHOLD);
    handleScroll();
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [isOverHero]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= LG_BREAKPOINT_PX) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isMobileMenuOpen && !isProfileMenuOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setIsMobileMenuOpen(false);
      setIsProfileMenuOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobileMenuOpen, isProfileMenuOpen]);

  // Close any open menu when the route changes (link clicks, back/forward, etc).
  useEffect(() => {
    setIsMobileMenuOpen(false);
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Lock body scroll while the mobile menu is open.
  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isMobileMenuOpen]);

  const handleSignOut = async () => {
    try {
      await signOut({ redirect: false });
      toast.success('Signed out successfully');
      router.replace('/');
    } catch (error) {
      console.error(error);
      toast.error('Failed to sign out');
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
      className={`fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter,padding,border-color] duration-300 ease-out motion-reduce:transition-none ${headerToneClass}`}
    >
      <div className='mx-auto flex max-w-7xl items-center justify-between gap-8 px-4 sm:px-6 lg:px-8'>
        <div className='flex items-center gap-10'>
          <Logo scrolled={scrolled} />
          <nav aria-label='Primary navigation' className='hidden lg:block'>
            <DesktopMenu isAdmin={isAdmin} scrolled={scrolled} />
          </nav>
        </div>

        <div className='flex items-center gap-4'>
          <CartButton scrolled={scrolled} />

          {!isSessionLoading && (
            <div className='hidden items-center gap-4 lg:flex'>
              {isLoggedIn ? (
                <ProfileMenu
                  profileImage={profileImage}
                  isOpen={isProfileMenuOpen}
                  onToggle={() => setIsProfileMenuOpen((prev) => !prev)}
                  onClose={() => setIsProfileMenuOpen(false)}
                  onSignOut={handleSignOut}
                />
              ) : (
                <AuthLinks scrolled={scrolled} />
              )}
            </div>
          )}

          <button
            type='button'
            className={`inline-flex items-center justify-center rounded-md p-2 transition-colors motion-reduce:transition-none lg:hidden ${FOCUS_RING} ${triggerToneClass}`}
            aria-controls='mobile-menu'
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
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
                strokeWidth={2}
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

      {isMobileMenuOpen && !isSessionLoading && (
        <MobileMenu
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          closeMobileMenu={closeMobileMenu}
        />
      )}
    </header>
  );
};

export default Navbar;
