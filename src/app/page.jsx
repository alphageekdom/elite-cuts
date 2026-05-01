import About from '@/components/home/About';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import Hero from '@/components/home/Hero';
import Reviews from '@/components/home/Reviews';
import Sponsor from '@/components/home/Sponsor';

const HomePage = async () => {
  return (
    <>
      <Hero />
      <Sponsor />
      <About />
      <FeaturedProducts />
      <Reviews />
    </>
  );
};

export default HomePage;
