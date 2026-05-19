'use client';

import { useState, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

interface TouchedState {
  name: boolean;
  email: boolean;
  password: boolean;
  confirmPassword: boolean;
}

interface FormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  agreeToTerms: boolean;
}


const BENEFITS = [
  'Order online, pick up at the shop — no lines.',
  'Save cuts for quick reorder.',
  'Early access when fresh dry-aged beef hits the case.',
  'Recipes & cooking tips from our butchers.',
];

const BAR_COLORS = [
  [],
  ['bg-oxblood', 'bg-line', 'bg-line'],
  ['bg-camel', 'bg-camel', 'bg-line'],
  ['bg-green', 'bg-green', 'bg-green'],
] as const;

const STRENGTH_LABELS = ['', 'Weak', 'Fair', 'Strong'];

import { EMAIL_RE } from '@/lib/validation';

import { FieldValidationIcon as FieldIcon } from '@/components/auth/FieldValidationIcon';
import { useSignInLockout } from '@/hooks/useSignInLockout';

const INPUT_CLASS =
  'w-full border-0 border-b border-line bg-transparent text-ink text-base py-2 pb-3.5 pr-6 outline-none placeholder:text-muted/60 focus:border-oxblood transition-colors duration-300';

export default function Register() {
  const router = useRouter();
  // Honor an `?email=` query param so the guest-receipt "Create an account"
  // CTA can deep-link the shopper here with their guest email pre-filled —
  // the claim-on-signup match then runs against the same address they used
  // for the guest order. Reject anything that isn't a valid email so a
  // garbage URL (e.g. /register?email=garbage) doesn't seed the form with
  // garbage and trip the validity icon on first paint.
  const searchParams = useSearchParams();
  const rawEmail = (searchParams.get('email') ?? '').trim();
  const initialEmail = EMAIL_RE.test(rawEmail) ? rawEmail : '';
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: initialEmail,
    password: '',
    confirmPassword: '',
    agreeToTerms: false,
  });
  const [touched, setTouched] = useState<TouchedState>({
    name: false,
    email: false,
    password: false,
    confirmPassword: false,
  });
  const [loading, setLoading] = useState(false);

  // A failed `signIn` after a soft-deleted-restore attempt routes through
  // authorize()'s lockout counter, so we share the same sessionStorage-
  // backed countdown the /login page uses — without this, a customer
  // could hammer invalid passwords for the full hour with no feedback.
  const { registerLockoutFromMessage: registerRestoreLockout } = useSignInLockout();

  const anyTouched = Object.values(touched).some(Boolean);

  const showIcon = (field: keyof TouchedState) =>
    touched[field] || (anyTouched && formData[field].length > 0);

  const strengthScore = useMemo(() => {
    const p = formData.password;
    if (!p) return 0;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p) && /[a-z]/.test(p)) score++;
    if (/\d/.test(p) && /[^A-Za-z0-9]/.test(p)) score++;
    return score;
  }, [formData.password]);

  const validity = {
    name: formData.name.trim().length > 0,
    email: EMAIL_RE.test(formData.email),
    password: formData.password.length >= 6,
    confirmPassword:
      formData.confirmPassword.length > 0 &&
      formData.confirmPassword === formData.password,
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name } = e.target;
    if (name in touched) setTouched((prev) => ({ ...prev, [name]: true }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }
    if (formData.password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (!EMAIL_RE.test(formData.email)) {
      toast.error('Invalid email address');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          confirmPassword: formData.confirmPassword,
        }),
      });

      if (res.ok) {
        toast.success('Account created — sign in to continue');
        router.push('/login');
        return;
      }

      if (res.status === 409) {
        // The server returns the same generic 409 for every email collision
        // (active OR soft-deleted) so it can't be used as a password oracle.
        // Try a blind sign-in with the credentials the customer just typed:
        // if it's their real account they get signed straight in (and a
        // soft-deleted account is restored in place by authorize()); any
        // other case falls through to the generic toast. authorize()'s
        // per-account lockout still protects soft-deleted hashes from
        // brute-force, and the new IP-level throttle covers everything else.
        const signInResult = await signIn('credentials', {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        if (!signInResult?.error) {
          toast.success('Welcome back — your account has been restored.');
          router.replace('/');
          router.refresh();
          return;
        }
        const wasLockout = registerRestoreLockout(signInResult.error);
        toast.error(
          wasLockout
            ? signInResult.error
            : 'An account with that email already exists',
        );
        return;
      }

      const data = await res.json();
      toast.error(data.message || 'Registration failed');
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
          className="absolute inset-0 scale-[1.05] hero-bg-register animate-[heroZoom_22s_ease-in-out_infinite_alternate]"
        />
        <div className="relative z-10 flex flex-col justify-between w-full h-full p-12 xl:p-14">
          <div className="max-w-[36ch]">
            <div className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase mb-7 opacity-85">
              <span className="w-7 h-px bg-current opacity-60" />
              Member benefits
            </div>
            <h2 className="font-display text-[clamp(28px,2.6vw,38px)] font-normal leading-[1.15] tracking-[-0.02em] mb-9">
              Join the <em className="italic text-camel-soft">counter</em> —<br />
              get the good cuts first.
            </h2>
            <ul className="flex flex-col gap-4.5">
              {BENEFITS.map((benefit) => (
                <li
                  key={benefit}
                  className="flex items-start gap-3.5 text-[15px] leading-relaxed opacity-90"
                >
                  <span className="shrink-0 w-5.5 h-5.5 rounded-full border border-camel-soft bg-camel/25 grid place-items-center mt-0.5">
                    <svg
                      width="11"
                      height="11"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#D4B391"
                      strokeWidth="2.5"
                    >
                      <polyline points="4 12 10 18 20 6" />
                    </svg>
                  </span>
                  {benefit}
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between text-[11px] tracking-[0.18em] uppercase opacity-60">
            <span>EC · New Account</span>
            <span>Est. 2018</span>
          </div>
        </div>
      </aside>

      {/* Form Side */}
      <section className="flex flex-col px-8 py-8 md:px-14">
        <div className="flex justify-end text-sm">
          <span className="text-muted">
            Already a member?{' '}
            <Link
              href="/login"
              className="text-oxblood font-medium border-b border-oxblood pb-px"
            >
              Sign in
            </Link>
          </span>
        </div>

        <div className="flex-1 flex items-center justify-center py-10">
          <div className="w-full max-w-110">
            <span className="auth-reveal block font-display italic text-sm text-camel mb-4 tracking-[0.02em] [animation-delay:100ms]">
              ↗ Create account
            </span>
            <h1 className="auth-reveal font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-[1.05] tracking-tight mb-4 [animation-delay:200ms]">
              Welcome to the <em className="italic text-oxblood">counter.</em>
            </h1>
            <p className="auth-reveal text-ink-soft mb-11 text-[15px] leading-relaxed max-w-[40ch] [animation-delay:300ms]">
              Takes about 30 seconds. We&apos;ll never share your details, and you
              can opt out of emails any time.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="auth-reveal mb-6.5 [animation-delay:350ms]">
                <label
                  htmlFor="name"
                  className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3"
                >
                  Full name
                </label>
                <div className="relative">
                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Jane Doe"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="name"
                    className={INPUT_CLASS}
                  />
                  <FieldIcon show={showIcon('name')} valid={validity.name} />
                </div>
              </div>

              {/* Email */}
              <div className="auth-reveal mb-6.5 [animation-delay:400ms]">
                <label
                  htmlFor="email"
                  className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3"
                >
                  Email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="email"
                    className={INPUT_CLASS}
                  />
                  <FieldIcon show={showIcon('email')} valid={validity.email} />
                </div>
              </div>

              {/* Password + strength meter */}
              <div className="auth-reveal mb-6.5 [animation-delay:450ms]">
                <label
                  htmlFor="password"
                  className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3"
                >
                  Password
                </label>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="At least 8 characters"
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                  />
                  <FieldIcon show={showIcon('password')} valid={validity.password} />
                </div>
                {formData.password && (
                  <div className="mt-2.5">
                    <div className="flex gap-1">
                      {([0, 1, 2] as const).map((i) => (
                        <span
                          key={i}
                          className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${BAR_COLORS[strengthScore][i] ?? 'bg-line'}`}
                        />
                      ))}
                    </div>
                    <p className="text-[12px] text-muted mt-2 tracking-[0.02em]">
                      {STRENGTH_LABELS[strengthScore]} — use 8+ characters with
                      letters, numbers &amp; symbols.
                    </p>
                  </div>
                )}
              </div>

              {/* Confirm password */}
              <div className="auth-reveal mb-3 [animation-delay:500ms]">
                <label
                  htmlFor="confirmPassword"
                  className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted mb-3"
                >
                  Confirm password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter your password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    className={INPUT_CLASS}
                  />
                  <FieldIcon
                    show={showIcon('confirmPassword')}
                    valid={validity.confirmPassword}
                  />
                </div>
              </div>

              {/* Terms */}
              <label className="auth-reveal flex items-start gap-3 my-8 text-[13px] text-ink-soft leading-relaxed cursor-pointer select-none [animation-delay:550ms]">
                <input
                  type="checkbox"
                  name="agreeToTerms"
                  checked={formData.agreeToTerms}
                  onChange={handleChange}
                  required
                  className="auth-check mt-0.5"
                />
                <span>
                  I agree to the{' '}
                  <Link href="#" className="text-oxblood border-b border-oxblood">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="#" className="text-oxblood border-b border-oxblood">
                    Privacy Policy
                  </Link>
                  , and I&apos;m at least 18 years old.
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="auth-reveal w-full flex items-center justify-center gap-3 px-7 py-4.5 bg-ink text-cream rounded-full text-sm font-medium tracking-[0.04em] hover:bg-oxblood hover:-translate-y-px transition-all duration-300 disabled:opacity-60 [animation-delay:600ms]"
              >
                {loading ? 'Creating account…' : 'Create my account'}
                {!loading && (
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M5 12h14M13 5l7 7-7 7" />
                  </svg>
                )}
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
