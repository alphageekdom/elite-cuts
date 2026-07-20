import { Suspense } from 'react';
import type { Metadata } from 'next';
import Register from '@/components/auth/Register';

export const metadata: Metadata = {
  title: 'Create Account',
};

export default function RegisterPage() {
  // Register reads `useSearchParams` for the `?email=` deep-link from the
  // guest receipt's "Create an account" CTA. Next 16 requires a Suspense
  // boundary around any client component that reads search params, or the
  // page is forced into fully-dynamic rendering with a build warning.
  return (
    <Suspense fallback={null}>
      <Register />
    </Suspense>
  );
}
