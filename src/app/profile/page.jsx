import Image from 'next/image';
import profileDefault from '@/assets/images/user-default.png';
import connectDB from '@/config/database';
import { getSessionUser } from '@/utils/getSessionUser';
import { convertToSerializeableObject } from '@/utils/convertToObject';
import Link from 'next/link';
import BackButton from '@/components/uielements/BackButton';
import User from '@/models/User';
import Product from '@/models/Product';
import ProfileBookmarks from '@/components/ProfileBookmarks';

const ProfilePage = async () => {
  await connectDB();

  const sessionUser = await getSessionUser();

  if (!sessionUser || !sessionUser.userId) {
    return (
      <section className='bg-blue-50'>
        <div className='container m-auto py-24'>
          <div className='bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0'>
            <h1 className='text-3xl font-bold mb-4'>Your Profile</h1>
            <p className='text-xl'>Please log in to view your profile.</p>
          </div>
        </div>
      </section>
    );
  }

  const { userId } = sessionUser;
  const user = await User.findById(userId).populate('bookmarks').lean();

  const bookmarks = user.bookmarks || [];
  const productIds = bookmarks.map((bookmark) => bookmark._id);
  const products = await Product.find({ _id: { $in: productIds } }).lean();

  const serializedProducts = products.map(convertToSerializeableObject);

  return (
    <>
      <BackButton href={'/'} />
      <section className='bg-blue-50'>
        <div className='container m-auto py-24'>
          <div className='bg-white px-6 py-8 mb-4 shadow-md rounded-md border m-4 md:m-0'>
            <h1 className='text-3xl font-bold mb-4'>Your Profile</h1>
            <div className='flex flex-col md:flex-row'>
              <div className='md:w-1/4 mx-20 mt-10'>
                <div className='mb-4'>
                  <Image
                    className='h-32 w-32 md:h-48 md:w-48 rounded-full mx-auto md:mx-0'
                    src={sessionUser.user.image || profileDefault}
                    width={200}
                    height={200}
                    alt='User'
                    priority
                  />
                </div>
                <h2 className='text-2xl mb-4'>
                  <span className='font-bold block'>Name: </span>{' '}
                  {sessionUser.user.name}
                </h2>
                <h2 className='text-2xl mb-4'>
                  <span className='font-bold block'>Email: </span>{' '}
                  {sessionUser.user.email}
                </h2>
                <Link
                  href={'/profile/update'}
                  className='bg-green-700 text-white px-4 py-2 rounded-md'
                >
                  Update Profile
                </Link>
              </div>
              <hr className='border-gray-200 my-10 md:hidden' />
              <div className='md:w-3/4 md:pl-4'>
                <h2 className='text-xl font-semibold mb-4'>Your Bookmarks</h2>
                {serializedProducts.length === 0 ? (
                  <p>You Have No Bookmarks</p>
                ) : (
                  <ProfileBookmarks bookmarks={serializedProducts} />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
};

export default ProfilePage;
