import Image from 'next/image';
import ShopImage from '@/assets/images/butcher-shop.jpg';
import SignatureImage from '@/assets/images/signature.png';

const About = () => {
  return (
    <section className='p-12'>
      <div className='container-xl lg:container m-auto'>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:p-0 rounded-lg'>
          <div className='md:pr-8'>
            <h2 className='text-3xl md:text-4xl font-bold text-center md:text-left mb-4'>
              About EliteCuts
            </h2>
            <p className='text-base md:text-lg mb-4 leading-relaxed'>
              <span className='pl-4'>EliteCuts</span> is a modernized butcher
              shop that combines traditional butcher cuts with high-quality
              meats and exceptional service. Established in 2018, our store is
              dedicated to offering the finest quality cuts and meats in all of
              Southern California. We take pride in providing our customers with
              an unparalleled shopping experience, focusing on both the quality
              of our products and the excellence of our service.
            </p>
            <p className='text-base md:text-lg mb-4 leading-relaxed'>
              <span className='pl-4'>At</span> EliteCuts, customers have the
              convenience of ordering online and picking up their orders at our
              store, ensuring a seamless and hassle-free shopping experience.
              Whether you're a steak connoisseur or simply appreciate the finest
              cuts of meat, EliteCuts is committed to meeting and exceeding your
              expectations every time you visit.
            </p>
            <p className='text-base md:text-lg leading-relaxed'>
              <span className='pl-4'>Our</span>commitment to quality extends
              beyond our products to our community. We actively support local
              farmers and producers, ensuring that our meats are sustainably
              sourced and ethically raised. When you choose EliteCuts, you're
              not just getting exceptional meats – you're supporting a
              responsible and environmentally conscious business.
            </p>
            <div className='signature flex flex-col items-end pt-8'>
              <p className='text-right italic text-gray-500'>Tangelo Doe</p>
              <p className='text-right italic text-gray-500'>
                Founder, EliteCuts
              </p>
              <div className='w-40 md:w-auto pt-5'>
                <Image
                  src={SignatureImage}
                  alt='Signature'
                  width={100}
                  height={0}
                  className='w-full h-auto rounded-lg'
                />
              </div>
            </div>
          </div>
          <div className='md:pl-8 hidden md:flex justify-center items-center'>
            <div className='w-40 md:w-auto'>
              <Image
                src={ShopImage}
                alt='Outside The Store'
                width={450}
                height={0}
                className='w-[450px] h-auto rounded-lg'
                priority={true}
              />
              <figcaption className='text-gray-500 text-center mt-2'>
                Our Store 2018
              </figcaption>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
