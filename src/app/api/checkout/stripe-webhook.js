import stripePackage from 'stripe';

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
const stripe = new stripePackage(stripeSecretKey);

export default async function handler(req, res) {
  if (req.method === 'POST') {
    const buf = await buffer(req);
    const signature = req.headers['stripe-signature'];

    let event;

    try {
      event = stripe.webhooks.constructEvent(
        buf,
        signature,
        stripeWebhookSecret
      );
    } catch (error) {
      console.error(error);
      return res.status(400).send(`Webhook Error: ${error.message}`);
    }

    // Handle the event based on its type
    switch (event.type) {
      case 'payment_intent.succeeded':
        const paymentIntent = event.data.object;
        // Handle successful payment
        console.log('Payment intent succeeded:', paymentIntent);
        break;
      case 'payment_intent.payment_failed':
        const paymentFailedIntent = event.data.object;
        // Handle failed payment
        console.log('Payment intent failed:', paymentFailedIntent);
        break;
      // Add more event types as needed
      default:
        console.warn(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ received: true });
  } else {
    res.status(405).json({ error: 'Method Not Allowed' });
  }
}

const buffer = async (readable) => {
  const chunks = [];
  for await (const chunk of readable) {
    chunks.push(
      typeof chunk === 'string' ? Buffer.from(chunk, 'utf-8') : chunk
    );
  }
  return Buffer.concat(chunks);
};
