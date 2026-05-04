import type { Metadata } from 'next';
import Login from '@/components/auth/Login';

export const metadata: Metadata = {
  title: 'Sign In | EliteCuts',
};

export default function LoginPage() {
  return <Login />;
}
