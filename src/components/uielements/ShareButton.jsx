import {
  FacebookShareButton,
  EmailShareButton,
  TwitterShareButton,
  WhatsappShareButton,
  FacebookIcon,
  XIcon,
  WhatsappIcon,
  EmailIcon,
} from 'react-share';
const ShareButtons = ({ product }) => {
  const shareUrl = `${process.env.NEXT_PUBLIC_DOMAIN}/products/${product._id}`;
  return (
    <>
      <h3 className='text-xl font-bold text-center pt-2'>Share This Product</h3>
      <div className='flex gap-3 justify-center pb-5'>
        <FacebookShareButton
          url={shareUrl}
          quote={product.name}
          aria-label='Facebook'
          hashtag={`#${product.name.replace(/\s/g, '')}Lovers`}
        >
          <FacebookIcon size={40} round={true} />
        </FacebookShareButton>

        <TwitterShareButton
          url={shareUrl}
          title={product.name}
          aria-label='X/Twitter'
          hashtags={[`${product.name.replace(/\s/g, '')}Lovers`]}
        >
          <XIcon size={40} round={true} />
        </TwitterShareButton>

        <WhatsappShareButton
          url={shareUrl}
          title={product.name}
          aria-label='WhatsApp'
          separator=':: '
        >
          <WhatsappIcon size={40} round={true} />
        </WhatsappShareButton>

        <EmailShareButton
          url={shareUrl}
          subject={product.name}
          aria-label='Email'
          body={`Check Out This Product Listing: ${shareUrl}`}
        >
          <EmailIcon size={40} round={true} />
        </EmailShareButton>
      </div>
    </>
  );
};

export default ShareButtons;
