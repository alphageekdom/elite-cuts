import ReviewCard from './ReviewCard';
import JosephImage from '@/assets/images/joseph.jpg';
import SoniaImage from '@/assets/images/sonia.jpg';

const Reviews = () => {
  return (
    <section className='px-4 pt-6 pb-10'>
      <div className='container-xl lg:container m-auto'>
        <h1 className='text-4xl font-bold text-black mb-6 text-center'>
          Customer Reviews
        </h1>
        <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
          <ReviewCard
            bgColor='white'
            text='black'
            name='Joseph Doe'
            review="Absolutely top-notch meat cuts! Every bite is a testament to the quality and expertise of EliteCuts. As a local in Southern California, I'm fortunate to have such a gem nearby."
            imageSrc={JosephImage}
            favorite='/products/6632a88bdfbba9d57372e8a8'
          />
          <ReviewCard
            bgColor='black'
            text='white'
            name='Sonia Smith'
            review="EliteCuts' meat cuts are unparalleled. Each piece is tender, succulent, and elevates any meal to a gourmet experience. Living in Southern California, I can't imagine going anywhere else for my meat."
            imageSrc={SoniaImage}
            favorite='/products/6632a88bdfbba9d57372e8b3'
          />
        </div>
      </div>
    </section>
  );
};

export default Reviews;
