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
import ArrowIcon from '@/components/ui/icons/ArrowIcon';
import ChevronIcon from '@/components/ui/icons/ChevronIcon';
import DashboardIcon from '@/components/ui/icons/DashboardIcon';
import UserIcon from '@/components/ui/icons/UserIcon';
import {
  useSignInLockout,
  formatLockoutCountdown,
} from '@/hooks/useSignInLockout';
import { startDemoSession, type DemoType } from '@/lib/auth/demo-signin';
import { buildLoginBenefits } from '@/lib/auth/auth-benefits';
import { FOUNDED_YEAR } from '@/lib/shop-settings/founding';
import { useShopSettings } from '@/context/ShopSettingsContext';
import {
  AUTH_INPUT_CLASS,
  AUTH_PW_INPUT_CLASS,
  AUTH_PW_TOGGLE_CLASS,
  AUTH_DOOR_CLASS,
} from '@/components/auth/authStyles';

// The two demo accounts, described by what each one actually lets you do.
// The customer door is unrestricted; the owner door writes to the catalog,
// promos, staff, shifts and settings but leaves the order queue and customer
// records read-only, so the copy stops at "run the shop" rather than promising
// the whole dashboard.
//
// The chip colours carry the same signal the app's own two shells do — the
// cream storefront against the dark ink admin — so the pair reads at a glance
// before the labels are even parsed. (The design used emoji here; these are
// drawn glyphs instead, since no other customer-facing surface uses emoji.)
const DEMO_DOORS = [
  {
    type: 'customer' as DemoType,
    title: 'Shop as a demo customer',
    body: 'Full catalog, cart, and pickup — no account needed.',
    Icon: UserIcon,
    chipCls: 'bg-cream-deep text-oxblood',
  },
  {
    type: 'admin' as DemoType,
    title: 'Run the shop as the owner',
    body: 'Price cuts, edit the roster, run a promo. Resets overnight.',
    Icon: DashboardIcon,
    chipCls: 'bg-ink text-camel-soft',
  },
];

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
  const [showPassword, setShowPassword] = useState(false);
  const [demoPending, setDemoPending] = useState<DemoType | null>(null);

  // The panel's four member benefits and its address line both read from the
  // shop's own settings rather than being written into the markup — see
  // `buildLoginBenefits` for which claims that keeps honest.
  const shopSettings = useShopSettings();
  const benefits = buildLoginBenefits(shopSettings);

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

  // Email only, deliberately — there is no password check on sign-in.
  //
  // Nothing client-side can tell whether an *existing* password is correct, so
  // a length test here would be theatre: it used to flip a green check at 6
  // characters, which matched no rule the app enforces (registration requires
  // MIN_PASSWORD_LENGTH) and would show a red X to a grandfathered shorter
  // password that signs in perfectly well. Worse, any threshold it displayed
  // would advertise the password rule on the one form that must never discuss
  // credentials — a failed attempt returns a single generic "Invalid email or
  // password" (see handleSubmit) precisely so the form can't confirm which half
  // was right.
  //
  // The email check stays because it describes the shape of the value just
  // typed, not the credential behind it. Register is the opposite case: it must
  // state the rule, since you can't ask someone to meet a rule you won't show.
  const emailValid = EMAIL_RE.test(formData.email);

  // The check/X icon is aria-hidden, so on its own it tells a screen reader
  // nothing. The announced half — aria-invalid plus the sr-only message — waits
  // for the field's own blur rather than tracking the X, which still appears as
  // you type. Sharing `showIcon` meant that once the password field had been
  // touched, a single keystroke in the email field fired an assertive "Enter a
  // valid email address." mid-word — reachable on the common recovery flow
  // where a rejected sign-in sends someone back to re-check their email. The
  // register form gates its announced errors the same way.
  const emailInvalid = touched.email && !emailValid;

  const EMAIL_ERROR = 'Enter a valid email address.';

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
        // Credentials cross the wire as strings. Sent explicitly on both
        // branches — this is the one surface that offers the choice, so it has
        // to state the answer rather than let `resolveRememberMe` fall back to
        // the default it keeps for surfaces that don't ask.
        rememberMe: String(formData.rememberMe),
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
      {/* Form Side. First in the DOM because it's what the page is for — a
          screen reader lands on the sign-in form rather than wading through
          the marketing panel to reach it. */}
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
              {/* Deliberately not a second list of benefits — the panel to the
                  left already itemises those, and repeating "save your cuts"
                  here read as the page selling the same thing twice. */}
              Pick up where you left off.
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
                    aria-invalid={emailInvalid || undefined}
                    aria-describedby={emailInvalid ? 'email-error' : undefined}
                    className={`${AUTH_INPUT_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  <FieldIcon show={showIcon('email')} valid={emailValid} />
                  {emailInvalid && (
                    <p id="email-error" role="alert" className="sr-only">
                      {EMAIL_ERROR}
                    </p>
                  )}
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
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    required
                    disabled={isLocked}
                    value={formData.password}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    autoComplete="current-password"
                    className={`${AUTH_PW_INPUT_CLASS} disabled:opacity-60 disabled:cursor-not-allowed`}
                  />
                  {/* No validity icon, no aria-invalid, no announced message —
                      all deliberate, see the note above the email check. Password
                      length belongs on register and update-password, never on
                      sign-in; the generic submit-time toast is the only failure
                      signal here. */}
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    // The label says which way it will go, so it reads
                    // correctly on its own; aria-controls ties it to the field
                    // it acts on for anyone arriving at it out of context.
                    aria-controls="password"
                    // The visible label already says which way the toggle will
                    // go, but "Show" on its own is a thin accessible name out
                    // of context — this keeps the same word and adds the noun.
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className={AUTH_PW_TOGGLE_CLASS}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
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
                  Keep me signed in
                </label>
                {/* Was href="#" — a dead link on a primary auth surface. There
                    is no password reset (the demo doors below are how a visitor
                    gets in without an account), so this points at the one place
                    a genuinely locked-out customer can reach a person. */}
                <Link href="/contact" className="text-[13px] text-ink-soft hover:text-oxblood transition-colors duration-300">
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
                {!loading && !isLocked && <ArrowIcon className="w-3.5 h-3.5" />}
              </button>

            </form>

            <div className="auth-reveal mt-8 [animation-delay:700ms]">
              <div className="relative mb-5 flex items-center">
                <span aria-hidden="true" className="flex-1 border-t border-line" />
                <span className="px-3 text-[11px] font-medium tracking-[0.22em] uppercase text-muted">
                  Just looking around
                </span>
                <span aria-hidden="true" className="flex-1 border-t border-line" />
              </div>
              <div className="grid gap-2.5">
                {DEMO_DOORS.map((door) => (
                  <button
                    key={door.type}
                    type="button"
                    onClick={() => handleDemoSignIn(door.type)}
                    disabled={Boolean(demoPending) || loading || isLocked}
                    className={AUTH_DOOR_CLASS}
                  >
                    <span
                      aria-hidden="true"
                      className={`grid size-9 shrink-0 place-items-center rounded-full ${door.chipCls}`}
                    >
                      <door.Icon className="w-4.5 h-4.5" />
                    </span>
                    <span className="flex-1 text-left">
                      <span className="block text-[14.5px] font-semibold text-ink">
                        {demoPending === door.type ? 'Starting…' : door.title}
                      </span>
                      <span className="mt-0.5 block text-[12.5px] text-muted">
                        {door.body}
                      </span>
                    </span>
                    <ChevronIcon
                      direction="right"
                      className="w-4 h-4 shrink-0 text-camel-deeper"
                    />
                  </button>
                ))}
              </div>
              {/* Picking a door swaps the button's own label to "Starting…",
                  which a screen reader has no reason to re-read. This says it
                  once, out loud, in the window before the hard navigation. */}
              <p className="sr-only" role="status" aria-live="polite">
                {demoPending ? 'Starting demo session, please wait…' : ''}
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

      {/* Visual Side.
          Second in the DOM, first on screen from md up. The panel's h2 would
          otherwise precede the form's h1, which reads as a document whose
          first heading is a level deeper than its title. `order-first` puts
          it back on the left visually without that cost — and below md it's
          display:none anyway, so the source order is what everyone gets. */}
      <aside className="relative hidden md:order-first md:flex overflow-hidden bg-ink text-cream">
        <div
          className="absolute inset-0 scale-[1.05] hero-bg-login animate-[heroZoom_22s_ease-in-out_infinite_alternate] motion-reduce:animate-none"
        />
        {/* The shared hero gradient bottoms out around 40% opacity across the
            middle of the panel, which was fine behind a short pull-quote but
            leaves four benefits' worth of body copy sitting on raw photography.
            This scrim floors the backdrop behind the text so its contrast holds
            whatever image the panel is carrying. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-linear-to-t from-ink/95 via-ink/75 to-ink/25"
        />
        <div className="relative z-10 flex flex-col justify-end w-full h-full gap-11 p-12 xl:p-14">
          <div className="max-w-[42ch]">
            <div className="inline-flex items-center gap-3 text-[11px] font-medium tracking-[0.22em] uppercase mb-6 text-camel-soft">
              <span aria-hidden="true" className="w-6.5 h-px bg-camel" />
              Member access
            </div>
            <h2 className="font-display text-[clamp(30px,3vw,46px)] font-normal leading-[1.06] tracking-[-0.02em] mb-8">
              The counter{' '}
              <em className="italic text-camel-soft">remembers</em> you.
            </h2>
            {/* ul, not dl: the numbered chip and the title/body column are
                siblings, and a dl only permits dt/dd (optionally one div
                wrapper holding just those). The old dl > div > div > dt
                nesting was invalid on both counts. */}
            <ul className="flex flex-col">
              {benefits.map((benefit) => (
                <li
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
                    <p className="text-[15px] font-semibold text-cream/95">
                      {benefit.title}
                    </p>
                    <p className="mt-1 text-[13.5px] leading-normal text-cream/70">
                      {benefit.body}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex justify-between gap-4 border-t border-cream/15 pt-6 text-[11px] tracking-[0.18em] uppercase text-cream/60">
            {/* Address from settings, founding year from the shared constant —
                both were literals here and in Register, and the year would
                have gone stale on its own. */}
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
