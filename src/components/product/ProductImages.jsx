import Image from 'next/image';
import { Gallery, Item } from 'react-photoswipe-gallery';
import 'photoswipe/dist/photoswipe.css';

const ProductImages = ({ images }) => {
  return (
    <Gallery>
      <section className='bg-blue-50 p-4'>
        <div className='container mx-auto'>
          {images.length === 1 ? (
            <Item
              original={`/images/products/${images[0]}`}
              thumbnail={`/images/products/${images[0]}`}
              width='1000'
              height='600'
            >
              {({ ref, open }) => (
                <div
                  ref={ref}
                  onClick={open}
                  className='relative cursor-pointer mx-auto rounded-xl product-thumbnail'
                >
                  <div className='relative h-0 pb-[56.25%]'>
                    {' '}
                    {/* Aspect ratio of 16:9 */}
                    <Image
                      src={`/images/products/${images[0]}`}
                      alt={`Product image ${images[0]}`}
                      className='absolute inset-0 w-full h-full object-cover'
                      fill
                      sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                      priority={true}
                    />
                  </div>
                </div>
              )}
            </Item>
          ) : (
            <div className='grid grid-cols-2 gap-4'>
              {images.map((image, index) => (
                <div
                  key={index}
                  className={`
                  ${
                    images.length === 3 && index === 2
                      ? 'col-span-2'
                      : 'col-span-1'
                  }
                  relative h-0 pb-[56.25%] rounded-xl overflow-hidden product-thumbnail
                `}
                >
                  <Item
                    original={`/images/products/${image}`}
                    thumbnail={`/images/products/${image}`}
                    width='1000'
                    height='600'
                  >
                    {({ ref, open }) => (
                      <div
                        ref={ref}
                        onClick={open}
                        className='cursor-pointer absolute inset-0 w-full h-full'
                      >
                        <Image
                          src={`/images/products/${image}`}
                          alt={`Product image ${image}`}
                          className='absolute inset-0 w-full h-full object-cover'
                          fill
                          sizes='(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw'
                          priority={true}
                        />
                      </div>
                    )}
                  </Item>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </Gallery>
  );
};

export default ProductImages;
