'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { signIn } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'sonner';

import { EMAIL_RE } from '@/lib/validation';
import { MIN_PASSWORD_LENGTH, scorePasswordStrength } from '@/lib/auth/password';
import { FOUNDED_YEAR } from '@/lib/shop-settings/founding';
import { buildRegisterBenefits } from '@/lib/auth/auth-benefits';
import { useShopSettings } from '@/context/ShopSettingsContext';
import {
  AUTH_INPUT_CLASS,
  AUTH_PW_INPUT_CLASS,
  AUTH_PW_TOGGLE_CLASS,
  AUTH_DOOR_CLASS,
} from '@/components/auth/authStyles';
import { FieldValidationIcon as FieldIcon } from '@/components/auth/FieldValidationIcon';
import EditorialEyebrow from '@/components/ui/EditorialEyebrow';
import ArrowIcon from '@/components/uielements/ArrowIcon';
import ChevronIcon from '@/components/uielements/ChevronIcon';
import UserIcon from '@/components/uielements/UserIcon';
import { useSignInLockout } from '@/hooks/useSignInLockout';

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

const BAR_COLORS = [
  [],
  ['bg-oxblood', 'bg-line', 'bg-line'],
  ['bg-camel', 'bg-camel', 'bg-line'],
  ['bg-green', 'bg-green', 'bg-green'],
] as const;

// Index 0 means the password is under MIN_PASSWORD_LENGTH — `scorePasswordStrength`
// floors it there — so the slot names the problem rather than sitting empty.
const STRENGTH_LABELS = ['Too short', 'Weak', 'Fair', 'Strong'] as const;

// Colour for the strength word sitting beside the Password label. Tracks the
// bar colours above so the two can't disagree about how strong "Fair" looks.
const STRENGTH_LABEL_CLASS = [
  'text-muted',
  'text-oxblood',
  'text-camel-deeper',
  'text-green',
] as const;

// Each message names the specific problem, and the password one reads from the
// same constant the server enforces.
const FIELD_ERROR: Record<keyof TouchedState, string> = {
  name: 'Enter your name.',
  email: 'Enter a valid email address.',
  password: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
  confirmPassword: 'Passwords do not match.',
};

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
  const [showPassword, setShowPassword] = useState(false);

  // Panel benefits and the address line both read from the shop's own settings
  // — see `buildRegisterBenefits` for which claims that keeps honest, including
  // the two that were false on this page before.
  const shopSettings = useShopSettings();
  const benefits = buildRegisterBenefits(shopSettings);

  // A failed `signIn` after a soft-deleted-restore attempt routes through
  // authorize()'s lockout counter, so we share the same sessionStorage-
  // backed countdown the /login page uses — without this, a customer
  // could hammer invalid passwords for the full hour with no feedback.
  const { registerLockoutFromMessage: registerRestoreLockout } = useSignInLockout();

  const anyTouched = Object.values(touched).some(Boolean);

  const showIcon = (field: keyof TouchedState) =>
    touched[field] || (anyTouched && formData[field].length > 0);

  const strengthScore = scorePasswordStrength(formData.password);

  const validity = {
    name: formData.name.trim().length > 0,
    email: EMAIL_RE.test(formData.email),
    password: formData.password.length >= MIN_PASSWORD_LENGTH,
    confirmPassword:
      formData.confirmPassword.length > 0 &&
      formData.confirmPassword === formData.password,
  };

  // The check/X icon is aria-hidden, so a screen reader hears nothing from it.
  // The announced half — aria-invalid plus an sr-only message naming the
  // problem — deliberately waits for the field's own blur instead of tracking
  // the icon. While it shared `showIcon`, one keystroke into a field was
  // enough to fire an assertive "Passwords do not match" the moment any other
  // field had been blurred, interrupting the customer mid-word about a problem
  // that wasn't real yet. The visual icon still updates as you type.
  const fieldInvalid = (field: keyof TouchedState) =>
    touched[field] && !validity[field];

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
    if (formData.password.length < MIN_PASSWORD_LENGTH) {
      toast.error(`Password must be at least ${MIN_PASSWORD_LENGTH} characters`);
      return;
    }
    if (!EMAIL_RE.test(formData.email)) {
      toast.error('Enter a valid email address');
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
      {/* Form Side. First in the DOM because it's what the page is for — a
          screen reader lands on the signup form rather than wading through
          the marketing panel, and the h1 precedes the panel's h2. Same shape
          the sign-in page landed on. */}
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
            <EditorialEyebrow className="auth-reveal mb-4 [animation-delay:100ms]">
              ↗ Create account
            </EditorialEyebrow>
            <h1 className="auth-reveal font-display font-normal text-[clamp(40px,4.5vw,56px)] leading-[1.05] tracking-tight mb-4 [animation-delay:200ms]">
              Welcome to the <em className="italic text-oxblood">counter.</em>
            </h1>
            {/* Both claims are the privacy page's own words. The line used to
                offer an opt-out from emails, which was the same shape as the
                "Newsletter: Subscribed" row this branch deletes: no marketing
                list exists, no consent field, and no opt-out control anywhere
                — the only emails contemplated are order receipts, which nobody
                can opt out of. Don't re-add an opt-out without a control. */}
            <p className="auth-reveal text-ink-soft mb-11 text-[15px] leading-relaxed max-w-[40ch] [animation-delay:300ms]">
              Takes about 30 seconds. We&apos;ll never share your details, and we
              don&apos;t send marketing email.
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
                    aria-invalid={fieldInvalid('name') || undefined}
                    aria-describedby={fieldInvalid('name') ? 'name-error' : undefined}
                    className={AUTH_INPUT_CLASS}
                  />
                  <FieldIcon show={showIcon('name')} valid={validity.name} />
                  {fieldInvalid('name') && (
                    <p id="name-error" role="alert" className="sr-only">
                      {FIELD_ERROR.name}
                    </p>
                  )}
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
                    aria-invalid={fieldInvalid('email') || undefined}
                    aria-describedby={fieldInvalid('email') ? 'email-error' : undefined}
                    className={AUTH_INPUT_CLASS}
                  />
                  <FieldIcon show={showIcon('email')} valid={validity.email} />
                  {fieldInvalid('email') && (
                    <p id="email-error" role="alert" className="sr-only">
                      {FIELD_ERROR.email}
                    </p>
                  )}
                </div>
              </div>

              {/* Password + strength meter */}
              <div className="auth-reveal mb-6.5 [animation-delay:450ms]">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <label
                    htmlFor="password"
                    className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted"
                  >
                    Password
                  </label>
                  {/* The container stays mounted so the live region is
                      established before the first score lands — a region that
                      appears at the same moment its text does is unreliably
                      announced. The sr-only prefix keeps the spoken form
                      self-describing ("Password strength: Strong") while the
                      visual stays a single word. */}
                  <span
                    role="status"
                    className={`text-[11.5px] font-semibold ${STRENGTH_LABEL_CLASS[strengthScore]}`}
                  >
                    {formData.password && (
                      <>
                        <span className="sr-only">Password strength: </span>
                        {STRENGTH_LABELS[strengthScore]}
                      </>
                    )}
                  </span>
                </div>
                <div className="relative">
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={`At least ${MIN_PASSWORD_LENGTH} characters`}
                    required
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    aria-invalid={fieldInvalid('password') || undefined}
                    // The composition rule is always part of the field's
                    // description, not just once you've started typing —
                    // otherwise a screen-reader user only meets the rule after
                    // breaking it.
                    aria-describedby={
                      fieldInvalid('password')
                        ? 'password-hint password-error'
                        : 'password-hint'
                    }
                    className={AUTH_PW_INPUT_CLASS}
                  />
                  {/* No validity tick here, unlike the other three fields: the
                      strength meter below says more than a binary check could,
                      and stacking both against the Show toggle crowds the
                      field. `aria-invalid` and the sr-only message stay. */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-controls="password confirmPassword"
                    // Plural: this one control reveals the confirm field too,
                    // so a singular label would leave a screen-reader user
                    // unaware their second field is now plaintext as well.
                    aria-label={showPassword ? 'Hide passwords' : 'Show passwords'}
                    className={AUTH_PW_TOGGLE_CLASS}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                  {fieldInvalid('password') && (
                    <p id="password-error" role="alert" className="sr-only">
                      {FIELD_ERROR.password}
                    </p>
                  )}
                </div>
                {formData.password && (
                  <div className="mt-2.5 flex gap-1">
                    {([0, 1, 2] as const).map((i) => (
                      <span
                        key={i}
                        className={`flex-1 h-0.5 rounded-full transition-colors duration-300 ${BAR_COLORS[strengthScore][i] ?? 'bg-line'}`}
                      />
                    ))}
                  </div>
                )}
                {/* Always rendered. It's the field's description, so it has to
                    exist before the customer types — otherwise a screen-reader
                    user only meets the rule after breaking it — and a stable id
                    keeps aria-describedby from pointing at nothing. The three
                    conditions named here are exactly the three the meter
                    scores; keep them in step. */}
                <p
                  id="password-hint"
                  className="text-[12px] text-muted mt-2 tracking-[0.02em]"
                >
                  Use {MIN_PASSWORD_LENGTH}+ characters with upper &amp; lower
                  case, a number &amp; a symbol.
                </p>
              </div>

              {/* Confirm password */}
              <div className="auth-reveal mb-3 [animation-delay:500ms]">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                  <label
                    htmlFor="confirmPassword"
                    className="block text-[11px] font-medium tracking-[0.22em] uppercase text-muted"
                  >
                    Confirm password
                  </label>
                  {/* Mirrors the strength word opposite. Purely visual — the
                      field's own aria-invalid and sr-only message already tell
                      a screen reader the same thing, so announcing it twice
                      would just be noise. */}
                  {formData.confirmPassword && (
                    <span
                      aria-hidden="true"
                      className={`text-[11.5px] font-semibold ${validity.confirmPassword ? 'text-green' : 'text-oxblood'}`}
                    >
                      {validity.confirmPassword ? 'Matches' : "Doesn't match"}
                    </span>
                  )}
                </div>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Re-enter your password"
                    required
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="new-password"
                    aria-invalid={fieldInvalid('confirmPassword') || undefined}
                    aria-describedby={
                      fieldInvalid('confirmPassword') ? 'confirmPassword-error' : undefined
                    }
                    className={AUTH_INPUT_CLASS}
                  />
                  <FieldIcon
                    show={showIcon('confirmPassword')}
                    valid={validity.confirmPassword}
                  />
                  {fieldInvalid('confirmPassword') && (
                    <p id="confirmPassword-error" role="alert" className="sr-only">
                      {FIELD_ERROR.confirmPassword}
                    </p>
                  )}
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
                  <Link href="/terms" className="text-oxblood border-b border-oxblood">
                    Terms of Service
                  </Link>{' '}
                  and{' '}
                  <Link href="/privacy" className="text-oxblood border-b border-oxblood">
                    Privacy Policy
                  </Link>
                  {/* No age attestation belongs here: nothing states an age
                      requirement — not the Terms page, not the user model,
                      nothing enforced — so asserting one would ask the customer
                      to affirm a rule the shop doesn't have. A separate age
                      tick is the convention for age-restricted goods; general
                      retail states any minimum inside the Terms and keeps the
                      checkbox to agreeing with them. */}
                  .
                </span>
              </label>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="auth-reveal w-full flex items-center justify-center gap-3 px-7 py-4.5 bg-ink text-cream rounded-full text-sm font-medium tracking-[0.04em] hover:bg-oxblood hover:-translate-y-px transition-all duration-300 disabled:opacity-60 [animation-delay:600ms]"
              >
                {loading ? 'Creating account…' : 'Create my account'}
                {!loading && <ArrowIcon className="w-3.5 h-3.5" />}
              </button>
              {/* The button swaps its own label to "Creating account…", which a
                  screen reader has no reason to re-read, and focus stays on a
                  now-disabled control. This says it once in the in-flight
                  window before the toast lands — same shape as the sign-in
                  page's demo doors. */}
              <p className="sr-only" role="status" aria-live="polite">
                {loading ? 'Creating your account, please wait…' : ''}
              </p>
            </form>

            {/* An account isn't required to browse or even to check out as a
                guest, so the page says so rather than implying a wall. */}
            <div className="auth-reveal mt-8 [animation-delay:700ms]">
              <div className="relative mb-5 flex items-center">
                <span aria-hidden="true" className="flex-1 border-t border-line" />
                <span className="px-3 text-[11px] font-medium tracking-[0.22em] uppercase text-muted">
                  Not ready yet
                </span>
                <span aria-hidden="true" className="flex-1 border-t border-line" />
              </div>
              <Link href="/products" className={AUTH_DOOR_CLASS}>
                <span
                  aria-hidden="true"
                  className="grid size-9 shrink-0 place-items-center rounded-full bg-cream-deep text-oxblood"
                >
                  <UserIcon className="w-4.5 h-4.5" />
                </span>
                <span className="flex-1 text-left">
                  <span className="block text-[14.5px] font-semibold text-ink">
                    Look around first
                  </span>
                  <span className="mt-0.5 block text-[12.5px] text-muted">
                    Browse the case or check out as a guest — no account needed.
                  </span>
                </span>
                <ChevronIcon
                  direction="right"
                  className="w-4 h-4 shrink-0 text-camel-deeper"
                />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Visual Side. Second in the DOM, first on screen from md up — see the
          note on the form above. */}
      <aside className="relative hidden md:order-first md:flex overflow-hidden bg-ink text-cream">
        <div
          className="absolute inset-0 scale-[1.05] hero-bg-register animate-[heroZoom_22s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
        />
        {/* The shared hero gradient bottoms out around 40% across the middle of
            the panel, which leaves four benefits' worth of body copy sitting on
            raw photography. Same scrim the sign-in panel uses. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-ink/95 via-ink/75 to-ink/25"
        />
        <div className="relative z-10 flex flex-col justify-end w-full h-full gap-11 p-12 xl:p-14">
          <div className="max-w-[42ch]">
            <div className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase mb-6 text-camel-soft">
              <span aria-hidden="true" className="w-6.5 h-px bg-camel" />
              Joining is free
            </div>
            <h2 className="font-display text-[clamp(30px,3vw,46px)] font-normal leading-[1.06] tracking-[-0.02em] mb-8">
              The counter starts{' '}
              <em className="italic text-camel-soft">remembering.</em>
            </h2>
            <dl className="flex flex-col">
              {benefits.map((benefit) => (
                <div
                  key={benefit.num}
                  className="flex items-start gap-4 border-t border-cream/15 py-3.5"
                >
                  <span
                    aria-hidden="true"
                    className="font-display shrink-0 pt-0.5 text-[14px] text-camel"
                  >
                    {benefit.num}
                  </span>
                  <div>
                    <dt className="text-[15px] font-semibold text-cream/95">
                      {benefit.title}
                    </dt>
                    <dd className="mt-1 text-[13.5px] leading-normal text-cream/70">
                      {benefit.body}
                    </dd>
                  </div>
                </div>
              ))}
            </dl>
          </div>

          <div className="flex justify-between gap-4 border-t border-cream/15 pt-6 text-[11px] tracking-[0.18em] uppercase text-cream/60">
            <span>
              {shopSettings.street} · {shopSettings.city}
            </span>
            <span className="shrink-0">Est · {FOUNDED_YEAR}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
