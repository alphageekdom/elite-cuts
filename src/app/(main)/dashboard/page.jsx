import Dashboard from '@/components/dashboard/Dashboard';
import BackButton from '@/components/uielements/BackButton';

const AdminPage = () => {
  return (
    <>
      <BackButton href={'/'} />
      <section className='bg-blue-50'>
        <div className='container m-auto py-10 px-6'>
          <h1 className='text-5xl font-bold'>Admin Dashboard</h1>
          <div className='grid grid-cols-1 md:grid-cols-70/30 w-full gap-6'>
            <Dashboard />
          </div>
        </div>
      </section>
    </>
  );
};

export default AdminPage;
