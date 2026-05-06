'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { signIn } from 'next-auth/react';

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

const INPUT_CLASS =
  'w-full border-0 border-b border-line bg-transparent text-ink text-base py-2 pb-3.5 pr-6 outline-none placeholder:text-muted/60 focus:border-oxblood transition-colors duration-300';

export default function Register() {
  const router = useRouter();
  const [formData, setFormData] = useState<FormState>({
    name: '',
    email: '',
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
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters');
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
      } else if (res.status === 409) {
        toast.error('An account with that email already exists');
      } else {
        const data = await res.json();
        toast.error(data.message || 'Registration failed');
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
              'linear-gradient(180deg, rgba(20,16,14,0.45) 0%, rgba(20,16,14,0.35) 50%, rgba(20,16,14,0.85) 100%), url("https://images.unsplash.com/photo-1588168333986-5078d3ae3976?w=1600&q=80")',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            transform: 'scale(1.05)',
          }}
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
            <span
              className="auth-reveal block font-display italic text-sm text-camel mb-4 tracking-[0.02em]"
              style={{ animationDelay: '0.1s' }}
            >
              ↗ Create account
            </span>
            <h1
              className="auth-reveal font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-[1.05] tracking-tight mb-4"
              style={{ animationDelay: '0.2s' }}
            >
              Welcome to the <em className="italic text-oxblood">counter.</em>
            </h1>
            <p
              className="auth-reveal text-ink-soft mb-11 text-[15px] leading-relaxed max-w-[40ch]"
              style={{ animationDelay: '0.3s' }}
            >
              Takes about 30 seconds. We'll never share your details, and you
              can opt out of emails any time.
            </p>

            <form onSubmit={handleSubmit}>
              {/* Name */}
              <div className="auth-reveal mb-6.5" style={{ animationDelay: '0.35s' }}>
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
              <div className="auth-reveal mb-6.5" style={{ animationDelay: '0.4s' }}>
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
              <div className="auth-reveal mb-6.5" style={{ animationDelay: '0.45s' }}>
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
              <div className="auth-reveal mb-3" style={{ animationDelay: '0.5s' }}>
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
              <label
                className="auth-reveal flex items-start gap-3 my-8 text-[13px] text-ink-soft leading-relaxed cursor-pointer select-none"
                style={{ animationDelay: '0.55s' }}
              >
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
                  , and I'm at least 18 years old.
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="auth-reveal w-full flex items-center justify-center gap-3 px-7 py-4.5 bg-ink text-cream rounded-full text-sm font-medium tracking-[0.04em] hover:bg-oxblood hover:-translate-y-px transition-all duration-300 disabled:opacity-60"
                style={{ animationDelay: '0.6s' }}
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

              {/* Divider */}
              <div
                className="auth-reveal flex items-center gap-4 my-8 text-muted text-[11px] tracking-[0.22em] uppercase"
                style={{ animationDelay: '0.65s' }}
              >
                <span className="flex-1 h-px bg-line-soft" />
                or sign up with
                <span className="flex-1 h-px bg-line-soft" />
              </div>

              {/* Social buttons */}
              <div
                className="auth-reveal grid grid-cols-2 gap-3"
                style={{ animationDelay: '0.7s' }}
              >
                <button
                  type="button"
                  onClick={() => signIn('google', { callbackUrl: '/' })}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-transparent text-ink border border-line rounded-full text-sm font-medium hover:border-ink hover:bg-paper transition-all duration-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Google
                </button>
                <button
                  type="button"
                  onClick={() => signIn('github', { callbackUrl: '/' })}
                  className="inline-flex items-center justify-center gap-2.5 px-5 py-3.5 bg-transparent text-ink border border-line rounded-full text-sm font-medium hover:border-ink hover:bg-paper transition-all duration-300"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                  </svg>
                  GitHub
                </button>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
