'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';

const Register = () => {
  const router = useRouter();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevData) => ({
      ...prevData,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const sanitizedFormData = {
      name: DOMPurify.sanitize(formData.name),
      email: DOMPurify.sanitize(formData.email),
      password: DOMPurify.sanitize(formData.password),
      confirmPassword: DOMPurify.sanitize(formData.confirmPassword),
    };

    if (sanitizedFormData.password !== sanitizedFormData.confirmPassword) {
      toast.error('Passwords do not match');
      setLoading(false);
      return;
    }

    // Client-side validation
    if (sanitizedFormData.password.length < 6) {
      toast.error('Password must be at least 6 characters long');
      setLoading(false);
      return;
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(sanitizedFormData.email)) {
      toast.error('Invalid email address');
      setLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sanitizedFormData),
      });

      if (res.ok) {
        toast.success('Registration Successful!');
        router.push('/login');
      } else if (res.status === 409) {
        toast.error('Email Already In Use');
      } else {
        const data = await res.json();
        toast.error(data.message || 'Registration Failed');
      }
    } catch (error) {
      console.error(error);
      toast.error('Something Went Wrong');
    } finally {
      setLoading(false);
    }
  };
  return (
    <form onSubmit={handleSubmit}>
      <h2 className='text-3xl text-center font-semibold mb-6'>
        Create An Account
      </h2>

      {/* <!-- Name --> */}
      <div className='mb-4'>
        <label htmlFor='name' className='block text-gray-700 font-bold mb-2'>
          Name
        </label>
        <input
          type='text'
          id='name'
          name='name'
          className='border rounded w-full py-2 px-3 mb-2'
          placeholder='Full Name'
          required
          value={formData.name}
          onChange={handleChange}
          autoComplete='new-name'
        />
      </div>

      {/* <!-- Email --> */}
      <div className='mb-4'>
        <label htmlFor='email' className='block text-gray-700 font-bold mb-2'>
          Email
        </label>
        <input
          type='email'
          id='email'
          name='email'
          className='border rounded w-full py-2 px-3 mb-2'
          placeholder='Email address'
          required
          value={formData.email}
          onChange={handleChange}
          autoComplete='new-email'
        />
      </div>

      {/* <!-- Password --> */}
      <div className='mb-4'>
        <label
          htmlFor='password'
          className='block text-gray-700 font-bold mb-2'
        >
          Password
        </label>
        <input
          type='password'
          id='password'
          name='password'
          className='border rounded w-full py-2 px-3 mb-2'
          placeholder='Password'
          required
          value={formData.password}
          onChange={handleChange}
          autoComplete='new-password'
        />
      </div>

      {/* <!-- Confirm Password --> */}
      <div className='mb-4'>
        <label
          htmlFor='confirmPassword'
          className='block text-gray-700 font-bold mb-2'
        >
          Confirm Password
        </label>
        <input
          type='password'
          id='confirmPassword'
          name='confirmPassword'
          className='border rounded w-full py-2 px-3 mb-2'
          placeholder='Confirm Password'
          required
          value={formData.confirmPassword}
          onChange={handleChange}
          autoComplete='new-password'
        />
      </div>

      {/* <!-- Submit Button --> */}
      <div>
        <button
          className='bg-black hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline'
          type='submit'
        >
          Register
        </button>
      </div>
      <div className='text-center mt-3'>
        <p>
          Do You Have An Account?{' '}
          <Link href={'/login'} className='underline text-cyan-600'>
            Login
          </Link>
        </p>
      </div>
    </form>
  );
};

export default Register;
