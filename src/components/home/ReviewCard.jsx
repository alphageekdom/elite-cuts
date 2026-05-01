import Image from 'next/image';
import Link from 'next/link';

const ReviewCard = ({ bgColor, text, name, review, imageSrc, favorite }) => {
  return (
    <div
      className={`relative flex flex-col md:flex-row rounded-xl bg-${bgColor} text-${text} custom-shadow`}
    >
      <div className='relative w-full h-full rounded-xl hidden md:block'>
        <Image
          src={imageSrc}
          alt={name}
          width={300}
          height={300}
          priority={true}
          className='object-cover w-full h-full rounded-t-xl md:rounded-tr-none md:rounded-l-xl'
        />
      </div>
      <div className='p-4 w-full flex flex-col justify-evenly'>
        <div>
          <p className='mb-4 text-lg'>{review}</p>
          <div className='flex flex-col items-center sm:flex-row sm:justify-end'>
            <span className='italic sm:mr-4'>— {name}</span>
            <div className='relative w-20 h-20 rounded-xl sm:hidden'>
              <Image
                src={imageSrc}
                alt={name}
                width={100}
                height={100}
                className='object-cover w-full h-full rounded-full'
              />
            </div>
          </div>
          <div className='flex justify-end mt-4'>
            <Link
              href={favorite}
              className='h-[36px] w-30 bg-red-800 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-center text-sm z-20'
            >
              Favorite Cut
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReviewCard;
