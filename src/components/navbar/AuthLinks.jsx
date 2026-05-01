import Link from 'next/link';

const AuthLinks = ({ handleSignIn, scrolled = false }) => {
  const loginColor = scrolled ? 'text-ink' : 'text-cream';

  return (
    <div className='flex items-center gap-6'>
      <Link
        href='/login'
        onClick={handleSignIn}
        className={`hidden text-sm font-medium tracking-wide opacity-85 transition-opacity duration-300 hover:opacity-100 md:inline ${loginColor}`}
      >
        Login
      </Link>
      <Link
        href='/register'
        className='inline-flex items-center rounded-full bg-oxblood px-5 py-2.5 text-sm font-medium tracking-wide text-cream transition-all duration-300 hover:-translate-y-px hover:bg-oxblood-deep'
      >
        Register
      </Link>
    </div>
  );
};

export default AuthLinks;
