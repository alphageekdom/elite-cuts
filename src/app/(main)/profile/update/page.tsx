import Link from 'next/link';
import UpdateProfile from '@/components/profile/UpdateProfile';

export default function UpdatePage() {
  return (
    <div className="bg-cream min-h-screen">
      <div className="max-w-300 mx-auto px-5 md:px-8 py-12">

        <nav className="flex items-center gap-3 text-[12px] tracking-[0.18em] uppercase text-muted mb-10">
          <Link href="/" className="hover:text-oxblood transition-colors">Home</Link>
          <span className="opacity-40">/</span>
          <Link href="/profile" className="hover:text-oxblood transition-colors">Profile</Link>
          <span className="opacity-40">/</span>
          <span className="text-ink">Update</span>
        </nav>

        <div className="max-w-lg">
          <p className="font-display italic text-camel text-[13px] mb-1">— Settings</p>
          <h1 className="font-display font-normal text-[clamp(32px,4vw,48px)] leading-none tracking-tight mb-8">
            Update <em className="italic text-oxblood">password</em>
          </h1>

          <div className="bg-paper border border-line-soft rounded p-8">
            <UpdateProfile />
          </div>
        </div>

      </div>
    </div>
  );
}
