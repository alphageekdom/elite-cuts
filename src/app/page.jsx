import About from '@/components/About';
import FeaturedProducts from '@/components/FeaturedProducts';
import Hero from '@/components/Hero';
import Reviews from '@/components/Reviews';
import Sponsor from '@/components/Sponsor';

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
