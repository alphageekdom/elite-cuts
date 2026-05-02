import About from '@/components/home/About';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Hero from '@/components/home/Hero';
import Marquee from '@/components/home/Marquee';
import Partners from '@/components/home/Partners';
import Reviews from '@/components/home/Reviews';

const HomePage = async () => {
  return (
    <>
      <Hero />
      <Marquee />
      <Partners />
      <About />
      <FeaturedProducts />
      <Reviews />
    </>
  );
};

export default HomePage;
