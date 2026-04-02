'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  ShoppingCart, Plus, Minus, X, MapPin, Home, Package,
  Search, Sparkles, Coffee, UtensilsCrossed,
  CheckCircle2, Truck, Clock, Star, ArrowRight,
  Zap, TrendingUp, Award, Crown
} from 'lucide-react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { ClickPesaForm } from '@/components/payment/ClickPesaForm';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface MenuItem {
  id: string;
  name: string;
  price: number;
  category: string;
  description?: string;
  image_url?: string;
  isPopular?: boolean;
  spicy?: boolean;
  vegetarian?: boolean;
  isNew?: boolean;
  discount?: number;
}

interface CartItem {
  menuItemId: string;
  quantity: number;
  menuItem: MenuItem;
  specialInstructions?: string;
}

const CATEGORIES = [
  { id: 'main', label: 'Main Course', icon: UtensilsCrossed, color: 'from-orange-500 to-red-500', bg: 'bg-gradient-to-br from-orange-500/20 to-red-500/20' },
  { id: 'appetizer', label: 'Appetizers', icon: Coffee, color: 'from-yellow-500 to-orange-500', bg: 'bg-gradient-to-br from-yellow-500/20 to-orange-500/20' },
  { id: 'side', label: 'Sides', icon: Sparkles, color: 'from-green-500 to-emerald-500', bg: 'bg-gradient-to-br from-green-500/20 to-emerald-500/20' },
  { id: 'beverage', label: 'Beverages', icon: Coffee, color: 'from-blue-500 to-cyan-500', bg: 'bg-gradient-to-br from-blue-500/20 to-cyan-500/20' },
  { id: 'dessert', label: 'Desserts', icon: Star, color: 'from-pink-500 to-rose-500', bg: 'bg-gradient-to-br from-pink-500/20 to-rose-500/20' },
];

export default function CustomerMenuPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCategory, setSelectedCategory] = useState('main');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showOrderDialog, setShowOrderDialog] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'cart' | 'payment' | 'success'>('cart');
  const [completedOrder, setOrderResponse] = useState<any>(null);
  const [selectedItemForInstructions, setSelectedItemForInstructions] = useState<MenuItem | null>(null);
  const [specialInstructions, setSpecialInstructions] = useState('');

  // Order form state
  const [orderType, setOrderType] = useState<'dine-in' | 'delivery' | 'pickup'>('dine-in');
  const [tableId, setTableId] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [tables, setTables] = useState<any[]>([]);
  const [orderNotes, setOrderNotes] = useState('');

  const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('customer_restaurant_id') : '';

  useEffect(() => {
    fetchMenuItems();
    fetchTables();
  }, []);

  useEffect(() => {
    filterItems();
  }, [menuItems, selectedCategory, searchQuery]);

  const fetchMenuItems = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/menu`, {
        headers: {
          'X-Restaurant-ID': restaurantId || '',
        },
      });
      if (res.ok) {
        const data = await res.json();
        const enhancedData = data.map((item: MenuItem, index: number) => ({
          ...item,
          isPopular: index % 5 === 0,
          isNew: index % 7 === 0,
          vegetarian: index % 3 === 0,
          spicy: index % 4 === 0,
          discount: index % 8 === 0 ? 15 : undefined,
        }));
        setMenuItems(enhancedData);
      }
    } catch (err) {
      toast.error('Failed to load menu');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTables = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/tables`, {
        headers: {
          'X-Restaurant-ID': restaurantId || '',
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
      filtered = filtered.filter(item => item.category === selectedCategory);
    }

    if (searchQuery) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredItems(filtered);
  };

  const addToCart = (item: MenuItem, instructions?: string) => {
    setCart(prevCart => {
      const existing = prevCart.find(ci => ci.menuItemId === item.id);
      if (existing) {
        return prevCart.map(ci =>
          ci.menuItemId === item.id
            ? { ...ci, quantity: ci.quantity + 1, specialInstructions: instructions || ci.specialInstructions }
            : ci
        );
      }
      return [...prevCart, {
        menuItemId: item.id,
        quantity: 1,
        menuItem: item,
        specialInstructions: instructions
      }];
    });

    toast.success(`${item.name} added to cart`, {
      icon: <CheckCircle2 className="w-4 h-4 text-green-500" />,
      duration: 2000,
    });
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
    return cart.reduce((sum, item) => {
      const price = item.menuItem.discount
        ? item.menuItem.price * (1 - item.menuItem.discount / 100)
        : item.menuItem.price;
      return sum + price * item.quantity;
    }, 0);
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
      const auth = localStorage.getItem('customer_auth');
      const authData = auth ? JSON.parse(auth) : null;

      const subtotal = calculateTotal();
      const tax = calculateTax();
      const total = subtotal + tax;

      // Create order with pending status (payment will be confirmed via webhook/polling)
      const orderRes = await fetch(`${BASE_URL}/api/orders`, {
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
          order_notes: orderNotes,
          subtotal,
          tax,
          total,
          items: cart.map(ci => ({
            menu_item_id: ci.menuItemId,
            quantity: ci.quantity,
            notes: ci.specialInstructions || '',
          })),
        }),
      });

      if (!orderRes.ok) {
        const error = await orderRes.json();
        const errorMsg = Array.isArray(error.detail)
          ? error.detail.map((e: any) => `${e.loc.join('.')}: ${e.msg}`).join(', ')
          : (error.detail || 'Failed to place order');
        toast.error(errorMsg);
        return;
      }

      const orderData = await orderRes.json();

      // Create payment record that links to the order
      try {
        await fetch(`${BASE_URL}/api/payments`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Restaurant-ID': restaurantId || '',
          },
          body: JSON.stringify({
            order_id: orderData.id,
            amount: total,
            method: 'mobile_money',
            status: 'pending',
            reference: sessionStorage.getItem('pendingTransactionId'),
          }),
        });
      } catch (paymentErr) {
        console.error('Payment record creation failed:', paymentErr);
      }

      setOrderResponse(orderData);
      setCheckoutStep('success');
      setCart([]);
      sessionStorage.removeItem('pendingTransactionId');
      toast.success('Order placed! Payment confirmation pending', {
        description: 'Check your phone for the payment prompt'
      });
    } catch (err) {
      toast.error('Failed to process payment');
      console.error('Payment error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="w-20 h-20 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Coffee className="w-8 h-8 text-purple-500 animate-pulse" />
            </div>
          </div>
          <p className="mt-4 text-gray-600 dark:text-gray-400 font-medium">Loading delicious menu...</p>
        </motion.div>
      </div>
    );
  }

  const cartTotal = calculateTotal();
  const cartTax = calculateTax();
  const cartGrandTotal = cartTotal + cartTax;
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="space-y-6 pb-32">
      {/* Hero Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white shadow-2xl"
      >
        <div className="absolute inset-0 bg-black/20" />
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-40 h-40 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-3">
            <Sparkles className="w-5 h-5 animate-pulse" />
            <span className="text-sm font-medium">Today's Specials</span>
          </div>
          <h1 className="text-2xl font-bold mb-2">What would you like to order?</h1>
          <p className="text-white/90 text-sm">Explore our delicious menu and place your order</p>
        </div>
      </motion.div>

      {/* Search Bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="relative"
      >
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <Input
          placeholder="Search for dishes, ingredients..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-0 shadow-lg pl-10 pr-4 py-6 text-base focus:ring-2 focus:ring-blue-500"
        />
      </motion.div>

      {/* Category Pills */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        {CATEGORIES.map((cat, index) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setSelectedCategory(cat.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full whitespace-nowrap transition-all ${isActive
                ? `bg-gradient-to-r ${cat.color} text-white shadow-lg`
                : 'bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-sm font-medium">{cat.label}</span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* Menu Grid */}
      <AnimatePresence mode="wait">
        {filteredItems.length === 0 ? (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="text-center py-16"
          >
            <div className="w-24 h-24 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-full flex items-center justify-center mx-auto mb-4">
              <Search className="w-12 h-12 text-gray-400" />
            </div>
            <p className="text-gray-600 dark:text-gray-400 font-medium">No items found</p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-1">Try adjusting your search</p>
          </motion.div>
        ) : (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid grid-cols-1 sm:grid-cols-2 gap-4"
          >
            <AnimatePresence>
              {filteredItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -4 }}
                  className="group"
                >
                  <Card className="overflow-hidden border-0 shadow-xl rounded-2xl hover:shadow-2xl transition-all duration-300 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm">
                    {/* Item Image */}
                    <div className="relative h-48 bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-800 overflow-hidden">
                      {item.image_url ? (
                        <Image
                          src={item.image_url.startsWith('/') ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}${item.image_url}` : item.image_url}
                          alt={item.name}
                          fill
                          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                          className="object-cover group-hover:scale-110 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center">
                          <UtensilsCrossed className="w-12 h-12 text-white/50" />
                        </div>
                      )}

                      {/* Badges */}
                      <div className="absolute top-3 left-3 flex gap-2">
                        {item.discount && (
                          <span className="px-2 py-1 bg-red-500 text-white text-xs font-bold rounded-full flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            -{item.discount}%
                          </span>
                        )}
                        {item.isNew && (
                          <span className="px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            New
                          </span>
                        )}
                        {item.isPopular && !item.discount && (
                          <span className="px-2 py-1 bg-yellow-500 text-white text-xs font-medium rounded-full flex items-center gap-1">
                            <TrendingUp className="w-3 h-3" />
                            Popular
                          </span>
                        )}
                      </div>

                      <div className="absolute top-3 right-3 flex gap-2">
                        {item.vegetarian && (
                          <span className="px-2 py-1 bg-green-600 text-white text-xs font-medium rounded-full">
                            Veg
                          </span>
                        )}
                        {item.spicy && (
                          <span className="px-2 py-1 bg-red-600 text-white text-xs font-medium rounded-full">
                            🌶️ Spicy
                          </span>
                        )}
                      </div>

                      {/* Quick Add Button */}
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(item);
                        }}
                        className="absolute bottom-3 right-3 w-10 h-10 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full shadow-lg flex items-center justify-center hover:shadow-xl transition-all"
                      >
                        <Plus className="w-5 h-5 text-white" />
                      </motion.button>
                    </div>

                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 dark:text-white text-base line-clamp-1">
                            {item.name}
                          </h3>
                          {item.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                              {item.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
                        <div className="flex items-baseline gap-2">
                          {item.discount ? (
                            <>
                              <span className="font-bold text-lg text-gray-900 dark:text-white">
                                TSH {(item.price * (1 - item.discount / 100)).toLocaleString()}
                              </span>
                              <span className="text-xs text-gray-400 line-through">
                                TSH {item.price.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            <span className="font-bold text-lg text-gray-900 dark:text-white">
                              TSH {item.price.toLocaleString()}
                            </span>
                          )}
                        </div>
                        <Button
                          size="sm"
                          onClick={() => setSelectedItemForInstructions(item)}
                          variant="ghost"
                          className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                        >
                          <Crown className="w-4 h-4 mr-1" />
                          Customize
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Special Instructions Dialog */}
      <Dialog open={!!selectedItemForInstructions} onOpenChange={() => setSelectedItemForInstructions(null)}>
        <DialogContent className="rounded-3xl bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/50">
          <DialogHeader>
            <DialogTitle className="text-2xl gradient-text">Special Instructions</DialogTitle>
            <DialogDescription>
              Add any special requests for {selectedItemForInstructions?.name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <textarea
              placeholder="e.g., no onions, extra sauce, well done..."
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
            <Button
              onClick={() => {
                if (selectedItemForInstructions) {
                  addToCart(selectedItemForInstructions, specialInstructions);
                  setSelectedItemForInstructions(null);
                  setSpecialInstructions('');
                }
              }}
              className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl"
            >
              Add to Cart
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Floating Cart Button */}
      <AnimatePresence>
        {cart.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            transition={{ type: "spring", damping: 20 }}
            className="fixed bottom-20 left-4 right-4 md:max-w-2xl md:left-1/2 md:-translate-x-1/2 z-50"
          >
            <Dialog open={showOrderDialog} onOpenChange={(open) => {
              setShowOrderDialog(open);
              if (!open) {
                setCheckoutStep('cart');
                setOrderResponse(null);
              }
            }}>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowOrderDialog(true)}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl shadow-2xl transition-all duration-300"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <ShoppingCart className="w-6 h-6" />
                      <motion.span
                        key={cartItemCount}
                        initial={{ scale: 0.5 }}
                        animate={{ scale: 1 }}
                        className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center"
                      >
                        {cartItemCount}
                      </motion.span>
                    </div>
                    <div className="text-left">
                      <p className="font-bold">Your Cart</p>
                      <p className="text-xs opacity-90">{cart.length} items</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg">TSH {cartGrandTotal.toLocaleString()}</p>
                    <p className="text-xs opacity-90">incl. tax</p>
                  </div>
                </div>
              </motion.button>

              <DialogContent className="sm:max-w-md rounded-3xl p-0 overflow-hidden bg-gradient-to-br from-white to-blue-50 dark:from-gray-900 dark:to-blue-950/50 max-h-[90vh] flex flex-col">
                {checkoutStep === 'cart' && (
                  <>
                    <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 p-6 text-white relative overflow-hidden sticky top-0 z-20 shadow-sm">
                      <div className="absolute inset-0 bg-black/20" />
                      <DialogHeader className="relative z-10 text-white">
                        <DialogTitle className="text-white text-2xl">Your Order</DialogTitle>
                        <DialogDescription className="text-white/90">
                          Review and confirm your delicious choices
                        </DialogDescription>
                      </DialogHeader>
                    </div>

                    <div className="p-6 space-y-4 flex-1 overflow-y-auto no-scrollbar">
                      {/* Cart Items */}
                      <AnimatePresence>
                        {cart.map((item) => (
                          <motion.div
                            key={item.menuItemId}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center justify-between p-3 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm rounded-2xl"
                          >
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">
                                {item.menuItem.name}
                              </p>
                              {item.specialInstructions && (
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 italic">
                                  "{item.specialInstructions}"
                                </p>
                              )}
                              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                                TSH {item.menuItem.price.toLocaleString()} each
                              </p>
                            </div>

                            <div className="flex items-center gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-xl"
                                onClick={() => updateQuantity(item.menuItemId, item.quantity - 1)}
                              >
                                <Minus className="w-3 h-3" />
                              </Button>
                              <span className="w-8 text-center text-sm font-medium">
                                {item.quantity}
                              </span>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0 rounded-xl"
                                onClick={() => updateQuantity(item.menuItemId, item.quantity + 1)}
                              >
                                <Plus className="w-3 h-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 w-8 p-0 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-xl"
                                onClick={() => removeFromCart(item.menuItemId)}
                              >
                                <X className="w-4 h-4" />
                              </Button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>

                      {/* Order Type Selection */}
                      <div className="space-y-3 pt-4">
                        <Label className="text-sm font-semibold">How would you like to receive your order?</Label>
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { value: 'dine-in', label: 'Dine In', icon: Home, desc: 'Enjoy at restaurant', color: 'from-blue-500 to-cyan-500' },
                            { value: 'delivery', label: 'Delivery', icon: Truck, desc: 'To your door', color: 'from-purple-500 to-pink-500' },
                            { value: 'pickup', label: 'Pickup', icon: Package, desc: 'Take away', color: 'from-green-500 to-emerald-500' },
                          ].map(type => (
                            <motion.button
                              key={type.value}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              onClick={() => {
                                setOrderType(type.value as any);
                                setTableId('');
                                setDeliveryAddress('');
                              }}
                              className={`p-3 rounded-2xl border-2 transition-all text-center ${orderType === type.value
                                ? `bg-gradient-to-r ${type.color} text-white border-transparent shadow-lg`
                                : 'border-gray-200 dark:border-gray-800 hover:border-gray-300 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm'
                                }`}
                            >
                              <type.icon className={`w-5 h-5 mx-auto mb-1 ${orderType === type.value ? 'text-white' : ''}`} />
                              <p className="text-sm font-medium">{type.label}</p>
                              <p className="text-xs opacity-70">{type.desc}</p>
                            </motion.button>
                          ))}
                        </div>
                      </div>

                      {/* Order Type Specific Fields */}
                      <AnimatePresence mode="wait">
                        {orderType === 'dine-in' && (
                          <motion.div
                            key="dinein"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <Label htmlFor="table">Select Your Table</Label>
                            <Select value={tableId || ''} onValueChange={setTableId}>
                              <SelectTrigger id="table" className={`rounded-xl bg-white/80 dark:bg-gray-900/80 ${!tableId ? 'text-gray-500' : ''}`}>
                                <SelectValue placeholder="Choose your table" />
                              </SelectTrigger>
                              <SelectContent className="z-[999]">
                                {tables && tables.length > 0 ? (
                                  tables.map(table => (
                                    <SelectItem key={table.id} value={String(table.id)}>
                                      {table.name}
                                    </SelectItem>
                                  ))
                                ) : (
                                  <div className="px-2 py-1.5 text-sm text-gray-500">No tables available</div>
                                )}
                              </SelectContent>
                            </Select>
                            {!tableId && (
                              <p className="text-xs text-red-500 font-medium">Required: Please select a table</p>
                            )}
                          </motion.div>
                        )}

                        {orderType === 'delivery' && (
                          <motion.div
                            key="delivery"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <Label htmlFor="address">Delivery Address</Label>
                            <Input
                              id="address"
                              placeholder="Enter your delivery address"
                              value={deliveryAddress}
                              onChange={(e) => setDeliveryAddress(e.target.value)}
                              className="rounded-xl bg-white/80 dark:bg-gray-900/80"
                            />
                          </motion.div>
                        )}

                        {(orderType === 'delivery' || orderType === 'pickup') && (
                          <motion.div
                            key="phone"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="space-y-2 overflow-hidden"
                          >
                            <Label htmlFor="phone">Phone Number</Label>
                            <Input
                              id="phone"
                              type="tel"
                              placeholder="+1 (555) 000-0000"
                              value={customerPhone}
                              onChange={(e) => setCustomerPhone(e.target.value)}
                              className="rounded-xl bg-white/80 dark:bg-gray-900/80"
                            />
                          </motion.div>
                        )}
                      </AnimatePresence>

                      {/* Order Notes */}
                      <div className="space-y-2">
                        <Label htmlFor="notes">Order Notes (Optional)</Label>
                        <textarea
                          id="notes"
                          placeholder="Any special requests for the restaurant?"
                          value={orderNotes}
                          onChange={(e) => setOrderNotes(e.target.value)}
                          className="w-full p-3 rounded-xl border border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          rows={2}
                        />
                      </div>

                      {/* Totals */}
                      <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Subtotal</span>
                          <span className="font-medium">TSH {cartTotal.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600 dark:text-gray-400">Tax (10%)</span>
                          <span className="font-medium">TSH {cartTax.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-base font-bold pt-2">
                          <span>Total</span>
                          <span className="text-blue-600 dark:text-blue-400 text-xl">TSH {cartGrandTotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-6 pt-0 pb-8 sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800/50">
                      <Button
                        onClick={handlePlaceOrder}
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-bold rounded-xl text-base shadow-lg"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            Processing...
                          </div>
                        ) : (
                          <>
                            Continue to Payment
                            <ArrowRight className="w-4 h-4 ml-2" />
                          </>
                        )}
                      </Button>
                    </div>
                  </>
                )}

                {checkoutStep === 'payment' && (
                  <div className="p-8 pb-12 space-y-8 bg-white dark:bg-gray-900 flex-1 flex flex-col justify-center overflow-y-auto no-scrollbar">
                    <ClickPesaForm
                      amount={cartGrandTotal}
                      customerPhone={customerPhone}
                      restaurantId={restaurantId}
                      orderId={completedOrder?.id || ''}
                      isLoading={isSubmitting}
                      onSuccess={() => {
                        handleProcessPayment();
                      }}
                      onBack={() => setCheckoutStep('cart')}
                    />
                  </div>
                )}

                {checkoutStep === 'success' && completedOrder && (
                  <div className="p-6 pt-10 bg-[#F8F9FA] dark:bg-black overflow-y-auto max-h-[85vh] flex flex-col pb-12">
                    <div className="text-center space-y-6">
                      <div className="flex justify-center">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ type: 'spring', delay: 0.2 }}
                          className="w-20 h-20 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-10 h-10 text-green-600" />
                        </motion.div>
                      </div>
                      <div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white">Order Placed!</h3>
                        <p className="text-gray-500 font-medium mt-2">Your payment is being processed</p>
                      </div>
                      <div className="p-6 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3 text-left">
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Order ID</span>
                          <span className="font-bold text-gray-900 dark:text-white">{completedOrder.id}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Amount</span>
                          <span className="font-bold text-gray-900 dark:text-white">TSH {completedOrder.total?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600 dark:text-gray-400">Type</span>
                          <span className="font-bold text-gray-900 dark:text-white capitalize">{completedOrder.order_type}</span>
                        </div>
                      </div>
                      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-xl p-4">
                        <p className="text-sm text-blue-900 dark:text-blue-200 font-medium">Check your phone for the payment prompt. Complete the payment to confirm your order.</p>
                      </div>
                    </div>
                    <div className="mt-8">
                      <Button
                        onClick={() => {
                          setShowOrderDialog(false);
                          setTimeout(() => {
                            window.location.href = '/customer/orders';
                          }, 500);
                        }}
                        className="w-full h-12 bg-white dark:bg-gray-900 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-800 font-bold rounded-xl active:scale-95 transition-all shadow-sm"
                      >
                        Track My Order
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
