'use client';

import { useState, useEffect } from 'react';
import { FaCheck, FaTimes } from 'react-icons/fa';
import Link from 'next/link';
import Pagination from '../uielements/Pagination';
import Spinner from '../Spinner';
import { useSession } from 'next-auth/react';
useSession;

const UsersList = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  const { data: session } = useSession();
  const isAdmin = session?.user?.isAdmin;

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [totalItems, setTotalItems] = useState(0);

  const [sortField, setSortField] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch(
          `/api/users?page=${page}&pageSize=${pageSize}&sortField=${sortField}&sortOrder=${sortOrder}`
        );

        if (!res.ok) {
          throw new Error('Failed To Fetch Data');
        }

        const data = await res.json();
        setUsers(data.users);
        setTotalItems(data.total);
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, [page, pageSize, sortField, sortOrder]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
  };

  const handleSort = (field) => {
    if (field === sortField) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const deleteUser = async (userId, isAdmin) => {
    try {
      // Check if the user is trying to delete another admin
      if (isAdmin === true) {
        // Display error message
        console.error('You cannot delete another admin');
        return;
      }

      // Display confirmation dialog
      const confirmed = window.confirm(
        'Are you sure you want to delete this user?'
      );

      // If user confirms deletion
      if (confirmed) {
        const res = await fetch(`/api/users?userId=${userId}`, {
          method: 'DELETE',
        });

        if (!res.ok) {
          throw new Error('Failed to delete user');
        }

        // Remove the deleted user from the state
        setUsers(users.filter((user) => user._id !== userId));
      }
    } catch (error) {
      console.error('Error deleting user:', error);
    }
  };

  return loading ? (
    <Spinner />
  ) : (
    <div className='pb-4 bg-white rounded-2xl'>
      {users.length === 0 ? (
        <div className='flex items-center justify-center h-96'>
          <p className='text-gray-600 text-3xl'>No Users Found</p>
        </div>
      ) : (
        <div className='overflow-x-auto'>
          <table className='min-w-full divide-y divide-gray-200'>
            <thead className='bg-[#B91C1B] text-white text-md'>
              <tr>
                <th
                  scope='col'
                  className='px-6 py-3 text-left font-medium uppercase tracking-wider cursor-pointer rounded-tl-2xl'
                  onClick={() => handleSort('name')}
                >
                  Name
                  {sortField === 'name' && (
                    <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left  font-medium uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('email')}
                >
                  Email
                  {sortField === 'email' && (
                    <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left  font-medium uppercase tracking-wider cursor-pointer'
                  onClick={() => handleSort('isAdmin')}
                >
                  Admin
                  {sortField === 'isAdmin' && (
                    <span>{sortOrder === 'asc' ? ' ▲' : ' ▼'}</span>
                  )}
                </th>
                <th
                  scope='col'
                  className='px-6 py-3 text-left font-medium uppercase tracking-wider rounded-tr-2xl'
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody className='bg-white divide-y divide-gray-200'>
              {users.map((user) => (
                <tr key={user._id}>
                  <td className='px-6 py-4 whitespace-nowrap'>{user.name}</td>
                  <td className='px-6 py-4 whitespace-nowrap'>{user.email}</td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    {user.isAdmin ? (
                      <FaCheck className='text-green-500' />
                    ) : (
                      <FaTimes className='text-red-500' />
                    )}
                  </td>
                  <td className='px-6 py-4 whitespace-nowrap'>
                    <Link
                      href={`/product?id=${user.id}`}
                      className='text-blue-600 hover:text-blue-900 mr-4'
                    >
                      Edit
                    </Link>
                    <button
                      className='text-red-600 hover:text-red-900'
                      onClick={() => deleteUser(user._id, user.isAdmin)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Pagination
        page={page}
        pageSize={pageSize}
        totalItems={totalItems}
        onPageChange={handlePageChange}
      />
    </div>
  );
};

export default UsersList;
