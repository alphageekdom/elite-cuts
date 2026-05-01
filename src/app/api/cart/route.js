import User from '@/models/User';
import Product from '@/models/Product';
import Cart from '@/models/Cart';
import { getSessionUser } from '@/utils/getSessionUser';

// GET /api/cart
export const GET = async (req, res) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response('User ID Is Required', { status: 401 });
    }

    const { userId } = sessionUser;

    // Fetch user's cart from the database
    const cart = await fetchUserCart(userId);

    if (!cart) {
      return new Response('Cart not found', { status: 404 });
    }

    return new Response(JSON.stringify(cart), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('An error occurred:', error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// POST /api/cart
export const POST = async (req, res) => {
  try {
    const { productId, quantity } = await req.json();

    if (productId === undefined || quantity === undefined) {
      return new Response(
        JSON.stringify({
          message: 'Product ID and Quantity are Required',
        }),
        {
          status: 400,
        }
      );
    }

    const sessionUser = await getSessionUser();

    if (!sessionUser || !sessionUser.userId) {
      return new Response(
        JSON.stringify({
          message: 'User ID Is Required',
        }),
        {
          status: 401,
        }
      );
    }

    const { userId } = sessionUser;

    const [user, product] = await Promise.all([
      User.findOne({ _id: userId }),
      Product.findById(productId),
    ]);

    if (!user || !product) {
      return new Response(
        JSON.stringify({
          message: 'User or product not found',
        }),
        {
          status: 404,
        }
      );
    }

    const cart = await addToCart(user, product, quantity);

    return new Response(JSON.stringify(cart), {
      status: 200,
    });
  } catch (error) {
    console.error('An error occurred:', error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// DELETE /api/cart
export const DELETE = async (req, res) => {
  try {
    const sessionUser = await getSessionUser();

    if (!sessionUser) {
      return new Response('Unauthorized', { status: 401 });
    }

    const { userId } = sessionUser;

    const { itemId } = await req.json();

    await removeFromCart(userId, itemId);

    return new Response('Item removed from cart', {
      status: 200,
    });
  } catch (error) {
    console.error('An error occurred:', error);
    return new Response('Something Went Wrong', { status: 500 });
  }
};

// Example functions for handling cart operations
async function fetchUserCart(userId) {
  try {
    let cart = await Cart.findOne({ user: userId }).populate('items.product');

    if (!cart) {
      cart = await createCartForUser(userId);
    }

    return cart;
  } catch (error) {
    throw new Error(`Failed to fetch user's cart: ${error.message}`);
  }
}

async function addToCart(userId, item, quantity = 1) {
  try {
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const product = await Product.findById(item._id);

    if (!product) {
      throw new Error('Product not found');
    }

    const cartItem = {
      product: product._id,
      name: product.name,
      qty: quantity,
      images: product.images,
      price: product.price,
      productType: product.productType,
    };

    let cart = await Cart.findOne({ user: user._id });

    if (!cart) {
      cart = new Cart({
        user: user._id,
        items: [cartItem],
      });
    }

    const existingItemIndex = cart.items.findIndex((item) =>
      item.product.equals(product._id)
    );

    if (existingItemIndex !== -1) {
      cart.items[existingItemIndex].quantity = quantity;
    } else {
      cart.items.push(cartItem);
    }

    await cart.save();

    return;
  } catch (error) {
    throw new Error(`Failed to add item to cart: ${error.message}`);
  }
}

async function removeFromCart(userId, itemId) {
  try {
    const cart = await Cart.findOne({ user: userId });

    if (!cart) {
      throw new Error('Cart not found');
    }

    const itemIndex = cart.items.findIndex(
      (item) => item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      throw new Error('Item not found in the cart');
    }

    cart.items.splice(itemIndex, 1);

    await cart.save();
  } catch (error) {
    throw new Error(`Failed to remove item from cart: ${error.message}`);
  }
}

async function createCartForUser(userId) {
  try {
    const newCart = new Cart({ user: userId, items: [] });
    await newCart.save();
    return newCart;
  } catch (error) {
    throw new Error(`Failed to create cart for user: ${error.message}`);
  }
}
