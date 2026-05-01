import React from 'react';
import SponsorCard from './SponsorCard';
import GrillImage from '@/assets/images/grill.jpg';
import Knives from '@/assets/images/knives.jpg';

const Sponsor = () => {
  return (
    <section className='px-4 pt-6 pb-10 bg-blue-50'>
      <div className='container-xl lg:container m-auto'>
        <h1 className='text-4xl font-bold text-black mb-6 text-center'>
          Our Sponsors
        </h1>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-lg'>
          <SponsorCard
            heading='Grills'
            backgroundColor='bg-gray-100'
            buttonInfo={{
              text: 'Browse',
              link: 'https://rcsgasgrills.com/collections/bbq-grills',
              backgroundColor: 'bg-black',
            }}
            imageSrc={GrillImage}
          >
            Explore premium grills from our esteemed sponsor, renowned for their
            commitment to excellence and innovation.
          </SponsorCard>
          <SponsorCard
            heading='Kitchen Knives'
            backgroundColor='bg-blue-100'
            buttonInfo={{
              text: 'Browse',
              link: 'https://cutleryandmore.com/collections/kitchen-knives-cutlery',
              backgroundColor: 'bg-blue-600',
            }}
            imageSrc={Knives}
          >
            Delve into exquisite kitchen knife sets from our distinguished
            sponsor, recognized for their dedication to precision and culinary
            craftsmanship.
          </SponsorCard>
        </div>
      </div>
    </section>
  );
};

export default Sponsor;
