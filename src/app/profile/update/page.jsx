import UpdateProfile from '@/components/UpdateProfile';

const UpdatePage = () => {
  return (
    <section className='min-h-screen flex-grow'>
      <div className='container m-auto max-w-lg py-24'>
        <div className='bg-white px-6 py-8 mb-4 custom-shadow rounded-md m-4 md:m-0'>
          <UpdateProfile />
        </div>
      </div>
      <div className='flex-grow'></div>
    </section>
  );
};

export default UpdatePage;
