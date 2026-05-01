import Link from 'next/link';
import Image from 'next/image';
import ProfileImage from '@/assets/images/user-default.png';

const ProfileMenu = ({
  profileImage,
  isProfileMenuOpen,
  setIsProfileMenuOpen,
  handleSignOut,
}) => {
  return (
    <div className='relative'>
      <button
        type='button'
        className='rounded-full ring-1 ring-line transition-shadow hover:ring-camel focus:outline-none focus:ring-2 focus:ring-oxblood'
        id='user-menu-button'
        aria-expanded={isProfileMenuOpen}
        aria-haspopup='true'
        onClick={() => setIsProfileMenuOpen((prev) => !prev)}
      >
        <span className='sr-only'>Open user menu</span>
        <Image
          src={profileImage || ProfileImage}
          width={36}
          height={36}
          className='rounded-full'
          alt='User profile'
        />
      </button>
      {isProfileMenuOpen && (
        <div
          className='absolute right-0 z-10 mt-3 w-48 origin-top-right rounded-md border border-line bg-paper py-1 shadow-lg ring-1 ring-black/5'
          role='menu'
          aria-orientation='vertical'
          aria-labelledby='user-menu-button'
          tabIndex='-1'
        >
          <Link
            href='/profile'
            className='block px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-cream-deep'
            role='menuitem'
            tabIndex='-1'
            id='user-menu-item-0'
            onClick={() => setIsProfileMenuOpen(false)}
          >
            Your Profile
          </Link>
          <Link
            href='/products/saved'
            className='block px-4 py-2 text-sm text-ink-soft transition-colors hover:bg-cream-deep'
            role='menuitem'
            tabIndex='-1'
            id='user-menu-item-1'
            onClick={() => setIsProfileMenuOpen(false)}
          >
            Saved Cuts
          </Link>
          <button
            type='button'
            className='block w-full px-4 py-2 text-left text-sm text-ink-soft transition-colors hover:bg-cream-deep'
            role='menuitem'
            tabIndex='-1'
            id='user-menu-item-2'
            onClick={() => {
              setIsProfileMenuOpen(false);
              handleSignOut();
            }}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
