// components/ProfileMenu.js
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
        className='rounded-full bg-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-gray-800'
        id='user-menu-button'
        aria-expanded='false'
        aria-haspopup='true'
        onClick={() => setIsProfileMenuOpen((prev) => !prev)}
      >
        <span className='sr-only'>Open user menu</span>
        <Image
          src={profileImage || ProfileImage}
          width={40}
          height={40}
          className='rounded-full'
          alt='User profile'
        />
      </button>
      {isProfileMenuOpen && (
        <div
          className='absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none'
          role='menu'
          aria-orientation='vertical'
          aria-labelledby='user-menu-button'
          tabIndex='-1'
        >
          <Link
            href='/profile'
            className='block px-4 py-2 text-sm text-gray-700'
            role='menuitem'
            tabIndex='-1'
            id='user-menu-item-0'
            onClick={() => setIsProfileMenuOpen(false)}
          >
            Your Profile
          </Link>
          <Link
            href='/products/saved'
            className='block px-4 py-2 text-sm text-gray-700'
            role='menuitem'
            tabIndex='-1'
            id='user-menu-item-1'
            onClick={() => setIsProfileMenuOpen(false)}
          >
            Saved Cuts
          </Link>
          <Link
            href='#'
            className='block px-4 py-2 text-sm text-gray-700'
            role='menuitem'
            tabIndex='-1'
            id='user-menu-item-2'
            onClick={() => {
              setIsProfileMenuOpen(false);
              handleSignOut();
            }}
          >
            Sign Out
          </Link>
        </div>
      )}
    </div>
  );
};

export default ProfileMenu;
