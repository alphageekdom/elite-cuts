import HeroHeaderImage from './HeroHeaderImage';
import ProductSearchForm from './uielements/ProductSearchForm';
import Tomahawk from '@/assets/images/tomahawk.jpg';

const Hero = () => {
  return (
    <>
      <section className='relative w-full h-full bg-red-300'>
        <HeroHeaderImage image={Tomahawk} />
        <div className='absolute inset-0 flex justify-center items-center bg-black bg-opacity-40'>
          <div className='text-center'>
            <h1 className='text-7xl text-white uppercase tracking-widest font-semibold'>
              Welcome
            </h1>
            <h2 className='text-2xl font-extralight text-white tracking-wider'>
              Where Quality Meats Convenience
            </h2>
          </div>
        </div>
      </section>

      <section className='bg-[#B91C1B] py-20'>
        <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center'>
          <div className='text-center'>
            <h1 className='text-4xl font-extrabold text-white sm:text-5xl md:text-6xl'>
              Find Your Perfect Cut
            </h1>
            <p className='my-4 text-xl text-white'>
              Discover the perfect cut that suits your needs.
            </p>
          </div>
          <div className='search-form w-full'>
            <ProductSearchForm />
          </div>
        </div>
      </section>
    </>
  );
};

export default Hero;
