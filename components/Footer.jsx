import {
  FaFacebook,
  FaTwitter,
  FaInstagram,
  FaPinterest,
  FaLinkedin,
  FaYoutube,
  FaEnvelope,
  FaPhone,
  FaMapPin,
} from 'react-icons/fa';

const Footer = () => {
  return (
    <footer className='bg-footer-bg text-white py-8 reverse-shadow'>
      <div className='container mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 px-4'>
        {/* Company Information */}
        <div className='mb-4 md:mb-0'>
          <h1 className='text-lg font-semibold mb-2'>
            Copyright &copy; {new Date().getFullYear()} EliteCuts
          </h1>
          <p className='text-sm flex items-center'>
            <FaMapPin className='mr-1' />
            <a
              href='https://www.google.com/maps/search/?api=1&query=123+Carnivore+Street+Grillville+CA+90210'
              target='_blank'
              rel='noopener noreferrer'
            >
              123 Carnivore Street
            </a>
          </p>
          <p className='text-sm ml-5 mb-1'>Grillville, CA 90210</p>
          <p className='text-sm flex items-center mb-1'>
            <FaPhone className='mr-1' />{' '}
            <a href='tel:+15551234567'>(555) 123-4567</a>
          </p>
          <p className='text-sm flex items-center'>
            <FaEnvelope className='mr-1' />{' '}
            <a href='mailto:info@meatcuttingwebapp.com'>
              info@meatcuttingwebapp.com
            </a>
          </p>
        </div>

        {/* Quick Links */}
        <div>
          <h1 className='text-lg font-semibold mb-2'>Quick Links</h1>
          <ul>
            <li className='text-sm mb-1'>
              <a href='#' className='hover:text-gray-400'>
                About Us
              </a>
            </li>
            <li className='text-sm mb-1'>
              <a href='#' className='hover:text-gray-400'>
                Services
              </a>
            </li>
            <li className='text-sm mb-1'>
              <a href='#' className='hover:text-gray-400'>
                Contact Us
              </a>
            </li>
          </ul>
        </div>

        {/* Social Media Icons */}
        <div>
          <h1 className='text-lg font-semibold mb-2'>Follow Us</h1>
          <div className='flex space-x-4'>
            <a
              href='https://www.facebook.com'
              className='text-2xl hover:text-gray-400'
              aria-label='Facebook'
            >
              <FaFacebook />
            </a>
            <a
              href='https://twitter.com'
              className='text-2xl hover:text-gray-400'
              aria-label='Twitter'
            >
              <FaTwitter />
            </a>
            <a
              href='https://www.instagram.com'
              className='text-2xl hover:text-gray-400'
              aria-label='Instagram'
            >
              <FaInstagram />
            </a>
            <a
              href='https://www.pinterest.com'
              className='text-2xl hover:text-gray-400'
              aria-label='Pinterest'
            >
              <FaPinterest />
            </a>
            <a
              href='https://www.linkedin.com'
              className='text-2xl hover:text-gray-400'
              aria-label='LinkedIn'
            >
              <FaLinkedin />
            </a>
            <a
              href='https://www.youtube.com'
              className='text-2xl hover:text-gray-400'
              aria-label='YouTube'
            >
              <FaYoutube />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
