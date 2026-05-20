'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { useSession, signIn } from 'next-auth/react';

// Reject anything that isn't a same-origin relative path — guards against open
// redirects when a hostile link drops a full URL into `?callbackUrl=`.
const isSafeCallbackUrl = (url: string | null): url is string =>
  Boolean(url) && url!.startsWith('/') && !url!.startsWith('//');

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
import EditorialEyebrow from '@/components/ui/EditorialEyebrow';
import {
  useSignInLockout,
  formatLockoutCountdown,
} from '@/hooks/useSignInLockout';
import { startDemoSession, type DemoType } from '@/lib/auth/demo-signin';

const INPUT_CLASS =
  'w-full border-0 border-b border-line bg-transparent text-ink text-base py-2 pb-3.5 pr-6 outline-none placeholder:text-muted/60 focus:border-oxblood transition-colors duration-300';

const DEMO_BUTTON_CLASS =
  'inline-flex w-full items-center justify-center rounded-full border border-line px-4 py-3 text-[13px] font-medium tracking-[0.04em] text-ink-soft transition-colors duration-300 hover:border-ink hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:border-line disabled:hover:text-ink-soft motion-reduce:transition-none';

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const rawCallbackUrl = searchParams.get('callbackUrl');
  const callbackUrl = isSafeCallbackUrl(rawCallbackUrl) ? rawCallbackUrl : null;
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
  const [demoPending, setDemoPending] = useState<DemoType | null>(null);

  const handleDemoSignIn = async (demoType: DemoType) => {
    if (demoPending || loading || isLocked) return;
    setDemoPending(demoType);
    const ok = await startDemoSession(demoType);
    if (!ok) setDemoPending(null);
    // On success the helper hard-navigates away, so the pending state stays
    // set until this page is replaced — no need to reset it.
  };

  // Tracks the rate-limit lockout countdown. The backend is the source of
  // truth for the actual block; this hook just drives the UI countdown.
  // sessionStorage-backed inside the hook so a refresh keeps the user
  // disabled while the backend still rejects them.
  const { isLocked, lockSecondsLeft, registerLockoutFromMessage } =
    useSignInLockout();

  useEffect(() => {
    // Check `session.user` rather than `session` — a tombstoned session
    // (admin soft-deleted us) still returns a truthy `session` with an
    // undefined `user`. Without this guard the customer would be unable to
    // reach /login to sign back in.
    if (session?.user) router.replace(callbackUrl ?? '/');
  }, [session, router, callbackUrl]);

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
        // Sign-in can clear two lifecycle states inside authorize(): a soft-
        // delete (cancellation toast) or a dormancy warning (home-page
        // banner per the spec). If both happened in the same sign-in (rare
        // — would mean a user was both soft-deleted and had a stale
        // dormancy warning), the soft-delete toast is the more meaningful
        // reversal and stands alone. The dormancy banner only fires for
        // dormancy-only clears so the two surfaces never double-state the
        // same recovery to the same customer.
        let bannerDormancyCleared = false;
        try {
          const probe = await fetch('/api/users/me/recently-restored');
          if (probe.ok) {
            const data = (await probe.json()) as {
              recentlyRestored?: boolean;
              recentlyDormancyCleared?: boolean;
            };
            if (data.recentlyRestored) {
              toast.success("Welcome back — your deletion request was cancelled.");
            } else {
              bannerDormancyCleared = Boolean(data.recentlyDormancyCleared);
              toast.success('Signed in successfully');
            }
          } else {
            toast.success('Signed in successfully');
          }
        } catch {
          toast.success('Signed in successfully');
        }
        // A safe ?callbackUrl= takes precedence — the user came from a gated
        // action (e.g. cart "Save for later") and we want to land them back
        // where they were so the deferred action can complete. The
        // dormancyCleared banner is only for the default landing.
        if (callbackUrl) {
          router.push(callbackUrl);
        } else {
          router.push(bannerDormancyCleared ? '/?dormancyCleared=1' : '/');
        }
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
          className="absolute inset-0 scale-[1.05] hero-bg-login animate-[heroZoom_22s_ease-in-out_infinite_alternate]"
        />
        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 xl:p-14">
          <div className="max-w-[36ch]">
            <div className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase mb-7 opacity-85">
              <span className="w-7 h-px bg-current opacity-60" />
              Welcome back
            </div>
            <blockquote className="font-display text-[clamp(28px,2.6vw,38px)] font-normal leading-[1.15] tracking-[-0.02em] mb-7">
              &ldquo;There is no love sincerer than the love of{' '}
              <em className="italic text-camel-soft">good food.</em>&rdquo;
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
            <EditorialEyebrow className="auth-reveal mb-4 [animation-delay:100ms]">
              ↗ Sign in
            </EditorialEyebrow>
            <h1 className="auth-reveal font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-[1.05] tracking-tight mb-4 [animation-delay:200ms]">
              Good to see you <em className="italic text-oxblood">again.</em>
            </h1>
            <p className="auth-reveal text-ink-soft mb-12 text-[15px] leading-relaxed max-w-[38ch] [animation-delay:300ms]">
              Sign in to track orders, save your cuts, and check out faster next time.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Email */}
              <div className="auth-reveal mb-7 [animation-delay:400ms]">
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
              <div className="auth-reveal mb-7 [animation-delay:500ms]">
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
              <div className="auth-reveal flex justify-between items-center mb-9 [animation-delay:550ms]">
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
                className="auth-reveal w-full flex items-center justify-center gap-3 px-7 py-4.5 bg-ink text-cream rounded-full text-sm font-medium tracking-[0.04em] hover:bg-oxblood hover:-translate-y-px transition-all duration-300 disabled:opacity-60 disabled:hover:bg-ink disabled:hover:translate-y-0 disabled:cursor-not-allowed [animation-delay:600ms]"
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

            </form>

            <div className="auth-reveal mt-8 [animation-delay:700ms]">
              <div className="relative mb-5 flex items-center">
                <span aria-hidden="true" className="flex-1 border-t border-line" />
                <span className="px-3 text-[11px] font-medium tracking-[0.22em] uppercase text-muted">
                  or explore as a guest
                </span>
                <span aria-hidden="true" className="flex-1 border-t border-line" />
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('customer')}
                  disabled={Boolean(demoPending) || loading || isLocked}
                  className={DEMO_BUTTON_CLASS}
                >
                  {demoPending === 'customer'
                    ? 'Starting…'
                    : 'Continue as Demo Customer'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDemoSignIn('admin')}
                  disabled={Boolean(demoPending) || loading || isLocked}
                  className={DEMO_BUTTON_CLASS}
                >
                  {demoPending === 'admin'
                    ? 'Starting…'
                    : 'Preview Admin Dashboard'}
                </button>
              </div>
              <p className="mt-3 text-center text-[11px] text-muted">
                Demo accounts let you explore the project without creating one.
              </p>
            </div>

            <p className="auth-reveal text-center mt-10 text-sm text-ink-soft [animation-delay:750ms]">
              By signing in, you agree to our{' '}
              <Link href="/terms" className="text-oxblood font-medium border-b border-oxblood pb-px">Terms</Link>
              {' '}&amp;{' '}
              <Link href="/privacy" className="text-oxblood font-medium border-b border-oxblood pb-px">Privacy Policy</Link>.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
