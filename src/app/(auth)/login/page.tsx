import type { Metadata } from 'next';
import Login from '@/components/auth/Login';

export const metadata: Metadata = {
  title: 'Sign In',
};

export default function LoginPage() {
  return <Login />;
}
