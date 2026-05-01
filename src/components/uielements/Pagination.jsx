import {
  MdOutlineArrowBackIosNew,
  MdOutlineArrowForwardIos,
} from 'react-icons/md';

const Pagination = ({ page, pageSize, totalItems, onPageChange }) => {
  const totalPages = Math.ceil(totalItems / pageSize);

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      onPageChange(newPage);
    }
  };
  return (
    <section className='container mx-auto flex justify-center items-center my-8'>
      <button
        className={`ml-2 px-2 py-1 text-3xl ${
          page === 1 ? 'text-gray-500' : ''
        }`}
        disabled={page === 1}
        title='Previous'
        onClick={() => handlePageChange(page - 1)}
      >
        <MdOutlineArrowBackIosNew />
      </button>
      <span className='mx-2'>
        {page} of {totalPages}
      </span>
      <button
        className={`ml-2 px-2 py-1 text-3xl ${
          page === totalPages ? 'text-gray-500' : ''
        }`}
        disabled={page === totalPages}
        title='Next'
        onClick={() => handlePageChange(page + 1)}
      >
        <MdOutlineArrowForwardIos />
      </button>
    </section>
  );
};

export default Pagination;
