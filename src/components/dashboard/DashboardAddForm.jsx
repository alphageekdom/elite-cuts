'use client';

import { useState, useEffect } from 'react';
import DOMPurify from 'dompurify';

const DashboardAddForm = () => {
  const [mounted, setMounted] = useState(false);

  const [formData, setFormData] = useState({
    type: '',
    name: '',
    price: '',
    inStock: '',
    title: '',
    rating: 0,
    images: [],
    reviews: [],
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prevFormData) => ({
      ...prevFormData,
      [name]: DOMPurify.sanitize(value),
    }));
  };

  const handleImageChange = (e) => {
    const { files } = e.target;

    const updatedImages = [...formData.images];

    for (const file of files) {
      updatedImages.push(file);
    }

    setFormData((prevFormData) => ({
      ...prevFormData,
      images: updatedImages,
    }));
  };

  return (
    mounted && (
      <form action='/api/products' method='POST' encType='multipart/form-data'>
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
            value={formData.type}
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
            required
            value={formData.name}
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
            value={formData.title}
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
            value={formData.description}
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
              value={formData.price}
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
              value={formData.inStock}
              onChange={handleChange}
            />
          </div>
        </div>

        <div className='mb-4'>
          <label
            htmlFor='images'
            className='block text-gray-700 font-bold mb-2'
          >
            Images (Select up to 4 images)
          </label>
          <input
            type='file'
            id='images'
            name='images'
            className='border rounded w-full py-2 px-3'
            accept='image/*'
            multiple
            onChange={handleImageChange}
            required
          />
        </div>

        <div>
          <button
            className='bg-blue-700 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded-full w-full focus:outline-none focus:shadow-outline'
            type='submit'
          >
            Add Product
          </button>
        </div>
      </form>
    )
  );
};

export default DashboardAddForm;
