import { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { CartItem, Pasta, PendriveSize } from '@/shared/types';

interface CartState {
  items: CartItem[];
  pendriveSize: PendriveSize;
}

type CartAction = 
  | { type: 'ADD_ITEM'; pasta: Pasta }
  | { type: 'REMOVE_ITEM'; pastaId: string }
  | { type: 'UPDATE_QUANTITY'; pastaId: string; quantidade: number }
  | { type: 'CLEAR_CART' }
  | { type: 'SET_PENDRIVE_SIZE'; size: PendriveSize }
  | { type: 'LOAD_CART'; state: CartState };

const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM':
      const existingItem = state.items.find(item => item.pasta.id === action.pasta.id);
      if (existingItem) {
        return {
          ...state,
          items: state.items.map(item =>
            item.pasta.id === action.pasta.id
              ? { ...item, quantidade: item.quantidade + 1 }
              : item
          )
        };
      }
      return {
        ...state,
        items: [...state.items, { pasta: action.pasta, quantidade: 1 }]
      };

    case 'REMOVE_ITEM':
      return {
        ...state,
        items: state.items.filter(item => item.pasta.id !== action.pastaId)
      };

    case 'UPDATE_QUANTITY':
      if (action.quantidade <= 0) {
        return {
          ...state,
          items: state.items.filter(item => item.pasta.id !== action.pastaId)
        };
      }
      return {
        ...state,
        items: state.items.map(item =>
          item.pasta.id === action.pastaId
            ? { ...item, quantidade: action.quantidade }
            : item
        )
      };

    case 'CLEAR_CART':
      return {
        ...state,
        items: []
      };

    case 'SET_PENDRIVE_SIZE':
      return {
        ...state,
        pendriveSize: action.size
      };

    case 'LOAD_CART':
      return action.state;

    default:
      return state;
  }
};

const CartContext = createContext<{
  state: CartState;
  dispatch: React.Dispatch<CartAction>;
  addItem: (pasta: Pasta) => void;
  removeItem: (pastaId: string) => void;
  updateQuantity: (pastaId: string, quantidade: number) => void;
  clearCart: () => void;
  setPendriveSize: (size: PendriveSize) => void;
  getTotals: () => {
    totalItems: number;
    totalMusicas: number;
    totalTamanho: number;
    totalValor: number;
    capacityUsed: number;
    canCheckout: boolean;
  };
} | null>(null);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(cartReducer, {
    items: [],
    pendriveSize: 16
  });

  // Load cart from localStorage on mount
  useEffect(() => {
    const savedCart = localStorage.getItem('musicadrive-cart');
    if (savedCart) {
      try {
        const cartState = JSON.parse(savedCart);
        dispatch({ type: 'LOAD_CART', state: cartState });
      } catch (error) {
        console.error('Error loading cart from localStorage:', error);
      }
    }
  }, []);

  // Save cart to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('musicadrive-cart', JSON.stringify(state));
  }, [state]);

  const addItem = (pasta: Pasta) => {
    dispatch({ type: 'ADD_ITEM', pasta });
  };

  const removeItem = (pastaId: string) => {
    dispatch({ type: 'REMOVE_ITEM', pastaId });
  };

  const updateQuantity = (pastaId: string, quantidade: number) => {
    dispatch({ type: 'UPDATE_QUANTITY', pastaId, quantidade });
  };

  const clearCart = () => {
    dispatch({ type: 'CLEAR_CART' });
  };

  const setPendriveSize = (size: PendriveSize) => {
    dispatch({ type: 'SET_PENDRIVE_SIZE', size });
  };

  const getTotals = () => {
    const totalItems = state.items.reduce((sum, item) => sum + item.quantidade, 0);
    const totalMusicas = state.items.reduce((sum, item) => sum + (item.pasta.qtd_musicas * item.quantidade), 0);
    const totalTamanho = state.items.reduce((sum, item) => sum + (item.pasta.tamanho_gb * item.quantidade), 0);
    const totalValor = state.items.reduce((sum, item) => sum + (item.pasta.preco * item.quantidade), 0);
    const capacityUsed = (totalTamanho / state.pendriveSize) * 100;
    const canCheckout = totalItems > 0 && totalTamanho <= state.pendriveSize;

    return {
      totalItems,
      totalMusicas,
      totalTamanho,
      totalValor,
      capacityUsed: Math.min(capacityUsed, 100),
      canCheckout
    };
  };

  return (
    <CartContext.Provider value={{
      state,
      dispatch,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
      setPendriveSize,
      getTotals
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
