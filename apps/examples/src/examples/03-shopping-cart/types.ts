/**
 * Product and Cart types for the shopping example
 */

export interface Product {
  id: string;
  name: string;
  price: number;
  category: string;
  image: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface CartState {
  items: CartItem[];
  isCheckingOut: boolean;
  checkoutComplete: boolean;
  error: string | null;
}
