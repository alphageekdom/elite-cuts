import type { Metadata } from 'next';
import Register from '@/components/auth/Register';

export const metadata: Metadata = {
  title: 'Create Account',
};

type Props = {
  searchParams: Promise<{ email?: string }>;
};

export default async function RegisterPage({ searchParams }: Props) {
  // `?email=` is read here rather than through `useSearchParams` in Register.
  // That hook needs a Suspense boundary, and a `fallback={null}` one shipped
  // an empty `<main>` — the footer painted first and the form streamed in
  // after it, costing 0.922 CLS (mobile; 0.43 desktop). Reading the param on the
  // server puts the whole form in the initial HTML, as /login already does.
  const { email } = await searchParams;

  return <Register emailParam={email ?? ''} />;
}
