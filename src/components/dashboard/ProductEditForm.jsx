'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import DOMPurify from 'dompurify';

const ProductEditForm = () => {
  const { id } = useParams();
  const router = useRouter();

  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [fields, setFields] = useState({
    type: '',
    name: '',
    price: '',
    inStock: '',
    title: '',
  });

  useEffect(() => {
    setMounted(true);

    // Fetch product data for form
    const fetchProductData = async () => {
      try {
        const res = await fetch(`/api/products/${id}`);
        const productData = await res.json();

        const { rating, ...restFields } = productData;
        setFields(restFields);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProductData();
  }, [id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFields((prevFields) => ({
      ...prevFields,
      [name]: DOMPurify.sanitize(value),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const formData = new FormData(e.target);

      const response = await fetch(`/api/products/${id}`, {
        method: 'PUT',
        body: formData,
      });

      if (response.status === 200) {
        router.push(`/products/${id}`);
      } else if (response.status === 401 || response.status === 403) {
        toast.error('Permission denied');
      } else {
        toast.error('Something went wrong');
      }
    } catch (error) {
      console.error('Error updating product:', error.message);
      // Handle error, show error message, etc.
      toast.error('Failed to update product');
    }
  };

  return (
    mounted &&
    !loading && (
      <form onSubmit={handleSubmit}>
        <h2 className='text-3xl text-center font-semibold mb-6'>
          Add Product Form
        </h2>

        <div className='mb-4'>
          <label htmlFor='type' className='block text-gray-700 font-bold mb-2'>
            Type of Meat
          </label>
          <select
            id='type'
            name='type'
            className='border rounded w-full py-2 px-3'
            required
            value={fields.type || ''}
            onChange={handleChange}
          >
            <option value='Beef'>Beef</option>
            <option value='Pork'>Pork</option>
            <option value='Poultry'>Poultry</option>
            <option value='Lamb'>Lamb</option>
            <option value='Goat'>Goat</option>
            <option value='Bison'>Bison</option>
          </select>
        </div>
        <div className='mb-4'>
          <label htmlFor='name' className='block text-gray-700 font-bold mb-2'>
            Cut Name
          </label>
          <input
            type='text'
            id='name'
            name='name'
            className='border rounded w-full py-2 px-3 mb-2'
            placeholder='Ribeye, T-Bone, etc.'
            autoComplete='Product Name'
            required
            value={fields.name}
            onChange={handleChange}
          />
        </div>
        <div className='mb-4'>
          <label
            htmlFor='title'
            className='block text-sm font-medium text-gray-700'
          >
            Title
          </label>
          <input
            name='title'
            id='title'
            required
            rows={4}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
            value={fields.title}
            onChange={handleChange}
          ></input>
        </div>
        <div className='mb-4'>
          <label
            htmlFor='description'
            className='block text-sm font-medium text-gray-700'
          >
            Description
          </label>
          <textarea
            name='description'
            id='description'
            required
            rows={4}
            className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
            value={fields.description || ''}
            onChange={handleChange}
          ></textarea>
        </div>

        <div className='mb-4 flex flex-wrap gap-5'>
          <div className='w-full sm:w-1/3'>
            <label
              htmlFor='price'
              className='block text-sm font-medium text-gray-700'
            >
              Price
            </label>
            <input
              type='text'
              name='price'
              id='price'
              required
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
              value={fields.price}
              onChange={handleChange}
            />
          </div>

          <div className='w-full sm:w-1/3'>
            <label
              htmlFor='inStock'
              className='block text-sm font-medium text-gray-700'
            >
              Stock Quantity
            </label>
            <input
              type='number'
              name='inStock'
              id='inStock'
              required
              className='mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm'
              value={fields.inStock}
              onChange={handleChange}
            />
          </div>
        </div>

        <div>
          <button
            className='bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline'
            type='submit'
          >
            Update Product
          </button>
        </div>
      </form>
    )
  );
};
export default ProductEditForm;
