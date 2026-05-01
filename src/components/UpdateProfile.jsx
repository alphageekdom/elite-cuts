'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';

const UpdateProfile = () => {
  const router = useRouter();

  const { data: session } = useSession();

  const [formData, setFormData] = useState({
    newPassword: '',
    confirmNewPassword: '',
    userId: session?.user?.id,
  });

  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        if (!session) {
          router.push('/login');
          return;
        }

        const response = await fetch(`/api/users/${session?.user?.id}`);
        if (!response.ok) {
          throw new Error('Failed to fetch user data');
        }
        const userData = await response.json();
        setUser(userData);
      } catch (error) {
        console.error('Error fetching user data:', error.message);
        toast.error('Failed to fetch user data. Please try again.');
      }
    };

    fetchUserData();
  }, [session]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sanitizedFormData = {
      newPassword: DOMPurify.sanitize(formData.newPassword),
      confirmNewPassword: DOMPurify.sanitize(formData.confirmNewPassword),
      userId: DOMPurify.sanitize(formData.userId),
    };

    try {
      const res = await fetch(`/api/users/${session?.user?.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedFormData),
      });

      if (res.ok) {
        console.log('Account updated successfully');
        toast.success('Account updated successfully');
        await signOut();
        router.push('/login');
      } else {
        const errorText = await res.text();
        console.error('Failed to update account:', errorText);
        toast.error('Failed to update account');
      }
    } catch (error) {
      console.error('Error updating account:', error.message);
      toast.error('Error updating account');
    }
  };

  const handleChange = (e) => {
    e.preventDefault();
    const newValue = e.target.value;
    setFormData({
      ...formData,
      [e.target.name]: newValue,
    });
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2 className='text-3xl text-center font-semibold mb-6'>
        Update Account
      </h2>

      {/* New Password */}
      <div className='mb-4'>
        <label
          htmlFor='newPassword'
          className='block text-gray-700 font-bold mb-2'
        >
          New Password
        </label>
        <input
          type='password'
          id='newPassword'
          name='newPassword'
          className='border rounded w-full py-2 px-3 mb-2'
          placeholder='New Password'
          value={formData.newPassword}
          onChange={handleChange}
          autoComplete='new-password'
        />
      </div>

      {/* Confirm New Password */}
      <div className='mb-4'>
        <label
          htmlFor='confirmNewPassword'
          className='block text-gray-700 font-bold mb-2'
        >
          Confirm New Password
        </label>
        <input
          type='password'
          id='confirmNewPassword'
          name='confirmNewPassword'
          className='border rounded w-full py-2 px-3 mb-2'
          placeholder='Confirm New Password'
          value={formData.confirmNewPassword}
          onChange={handleChange}
          autoComplete='new-password'
        />
      </div>

      {/* Submit Button */}
      <div>
        <button
          className='bg-black hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline'
          type='submit'
          disabled={loading}
        >
          Update
        </button>
      </div>
      <div className='text-center mt-3'>
        <p>
          Go back to{' '}
          <Link href={'/profile'} className='underline text-cyan-600'>
            Profile
          </Link>
        </p>
      </div>
    </form>
  );
};

export default UpdateProfile;
