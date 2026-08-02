'use client';

import { useEffect, useState } from 'react';
import { signOut, useSession } from 'next-auth/react';
import { usePathname, useRouter } from 'next/navigation';
import { toast } from 'sonner';

import MobileMenu from './MobileMenu';
import ProfileMenu from './ProfileMenu';
import AuthLinks from './AuthLinks';
import DesktopMenu from './DesktopMenu';
import AnnouncementBell from './AnnouncementBell';
import CartButton from '../cart/CartButton';
import CartExpiryBanner from '../cart/CartExpiryBanner';
import DemoModeChip from '../demo/DemoModeChip';
import Logo from './Logo';
import { getInitials } from '@/lib/format';
import { FOCUS_RING } from '@/lib/styles';
import { useIsMounted } from '@/hooks/useIsMounted';
import type { Announcement } from '@/lib/announcements/data';

const SCROLL_THRESHOLD = 60;
const LG_BREAKPOINT_PX = 1024;

type NavbarProps = {
  announcements?: Announcement[];
  /**
   * `getPickupNote().timing` from the layout — the sheet's footer line.
   * Required so a new route-group layout can't quietly ship without it and
   * drop the line; both existing layouts resolve it via `getPickupNoteNow`.
   */
  pickupTiming: string;
};

const Navbar = ({ announcements = [], pickupTiming }: NavbarProps) => {
  const isMounted = useIsMounted();
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  const isSessionLoading = status === 'loading';
  const isLoggedIn = Boolean(session?.user);
  const isAdmin = Boolean(session?.user?.isAdmin);
  const profileImage = session?.user?.image ?? undefined;
  const userName = session?.user?.name ?? '';
  const userEmail = session?.user?.email ?? '';
  const userId = session?.user?.userId ?? '';
  // Only used to pick the avatar colour. The session's copy is stamped at
  // sign-in and never refreshed, so it must not be displayed as a number —
  // `ProfileMenuStanding` fetches live standing for that.
  const rewardPoints = session?.user?.rewardPoints ?? 0;
  const userInitials = getInitials(userName);

  // Only the home route shows the navbar transparent over a hero;
  // every other route stays in the readable cream/ink state.
  const isOverHero = pathname === '/';

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [scrollPastThreshold, setScrollPastThreshold] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  // The cart expiry banner forces the navbar into its solid "scrolled" state
  // so the transparent hero treatment doesn't bleed through behind the banner.
  // Non-hero routes always read as scrolled so the readable cream/ink state
  // shows from first paint without a setState-in-effect hop.
  const scrolled = !isOverHero || scrollPastThreshold || bannerVisible;

  useEffect(() => {
    if (!isOverHero) return;
    const handleScroll = () =>
      setScrollPastThreshold(window.scrollY > SCROLL_THRESHOLD);
    window.addEventListener('scroll', handleScroll, { passive: true });
    // Read initial scroll on the next frame so the setState lands async (avoids
    // setState-in-effect) but still catches back/forward nav that restored the
    // page past the threshold.
    const rafId = requestAnimationFrame(handleScroll);
    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isOverHero]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= LG_BREAKPOINT_PX) setIsMobileMenuOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close any open menu when the route changes (link clicks, back/forward, etc).
  // Adjust state while rendering so the close lands in the same render as the
  // pathname change rather than a cascading effect tick.
  const [lastPathname, setLastPathname] = useState(pathname);
  if (lastPathname !== pathname) {
    setLastPathname(pathname);
    if (isMobileMenuOpen) setIsMobileMenuOpen(false);
    if (isProfileMenuOpen) setIsProfileMenuOpen(false);
  }

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
          <DemoModeChip />
          <CartButton scrolled={scrolled} />
          <AnnouncementBell
            announcements={announcements}
            scrolled={scrolled}
          />

          {!isSessionLoading && (
            <div className='hidden items-center gap-4 lg:flex'>
              {isLoggedIn ? (
                <ProfileMenu
                  profileImage={profileImage}
                  name={userName}
                  email={userEmail}
                  initials={userInitials}
                  userId={userId}
                  isAdmin={isAdmin}
                  rewardPoints={rewardPoints}
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
            className={`inline-flex items-center justify-center rounded-md p-2.5 transition-colors motion-reduce:transition-none lg:hidden ${FOCUS_RING} ${triggerToneClass}`}
            // Only once the sheet is actually in the document. It is portalled
            // and gated on both mount and the session resolving, so the id does
            // not exist in the server HTML — and an `aria-controls` pointing at
            // a missing id is a dangling reference. Same rule the cart drawer's
            // own trigger follows.
            aria-controls={
              isMounted && !isSessionLoading ? 'mobile-menu' : undefined
            }
            aria-expanded={isMobileMenuOpen}
            aria-label={isMobileMenuOpen ? 'Close main menu' : 'Open main menu'}
            onClick={() => setIsMobileMenuOpen((prev) => !prev)}
          >
            {/* Always the bars, never an X: the open sheet's scrim covers the
                header, so the "close" state was never actually on screen — and
                the sheet carries its own close button. */}
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
                d='M4 9h16M4 15h16'
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Always mounted (not gated on `isMobileMenuOpen`) so the sheet can slide
          in and out rather than appearing and vanishing — the same reason
          `CartDrawer` stays mounted. `inert` keeps it out of the tab order and
          the a11y tree while closed. */}
      {!isSessionLoading && (
        <MobileMenu
          isOpen={isMobileMenuOpen}
          isAdmin={isAdmin}
          isLoggedIn={isLoggedIn}
          name={userName}
          email={userEmail}
          initials={userInitials}
          userId={userId}
          rewardPoints={rewardPoints}
          pathname={pathname}
          pickupTiming={pickupTiming}
          closeMobileMenu={closeMobileMenu}
          onSignOut={handleSignOut}
        />
      )}
      {/* Cart expiry banner sits flush against the navbar's bottom edge —
          absolute top-full follows the header through its py-5 ↔ py-3.5 shrink
          so there can never be a gap. */}
      <div className='absolute top-full left-0 right-0'>
        <CartExpiryBanner onVisibleChange={setBannerVisible} />
      </div>
    </header>
  );
};

export default Navbar;
