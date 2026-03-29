'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ShoppingCart, Plus, Minus, MapPin, Home, Package, Search, ChefHat, CreditCard, Wallet, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams } from 'next/navigation';
import { OrderCoupon } from '@/components/portal/order-coupon';
import { CategoryPills } from '@/components/portal/CategoryPills';
import { MenuCard } from '@/components/portal/MenuCard';
import { DeliveryAddressPicker } from '@/components/portal/DeliveryAddressPicker';
import { portalFilterMatchesCategory } from '@/lib/menu-categories';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
}

interface CartItem {
  menuItemId: string;
  quantity: number;
  menuItem: MenuItem;
}

const CATEGORIES = ['all', 'main', 'appetizer', 'side', 'beverage', 'dessert'];

export default function PortalCustomerMenuPage() {
  const params = useParams();
  const portalUrl = params.portal_url as string;

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment' | 'success'>('cart');
  const [completedOrder, setOrderResponse] = useState<any>(null);

  // Order form state
  const [orderType, setOrderType] = useState<'dine-in' | 'delivery' | 'pickup'>('dine-in');
  const [tableId, setTableId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [restaurantId, setRestaurantId] = useState<string>('');

  useEffect(() => {
    const fetchRestaurantInfo = async () => {
      try {
        const res = await fetch(`${BASE_URL}/api/restaurants/portal/${portalUrl}`);
        if (res.ok) {
          const data = await res.json();
          setRestaurantId(data.id);
          localStorage.setItem('customer_restaurant_id', data.id);
          localStorage.setItem('customer_restaurant_name', data.name);
        }
      } catch (err) {
        console.error('Failed to fetch restaurant info:', err);
      }
    };

    const storedId = localStorage.getItem('customer_restaurant_id');
    if (storedId) {
      setRestaurantId(storedId);
    } else {
      fetchRestaurantInfo();
    }
  }, [portalUrl]);

  useEffect(() => {
    if (restaurantId) {
      fetchMenuItems();
      fetchTables();
    }
  }, [restaurantId]);

  useEffect(() => {
    filterItems();
  }, [menuItems, selectedCategory, searchQuery]);

  const fetchMenuItems = async () => {
    if (!restaurantId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/menu`, {
        headers: {
          'X-Restaurant-ID': restaurantId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMenuItems(data);
      }
    } catch (err) {
      toast.error('Failed to load menu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTables = async () => {
    if (!restaurantId) return;
    try {
      const res = await fetch(`${BASE_URL}/api/tables`, {
        headers: {
          'X-Restaurant-ID': restaurantId,
        },
      });
      if (res.ok) {
        const data = await res.json();
        setTables(data);
      }
    } catch (err) {
      // Tables might not be available for customers
    }
  };

  const filterItems = () => {
    let filtered = menuItems;

    if (selectedCategory && selectedCategory !== 'all') {
      filtered = filtered.filter(item =>
        portalFilterMatchesCategory(selectedCategory, item.category)
      );
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const addToCart = (item: MenuItem) => {
    setCart(prevCart => {
      const existing = prevCart.find(ci => ci.menuItemId === item.id);
      if (existing) {
        return prevCart.map(ci =>
          ci.menuItemId === item.id ? { ...ci, quantity: ci.quantity + 1 } : ci
        );
      }
      return [...prevCart, { menuItemId: item.id, quantity: 1, menuItem: item }];
    });
    toast.success(`${item.name} added to cart`);
  };

  const updateQuantity = (menuItemId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(menuItemId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(ci => (ci.menuItemId === menuItemId ? { ...ci, quantity } : ci))
    );
  };

  const removeFromCart = (menuItemId: string) => {
    setCart(prevCart => prevCart.filter(ci => ci.menuItemId !== menuItemId));
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.menuItem.price * item.quantity, 0);
  };

  const calculateTax = () => {
    const subtotal = calculateTotal();
    return subtotal * 0.1;
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();

    if (cart.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    if (orderType === 'dine-in' && !tableId) {
      toast.error('Please select a table');
      return;
    }

    if (orderType === 'delivery' && !deliveryAddress) {
      toast.error('Please enter delivery address');
      return;
    }

    if ((orderType === 'delivery' || orderType === 'pickup') && !customerPhone) {
      toast.error('Please enter your phone number');
      return;
    }

    setCheckoutStep('payment');
  };

  const handleProcessPayment = async () => {
    setIsSubmitting(true);
    try {
      // Simulate payment processing delay
      await new Promise(resolve => setTimeout(resolve, 2000));

      const auth = localStorage.getItem('customer_auth');
      const authData = auth ? JSON.parse(auth) : null;

      const subtotal = calculateTotal();
      const tax = calculateTax();
      const total = subtotal + tax;

      const res = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Restaurant-ID': restaurantId || '',
          'X-Customer-ID': authData?.user_id || '',
        },
        body: JSON.stringify({
          table_id: orderType === 'dine-in' ? tableId : null,
          table_name: orderType === 'dine-in' ? tables.find(t => t.id === tableId)?.name : null,
          customer_count: orderType === 'dine-in' ? 1 : null,
          status: 'pending',
          order_type: orderType,
          delivery_address: orderType === 'delivery' ? deliveryAddress : null,
          customer_phone: customerPhone || null,
          subtotal,
          tax,
          total,
          items: cart.map(ci => ({
            menu_item_id: ci.menuItemId,
            quantity: ci.quantity,
            notes: '',
          })),
        }),
      });

      if (!res.ok) {
        const error = await res.json();
        const errorMsg = Array.isArray(error.detail) 
          ? error.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ') 
          : (error.detail || 'Failed to place order');
        toast.error(errorMsg);
        return;
      }

      const orderData = await res.json();
      setOrderResponse(orderData);
      setCheckoutStep('success');
      setCart([]);
      toast.success('Payment successful & Order placed!');
    } catch (err) {
      toast.error('Failed to process payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium text-sm tracking-tight">Updating Menu...</p>
      </div>
    );
  }

  const cartTotal = calculateTotal();
  const cartTax = calculateTax();
  const cartGrandTotal = cartTotal + cartTax;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-8 pb-32 px-5">
      {/* Search & Filter */}
      <div className="space-y-6">
        <div className="relative group">
          <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Search className="w-4 h-4 text-gray-400 group-focus-within:text-primary transition-colors" />
          </div>
          <Input
            placeholder="Search our delicious menu..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-14 pl-11 pr-4 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-[0_4px_12px_rgba(0,0,0,0.03)] focus:ring-2 focus:ring-primary/20 placeholder:text-gray-400 text-[15px] transition-all"
          />
        </div>

        {/* Category Pills */}
        <CategoryPills 
          categories={CATEGORIES} 
          selectedCategory={selectedCategory} 
          onSelectCategory={setSelectedCategory} 
        />
      </div>

      {/* Menu Grid */}
      {filteredItems.length === 0 ? (
        <div className="text-center py-20 bg-white/50 dark:bg-gray-900/50 rounded-[32px] border border-dashed border-gray-200 dark:border-gray-800">
          <p className="text-gray-400 font-medium italic">No items found in this category</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredItems.map((item) => (
              <MenuCard 
                key={item.id} 
                item={item} 
                onAdd={addToCart} 
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <div className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto z-50">
          <Dialog open={showOrderDialog} onOpenChange={(open) => {
            setShowOrderDialog(open);
            if (!open) {
              setCheckoutStep('cart');
              setOrderResponse(null);
            }
          }}>
            <DialogTrigger asChild>
              <Button className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-bold rounded-[24px] shadow-[0_12px_30px_rgba(255,107,0,0.3)] flex items-center justify-between px-7 active:scale-[0.97] transition-all duration-300">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 w-8 h-8 rounded-xl flex items-center justify-center">
                    <ShoppingCart className="w-4 h-4" />
                  </div>
                  <span className="text-[16px] tracking-tight">{cartItemCount} {cartItemCount === 1 ? 'Item' : 'Items'}</span>
                </div>
                <span className="text-[18px] tracking-tight font-black">TSH {cartGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </Button>
            </DialogTrigger>

            <DialogContent className="sm:max-w-md rounded-[32px] p-0 overflow-hidden border-none bg-[#F8F9FA] dark:bg-black max-h-[90vh] flex flex-col">
              {checkoutStep === 'cart' && (
                <>
                  <div className="p-6 pt-10 bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 sticky top-0 z-20 shadow-sm">
                    <DialogHeader className="mb-4">
                      <DialogTitle className="text-2xl font-black tracking-tight text-gray-900 dark:text-white">Your Order</DialogTitle>
                      <DialogDescription className="text-gray-500 font-medium">Review and confirm your selection</DialogDescription>
                    </DialogHeader>
                  </div>

                  <div className="flex-1 p-6 space-y-6 overflow-y-auto no-scrollbar">
                    {/* Cart Items */}
                    <div className="space-y-3">
                      <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Order Summary</Label>
                      {cart.map(item => (
                        <div key={item.menuItemId} className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 rounded-[24px] shadow-sm border border-gray-50 dark:border-gray-800">
                          <div className="flex-1 min-w-0 pr-4">
                            <p className="font-bold text-[15px] text-gray-900 dark:text-white truncate">
                              {item.menuItem.name}
                            </p>
                            <p className="text-[13px] font-black text-primary mt-0.5">
                              TSH {item.menuItem.price.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                            </p>
                          </div>

                          <div className="flex items-center gap-3 bg-gray-50 dark:bg-gray-800 p-1.5 rounded-2xl">
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl bg-white dark:bg-gray-700 shadow-sm hover:text-primary transition-colors"
                              onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                            >
                              <Minus className="w-3 h-3" />
                            </Button>
                            <span className="w-6 text-center text-sm font-black text-gray-900 dark:text-white">
                              {item.quantity}
                            </span>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 rounded-xl bg-white dark:bg-gray-700 shadow-sm hover:text-primary transition-colors"
                              onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                            >
                              <Plus className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Order Type Selection */}
                    <div className="space-y-3">
                      <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Order Method</Label>
                      <div className="grid grid-cols-3 gap-3">
                        {[
                          { value: 'dine-in', label: 'Dine In', icon: Home },
                          { value: 'delivery', label: 'Delivery', icon: MapPin },
                          { value: 'pickup', label: 'Pickup', icon: Package },
                        ].map(type => (
                          <button
                            key={type.value}
                            onClick={() => {
                              setOrderType(type.value as any);
                              setTableId('');
                              setDeliveryAddress('');
                            }}
                            className={`p-4 rounded-[24px] border-2 transition-all duration-300 flex flex-col items-center gap-3 active:scale-95 ${orderType === type.value
                                ? 'border-primary bg-primary text-white shadow-lg shadow-primary/20'
                                : 'border-white dark:border-gray-900 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 shadow-sm hover:border-primary/20'
                              }`}
                          >
                            <type.icon className={`w-6 h-6 transition-colors ${orderType === type.value ? 'text-white' : 'text-gray-400 dark:text-gray-500'}`} />
                            <span className="text-[10px] font-black uppercase tracking-widest">{type.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="space-y-4">
                      {orderType === 'dine-in' && (
                        <div className="space-y-2">
                          <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Table Details</Label>
                          <Select value={tableId} onValueChange={setTableId}>
                            <SelectTrigger className="h-14 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm font-semibold">
                              <SelectValue placeholder="Which table are you at?" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl border-none shadow-xl">
                              {tables.map(table => (
                                <SelectItem key={table.id} value={table.id} className="rounded-xl my-1 font-medium">
                                  {table.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {orderType === 'delivery' && (
                        <DeliveryAddressPicker
                          onAddressSelect={(address) => setDeliveryAddress(address)}
                          initialAddress={deliveryAddress}
                        />
                      )}

                      <div className="space-y-2">
                        <Label className="text-[11px] font-black text-gray-400 uppercase tracking-[0.15em] px-1">Contact Info</Label>
                        <Input
                          type="tel"
                          placeholder="Your phone number"
                          value={customerPhone}
                          onChange={(e) => setCustomerPhone(e.target.value)}
                          className="h-14 rounded-2xl bg-white dark:bg-gray-900 border-none shadow-sm font-semibold focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                    </div>

                    {/* Pricing Details */}
                    <div className="p-6 bg-white dark:bg-gray-900 rounded-[32px] shadow-sm space-y-4 border border-gray-50 dark:border-gray-800">
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Subtotal</span>
                        <span className="font-bold text-gray-900 dark:text-white">TSH {cartTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="flex justify-between items-center text-[15px]">
                        <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Service Fee (10%)</span>
                        <span className="font-bold text-gray-900 dark:text-white">TSH {cartTax.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                      <div className="pt-4 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                        <span className="text-gray-900 dark:text-white font-black text-xl tracking-tight">Total</span>
                        <span className="text-primary font-black text-2xl tracking-tight">TSH {cartGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 pb-10 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 sticky bottom-0 z-20 shadow-[0_-10px_30px_rgba(0,0,0,0.05)]">
                    <Button
                      onClick={handlePlaceOrder}
                      disabled={isSubmitting}
                      className="w-full h-16 bg-primary hover:bg-primary/90 text-white font-black text-lg rounded-2xl shadow-xl shadow-primary/20 active:scale-95 transition-all"
                    >
                      Continue to Payment
                    </Button>
                  </div>
                </>
              )}

              {checkoutStep === 'payment' && (
                <div className="p-8 pb-12 space-y-8 text-center bg-white dark:bg-gray-900 flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar">
                  <div className="w-20 h-20 bg-primary/10 rounded-[32px] flex items-center justify-center mx-auto mb-4">
                    <CreditCard className="w-10 h-10 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">Complete Payment</h3>
                    <p className="text-gray-500 font-medium">Safe & Secure checkout via Airpay</p>
                  </div>

                  <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-[32px] border border-gray-100 dark:border-gray-700 space-y-4">
                    <div className="flex justify-between items-center px-2">
                      <span className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total Amount</span>
                      <span className="text-2xl font-black text-gray-900 dark:text-white">TSH {cartGrandTotal.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>

                    {/* Mock Payment Badge */}
                    <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/50 py-2.5 rounded-2xl flex items-center justify-center gap-2 mb-2">
                      <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
                      <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">Development Mode: Mock Success</span>
                    </div>

                    <div className="flex flex-col gap-2 pt-2">
                      <Button
                        onClick={handleProcessPayment}
                        disabled={isSubmitting}
                        className="h-14 bg-black dark:bg-white dark:text-black hover:opacity-90 rounded-2xl font-bold flex items-center justify-center gap-3"
                      >
                        {isSubmitting ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <>
                            <Wallet className="w-5 h-5" />
                            Pay with Airpay
                          </>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => setCheckoutStep('cart')}
                        className="text-gray-400 font-bold text-xs uppercase tracking-widest h-10"
                      >
                        Go Back
                      </Button>
                    </div>
                  </div>

                  <div className="flex items-center justify-center gap-2 text-gray-400">
                    <Check className="w-4 h-4 text-green-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest">End-to-End Encrypted</span>
                  </div>
                </div>
              )}

              {checkoutStep === 'success' && completedOrder && (
                <div className="p-6 pt-10 bg-[#F8F9FA] dark:bg-black overflow-y-auto max-h-[85vh] flex flex-col pb-12">
                  <OrderCoupon
                    order={{
                      id: completedOrder.id,
                      couponCode: completedOrder.coupon_code || '---',
                      total: completedOrder.total,
                      orderType: completedOrder.order_type,
                      createdAt: completedOrder.created_at,
                      restaurantName: typeof window !== 'undefined' ? localStorage.getItem('customer_restaurant_name') || 'Restaurant' : 'Restaurant'
                    }}
                  />
                  <div className="mt-8 text-center px-4">
                    <Button
                      onClick={() => {
                        setShowOrderDialog(false);
                        setTimeout(() => {
                          window.location.href = `/${portalUrl}/customer/orders`;
                        }, 500);
                      }}
                      className="w-full h-14 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 font-bold rounded-2xl active:scale-95 transition-all shadow-sm"
                    >
                      Track My Order
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
}
