'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession, signIn } from 'next-auth/react';

interface FormState {
  email: string;
  password: string;
  rememberMe: boolean;
}

interface TouchedState {
  email: boolean;
  password: boolean;
}

import { EMAIL_RE } from '@/lib/validation';

import { FieldValidationIcon as FieldIcon } from '@/components/auth/FieldValidationIcon';
import { GoogleIcon, GitHubIcon } from '@/components/auth/OAuthIcons';
import {
  useSignInLockout,
  formatLockoutCountdown,
} from '@/hooks/useSignInLockout';

const INPUT_CLASS =
  'w-full border-0 border-b border-line bg-transparent text-ink text-base py-2 pb-3.5 pr-6 outline-none placeholder:text-muted/60 focus:border-oxblood transition-colors duration-300';

export default function Login() {
  const router = useRouter();
  const { data: session } = useSession();
  const [formData, setFormData] = useState<FormState>({
    email: '',
    password: '',
    rememberMe: false,
  });
  const [touched, setTouched] = useState<TouchedState>({
    email: false,
    password: false,
  });
  const [loading, setLoading] = useState(false);

  // Tracks the rate-limit lockout countdown. The backend is the source of
  // truth for the actual block; this hook just drives the UI countdown.
  // sessionStorage-backed inside the hook so a refresh keeps the user
  // disabled while the backend still rejects them.
  const { isLocked, lockSecondsLeft, registerLockoutFromMessage } =
    useSignInLockout();

  useEffect(() => {
    if (session) router.replace('/');
  }, [session, router]);

  const anyTouched = Object.values(touched).some(Boolean);

  const showIcon = (field: keyof TouchedState) =>
    touched[field] || (anyTouched && formData[field].length > 0);

  const validity = {
    email: EMAIL_RE.test(formData.email),
    password: formData.password.length >= 6,
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    if (name in touched) setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isLocked) return;
    if (!formData.email || !formData.password) {
      toast.error('Please enter both email and password');
      return;
    }
    setLoading(true);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email: formData.email,
        password: formData.password,
      });
      if (res?.error) {
        const wasLockout = registerLockoutFromMessage(res.error);
        toast.error(wasLockout ? res.error : 'Invalid email or password');
      } else {
        toast.success('Signed in successfully');
        router.push('/');
      }
    } catch {
      toast.error('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid min-h-[calc(100vh-5rem)] md:grid-cols-2">
      {/* Visual Side */}
      <aside className="relative hidden md:flex overflow-hidden bg-ink text-cream">
        <div
          className="absolute inset-0 animate-[heroZoom_22s_ease-in-out_infinite_alternate]"
          style={{
            backgroundImage:
              'linear-gradient(180deg, rgba(20,16,14,0.5) 0%, rgba(20,16,14,0.4) 50%, rgba(20,16,14,0.85) 100%), url("https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?w=1600&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1.05)',
          }}
        />
        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 xl:p-14">
          <div className="max-w-[36ch]">
            <div className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase mb-7 opacity-85">
              <span className="w-7 h-px bg-current opacity-60" />
              Welcome back
            </div>
            <blockquote className="font-display text-[clamp(28px,2.6vw,38px)] font-normal leading-[1.15] tracking-[-0.02em] mb-7">
              "There is no love sincerer than the love of{' '}
              <em className="italic text-camel-soft">good food.</em>"
            </blockquote>
            <p className="font-display italic text-[13px] tracking-[0.04em] opacity-75">
              — George Bernard Shaw
            </p>
          </div>

          <div className="flex justify-between text-[11px] tracking-[0.18em] uppercase opacity-60">
            <span>EC · Member Access</span>
            <span>Est. 2018</span>
          </div>
        </div>
      </aside>

      {/* Form Side */}
      <section className="flex flex-col px-8 py-8 md:px-14">
        <div className="flex justify-end text-sm">
          <span className="text-muted">
            New here?{' '}
            <Link href="/register" className="text-oxblood font-medium border-b border-oxblood pb-px">
              Create an account
            </Link>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-105">
            <span
              className="auth-reveal block font-display italic text-sm text-camel mb-4 tracking-[0.02em]"
              style={{ animationDelay: '0.1s' }}
            >
              ↗ Sign in
            </span>
            <h1
              className="auth-reveal font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-[1.05] tracking-tight mb-4"
              style={{ animationDelay: '0.2s' }}
            >
              Good to see you <em className="italic text-oxblood">again.</em>
            </h1>
            <p
              className="auth-reveal text-ink-soft mb-12 text-[15px] leading-relaxed max-w-[38ch]"
              style={{ animationDelay: '0.3s' }}
            >
              Sign in to track orders, save your cuts, and check out faster next time.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="auth-reveal mb-7" style={{ animationDelay: '0.4s' }}>
                <label htmlFor="email" className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3">
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    disabled={isLocked}
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                    className={`${INPUT_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  <FieldIcon show={showIcon('email')} valid={validity.email} />
                </div>
              </div>

              {/* Password */}
              <div className="auth-reveal mb-7" style={{ animationDelay: '0.5s' }}>
                <label htmlFor="password" className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3">
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Enter your password"
                    required
                    disabled={isLocked}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="current-password"
                    className={`${INPUT_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  <FieldIcon show={showIcon('password')} valid={validity.password} />
                </div>
              </div>

              {/* Remember me + Forgot password */}
              <div
                className="auth-reveal flex justify-between items-center mb-9"
                style={{ animationDelay: '0.55s' }}
              >
                <label className="inline-flex items-center gap-2.5 text-[13px] text-ink-soft cursor-pointer select-none">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleChange}
                    className="auth-check"
                  />
                  Remember me
                </label>
                <Link href="#" className="text-[13px] text-ink-soft hover:text-oxblood transition-colors duration-300">
                  Forgot password?
                </Link>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading || isLocked}
                className="auth-reveal w-full flex items-center justify-center gap-3 px-7 py-4.5 bg-ink text-cream rounded-full text-sm font-medium tracking-[0.04em] hover:bg-oxblood hover:-translate-y-px transition-all duration-300 disabled:opacity-60 disabled:hover:bg-ink disabled:hover:translate-y-0 disabled:cursor-not-allowed"
                style={{ animationDelay: '0.6s' }}
              >
                {isLocked
                  ? `Try again in ${formatLockoutCountdown(lockSecondsLeft!)}`
                  : loading
                    ? 'Signing in…'
                    : 'Sign in'}
                {!loading && !isLocked && (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                )}
              </button>

              {/* Divider */}
              <div
                className="auth-reveal flex items-center gap-4 my-9 text-muted text-[11px] tracking-[0.22em] uppercase"
                style={{ animationDelay: '0.65s' }}
              >
                <span className="flex-1 h-px bg-line-soft" />
                or continue with
                <span className="flex-1 h-px bg-line-soft" />
              </div>

              {/* Social buttons */}
              <div className="auth-reveal grid grid-cols-2 gap-3" style={{ animationDelay: '0.7s' }}>
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-transparent text-ink border border-line rounded-full text-sm font-medium hover:border-ink hover:bg-paper transition-all duration-300"
                >
                  <GoogleIcon />
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => signIn('github', { callbackUrl: '/' })}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-transparent text-ink border border-line rounded-full text-sm font-medium hover:border-ink hover:bg-paper transition-all duration-300"
                >
                  <GitHubIcon />
                  GitHub
                </button>
              </div>
            </form>

            <p
              className="auth-reveal text-center mt-10 text-sm text-ink-soft"
              style={{ animationDelay: '0.75s' }}
            >
              By signing in, you agree to our{' '}
              <Link href="#" className="text-oxblood font-medium border-b border-oxblood pb-px">Terms</Link>
              {' '}&amp;{' '}
              <Link href="#" className="text-oxblood font-medium border-b border-oxblood pb-px">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
