'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import Spinner from '@/components/Spinner';
import Link from 'next/link';

const Dashboard = () => {
  const { data: session, status } = useSession();

  const [productsCount, setProductsCount] = useState(0);
  const [usersCount, setUsersCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      if (status === 'authenticated' && session?.user?.isAdmin) {
        try {
          const res = await fetch(`/api/dashboard`);
          if (!res.ok) {
            throw new Error('Failed To Fetch Data');
          }
          const data = await res.json();
          setProductsCount(data.products);
          setUsersCount(data.users);
          setLoading(false);
        } catch (error) {
          console.log(error);
          setLoading(false);
        }
      } else if (status === 'loading') {
      } else {
        router.push('/login');
      }
    };

    fetchData();
  }, [session, status, router]);

  return loading ? (
    <Spinner />
  ) : (
    <div className='p-6 text-center md:text-left mt-6'>
      <div className='mb-4 grid grid-cols-1 md:grid-cols-2 gap-4'>
        {/* Left Card */}
        <div className='p-4 bg-white rounded-2xl'>
          <div className='mb-4 text-lg'>
            <div className='flex justify-between items-center mb-2'>
              <p className='text-left font-semibold'>Products:</p>
              <p className='text-gray-500'>{productsCount}</p>
            </div>
            <div className='flex gap-4'>
              <Link
                href='/products/list'
                className='py-2 px-4 bg-blue-700 hover:bg-blue-500 text-white'
              >
                Edit Products
              </Link>
              <Link
                href='/products/add'
                className='py-2 px-4 bg-green-700 hover:bg-green-500 text-white'
              >
                Add Product
              </Link>
            </div>
          </div>
        </div>
        {/* Right Card */}
        <div className='p-4 bg-white rounded-2xl'>
          <div className='mb-4 text-lg'>
            <div className='flex justify-between items-center mb-2'>
              <p className='text-left font-semibold'>Users:</p>
              <p className='text-gray-500'>{usersCount}</p>
            </div>
            <div className='text-right'>
              <Link
                href='/users'
                className='py-2 px-4 bg-blue-700 hover:bg-blue-500 text-white'
              >
                Edit Users
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
