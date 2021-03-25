import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
  const storagedCart = localStorage.getItem('@RocketShoes:cart');

  if (storagedCart) {
    return JSON.parse(storagedCart);
  }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const productAlreadyCart = cart.find(product => product.id === productId);
      const { data: stock } = await api.get<Stock>(`stock/${productId}`);

      if (productAlreadyCart) {
        const amountToIncrement = productAlreadyCart.amount + 1;


        if (amountToIncrement > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        const updatedCart = cart.map(cartItem => cartItem.id === productAlreadyCart.id ? {
          ...cartItem,
          amount: Number(cartItem.amount) + 1
        } : cartItem);

        setCart(updatedCart);

        localStorage.setItem('@RocketShoes:cart', JSON.stringify(updatedCart));

        toast.info('Product added to cart successfully');

      } else {
        const { data: product } = await api.get<Product>(`products/${productId}`);
        
        if (stock.amount > 0) {
          const productToSave = [...cart, {...product, amount: 1}];
  
          setCart(productToSave);

          localStorage.setItem('@RocketShoes:cart', JSON.stringify(productToSave));

          toast.info('Product added to cart successfully');
        }
      }
    } catch {
      toast.error('Erro na adição do produto');
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productToRemoved = cart.find(product => product.id === productId);

      if (!productToRemoved) {
        toast.error('Erro na remoção do produto');
        return;
      }
      
      const cartWithProductRemoved = cart.filter(product => product.id !== productToRemoved.id);

      setCart(cartWithProductRemoved);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithProductRemoved));

    } catch {
      toast.error('Erro na remoção do produto');
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productToUpdated = cart.find(product => product.id === productId);

      if (amount < 1 || !productToUpdated) {
        toast.error('Erro na alteração de quantidade do produto');
        return;
      }

      const responseProduct = await api.get(`stock/${productToUpdated.id}`);
      const amountProductToUpdated = responseProduct.data.amount;
      const stockIsNotAvaliable = amount > amountProductToUpdated;

      if (stockIsNotAvaliable) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      }

      const cartWithProductUpdated = cart.map(product => product.id === productToUpdated.id ? {
        ...product,
        amount
      }: product);

      setCart(cartWithProductUpdated);

      localStorage.setItem('@RocketShoes:cart', JSON.stringify(cartWithProductUpdated));
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
