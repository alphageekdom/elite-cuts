'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

import { FIELD_CLASS, LABEL_CLASS } from '@/components/checkout/checkoutStyles';
import { GoogleIcon, GitHubIcon } from '@/components/auth/OAuthIcons';
import {
  useSignInLockout,
  formatLockoutCountdown,
} from '@/hooks/useSignInLockout';

type Props = {
  onCancel: () => void;
};

// Inline credentials + OAuth sign-in for guests on the checkout page. After
// a successful credentials sign-in, calling router.refresh() re-runs the
// server component so the prefill props flow into CheckoutProvider and the
// contact card populates without losing the shopper's place on the page.
// Cart merge fires automatically — CartContext watches the auth-status
// transition and merges the localStorage cart into the user's server cart.
const CheckoutInlineSignIn = ({ onCancel }: Props) => {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { isLocked, lockSecondsLeft, registerLockoutFromMessage } =
    useSignInLockout();

  const submitDisabled = loading || isLocked;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (submitDisabled) return;
    if (!email || !password) {
      setError('Enter your email and password to sign in.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await signIn('credentials', {
        redirect: false,
        email,
        password,
      });
      if (!res?.ok) {
        const message = res?.error ?? '';
        // Surfaces the same rate-limit cool-down used on /login so the
        // shopper sees a live countdown instead of a generic error after
        // they've tripped the backend's lockout threshold.
        const wasLockout = registerLockoutFromMessage(message);
        setError(wasLockout ? message : 'Invalid email or password.');
        return;
      }
      // router.refresh() re-renders the checkout server component so the
      // user's saved contact + addresses flow into CheckoutProvider as
      // updated props. CartContext separately picks up the auth transition
      // and merges the localStorage cart into the server cart.
      router.refresh();
    } catch {
      setError('Something went wrong. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = (provider: 'google' | 'github') => {
    if (isLocked) return;
    // OAuth flows leave the SPA, so callbackUrl brings the shopper back to
    // /checkout. The session is established server-side before the redirect
    // and the page mounts with the prefill props already populated.
    signIn(provider, { callbackUrl: '/checkout' });
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className='mb-6'>
        <label htmlFor='signin-email' className={`mb-2.5 block ${LABEL_CLASS}`}>
          Email
        </label>
        <input
          id='signin-email'
          type='email'
          name='email'
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder='you@example.com'
          autoComplete='email'
          disabled={submitDisabled}
          className={`${FIELD_CLASS} disabled:opacity-60`}
        />
      </div>

      <div className='mb-2'>
        <label htmlFor='signin-password' className={`mb-2.5 block ${LABEL_CLASS}`}>
          Password
        </label>
        <input
          id='signin-password'
          type='password'
          name='password'
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder='Your password'
          autoComplete='current-password'
          disabled={submitDisabled}
          className={`${FIELD_CLASS} disabled:opacity-60`}
        />
      </div>

      {error && (
        <p
          role='alert'
          className='mb-4 mt-2 text-[12px] leading-snug text-oxblood'
        >
          {error}
        </p>
      )}

      <button
        type='submit'
        disabled={submitDisabled}
        className='mt-6 inline-flex w-full items-center justify-center gap-3 rounded-full bg-ink px-7 py-3.5 text-[14px] font-medium tracking-[0.02em] text-cream transition-[background-color,opacity] duration-300 hover:bg-oxblood disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
      >
        {isLocked && lockSecondsLeft !== null
          ? `Try again in ${formatLockoutCountdown(lockSecondsLeft)}`
          : loading
            ? 'Signing in…'
            : 'Sign in'}
      </button>

      <div className='my-6 flex items-center gap-3 text-[10px] font-medium uppercase tracking-[0.22em] text-muted'>
        <span className='h-px flex-1 bg-line-soft' />
        or continue with
        <span className='h-px flex-1 bg-line-soft' />
      </div>

      <div className='grid grid-cols-2 gap-3'>
        <button
          type='button'
          onClick={() => handleOAuth('google')}
          disabled={submitDisabled}
          className='inline-flex items-center justify-center gap-2 rounded-full border border-line bg-transparent px-4 py-3 text-[13px] font-medium text-ink transition-[border-color,background-color] duration-300 hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
        >
          <GoogleIcon size={14} />
          Google
        </button>
        <button
          type='button'
          onClick={() => handleOAuth('github')}
          disabled={submitDisabled}
          className='inline-flex items-center justify-center gap-2 rounded-full border border-line bg-transparent px-4 py-3 text-[13px] font-medium text-ink transition-[border-color,background-color] duration-300 hover:border-ink hover:bg-paper disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
        >
          <GitHubIcon size={14} />
          GitHub
        </button>
      </div>

      <div className='mt-6 text-center text-[12px] text-muted'>
        <button
          type='button'
          onClick={onCancel}
          disabled={loading}
          className='border-b border-current pb-px text-oxblood transition-colors duration-300 hover:text-ink disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none'
        >
          Continue as guest
        </button>
      </div>
    </form>
  );
};

export default CheckoutInlineSignIn;
