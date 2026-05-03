import { getSessionUser } from './getSessionUser';

// Returns a 401/403 Response if the request is not from an authenticated admin;
// returns null when the caller may proceed.
export const requireAdmin = async (): Promise<Response | null> => {
  const sessionUser = await getSessionUser();

  if (!sessionUser?.userId) {
    return new Response('User ID is required', { status: 401 });
  }

  if (!sessionUser.user?.isAdmin) {
    return new Response('Admin access required', { status: 403 });
  }

  return null;
};
