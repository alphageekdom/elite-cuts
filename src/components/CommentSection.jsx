import React, { useState, useEffect } from 'react';
import { BsStarFill } from 'react-icons/bs';
import { useSession } from 'next-auth/react';
import DOMPurify from 'dompurify';
import Spinner from './Spinner';

const CommentSection = ({ product }) => {
  const { data: session, status } = useSession();
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState('');
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(false);
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  const fetchProductDetails = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/products/${product._id}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setRating(data.rating);
      } else {
        console.error('Failed to fetch product details:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching product details:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProductDetails();
    setRating(0);

    const isReviewSubmitted = localStorage.getItem(
      `reviewSubmitted_${product._id}`
    );
    if (isReviewSubmitted === 'true') {
      setReviewSubmitted(true);
    }
  }, [product._id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (reviewSubmitted) {
      console.log('You have already submitted a review.');
      return;
    }
    try {
      setLoading(true);
      const sanitizedComment = DOMPurify.sanitize(comment);
      const response = await fetch(`/api/products/${product._id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rating, comment: sanitizedComment }),
      });
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
        setRating(0);
        setComment('');
        setReviewSubmitted(true);
        localStorage.setItem(`reviewSubmitted_${product._id}`, 'true');
      } else {
        console.error('Failed to submit review');
      }
    } catch (error) {
      console.error('Error submitting review:', error);
    } finally {
      setLoading(false);
    }
  };

  return loading ? (
    <Spinner />
  ) : (
    <div className='bg-white p-6 rounded-lg mt-6'>
      <h2 className='text-lg font-semibold mb-2'>Leave a Review</h2>
      {status === 'authenticated' && !reviewSubmitted ? (
        <form onSubmit={handleSubmit}>
          <div className='flex flex-col mb-4'>
            <label htmlFor='comment' className='mb-1'>
              Comment:
            </label>
            <textarea
              id='comment'
              value={comment}
              className='border border-gray-300 rounded-md p-2'
              onChange={(e) => setComment(e.target.value)}
            />
          </div>
          <div className='flex flex-col mb-4'>
            <label htmlFor='rating' className='mb-1'>
              Rating:
            </label>
            <select
              id='rating'
              value={rating}
              onChange={(e) => setRating(parseInt(e.target.value))}
              className='border border-gray-300 rounded-md p-2'
            >
              <option value={0}>Select Rating</option>
              <option value={1}>1 Star</option>
              <option value={2}>2 Stars</option>
              <option value={3}>3 Stars</option>
              <option value={4}>4 Stars</option>
              <option value={5}>5 Stars</option>
            </select>
          </div>
          <button
            type='submit'
            className='bg-blue-700 hover:bg-blue-500 text-white px-4 py-2 rounded-md'
          >
            Submit Review
          </button>
        </form>
      ) : (
        <p className='text-gray-600 mt-4'>
          {reviewSubmitted
            ? 'You have already submitted a review.'
            : 'Please login to comment and rate.'}
        </p>
      )}
      {/* Display existing reviews and ratings */}
      <h2 className='text-lg font-semibold mt-4'>Existing Reviews</h2>
      <div className='mt-2'>
        {reviews && reviews.length > 0 ? (
          reviews.map((review, index) => (
            <div key={index} className='border-b border-gray-300 py-4'>
              <div className='flex items-center'>
                <p className='text-lg font-semibold mr-2'>
                  {review.userName || 'Anonymous'}
                </p>
                <p className='text-gray-500'>Rating: {review.rating}/5</p>
                <div className='flex ml-2'>
                  {[...Array(review.rating)].map((_, i) => (
                    <BsStarFill key={i} className='w-6 h-6 text-yellow-500' />
                  ))}
                </div>
              </div>
              <p className='mt-2'>{DOMPurify.sanitize(review.comment)}</p>
            </div>
          ))
        ) : (
          <p>No reviews available</p>
        )}
      </div>
      <p className='text-lg font-semibold mt-4'>Average Rating: {rating}</p>
    </div>
  );
};

export default CommentSection;
