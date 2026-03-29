'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
    Clock,
    MapPin,
    Phone,
    ChefHat,
    CheckCircle,
    AlertCircle,
    Home,
    Package,
    Utensils,
    ArrowRight,
    Receipt,
    Copy,
  } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useParams, useRouter } from 'next/navigation';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

interface OrderItem {
  id: number;
  menu_item_id: string;
  quantity: number;
  notes?: string;
  menu_item: {
    name: string;
    price: number;
  };
}

interface Order {
  id: string;
  customer_id: string;
  order_type: string;
  approval_status: string;
  status: string;
  subtotal: number;
  tax: number;
  total: number;
  delivery_address?: string;
  customer_phone?: string;
  table_name?: string;
  couponCode?: string;
  created_at: string;
  items: OrderItem[];
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pending', color: 'bg-amber-50 text-amber-600 border-amber-100', icon: Clock },
  preparing: { label: 'Preparing', color: 'bg-orange-50 text-orange-600 border-orange-100', icon: ChefHat },
  ready: { label: 'Ready', color: 'bg-green-50 text-green-600 border-green-100', icon: Package },
  served: { label: 'Served', color: 'bg-emerald-50 text-emerald-600 border-emerald-100', icon: Utensils },
  paid: { label: 'Completed', color: 'bg-gray-50 text-gray-600 border-gray-100', icon: CheckCircle },
  cancelled: { label: 'Cancelled', color: 'bg-red-50 text-red-600 border-red-100', icon: AlertCircle },
};

const APPROVAL_CONFIG: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-600 border-amber-100',
  approved: 'bg-primary/10 text-primary border-primary/20',
  rejected: 'bg-red-50 text-red-600 border-red-100',
};

export default function PortalCustomerOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const portalUrl = params.portal_url as string;

  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  const restaurantId = typeof window !== 'undefined' ? localStorage.getItem('customer_restaurant_id') : '';
  const auth = typeof window !== 'undefined' ? localStorage.getItem('customer_auth') : null;
  const customerId = auth ? JSON.parse(auth).user_id : null;

  useEffect(() => {
    fetchOrders();
    setupWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders`, {
        headers: {
          'X-Restaurant-ID': restaurantId || '',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const customerOrders = data.filter((order: Order) => order.customer_id === customerId);
        setOrders(customerOrders.sort((a: Order, b: Order) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        ));
      }
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setIsLoading(false);
    }
  };

  const setupWebSocket = () => {
    try {
      wsRef.current = new WebSocket(WS_URL);
      wsRef.current.onmessage = (event) => {
        const message = JSON.parse(event.data);
        if (message.type === 'order_update') {
          setOrders((prevOrders) =>
            prevOrders.map((order) =>
              order.id === message.order_id
                ? { ...order, status: message.status, approval_status: message.approval_status }
                : order
            )
          );
        }
      };
    } catch (err) {
      console.error('WebSocket error:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-10 h-10 border-4 border-primary/30 border-t-primary rounded-full animate-spin mb-4" />
        <p className="text-gray-400 font-medium text-sm tracking-tight italic">Syncing your delicious history...</p>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-24 h-24 bg-white dark:bg-gray-900 rounded-[40px] flex items-center justify-center shadow-sm mb-8 border border-gray-50 dark:border-gray-800">
          <Receipt className="w-10 h-10 text-primary/30" />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight mb-2">
          No Orders Yet?
        </h3>
        <p className="text-gray-500 font-medium max-w-[260px] leading-relaxed mb-10">
          Your plate is empty! Start your journey to deliciousness today.
        </p>
        <Button
          onClick={() => router.push(`/${portalUrl}/customer`)}
          className="h-16 px-10 bg-primary hover:bg-primary/90 text-white font-black rounded-[24px] shadow-xl shadow-primary/20 active:scale-95 transition-all"
        >
          Explore Menu
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-24 px-5">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Orders History</h1>
        <p className="text-gray-500 font-medium text-sm">
          Keep track of your favorite meals
        </p>
      </div>

      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {orders.map((order, index) => (
            <motion.div
              key={order.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              layout
            >
              <Card className="premium-card overflow-hidden active:scale-[0.99] transition-all duration-300">
                <CardContent className="p-0">
                  {/* Order Header */}
                  <div className="px-6 py-5 bg-white dark:bg-gray-900 border-b border-gray-100/50 dark:border-gray-800/50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[9px] font-black text-primary uppercase tracking-[0.2em] bg-primary/5 px-2 py-1 rounded-lg">
                          Order
                        </span>
                        <span className="text-[14px] font-black tracking-tight text-gray-900 dark:text-white">
                          #{order.id.slice(0, 8).toUpperCase()}
                        </span>
                      </div>
                      {order.couponCode && (
                        <div className="mt-3 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                          <p className="text-[8px] font-black text-primary uppercase tracking-[0.15em] mb-1.5">Order Identity</p>
                          <div className="flex items-center gap-2 justify-between">
                            <span className="text-sm font-black text-primary tracking-tight">{order.couponCode}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(order.couponCode!);
                                toast.success('Coupon copied!');
                              }}
                              className="h-7 w-7 p-0 text-primary hover:bg-primary/20"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                      <p className="text-[11px] font-bold text-gray-400 mt-1">
                        {new Date(order.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                       <span className="text-xl font-black text-gray-900 dark:text-white tracking-tight">TSH {order.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                       <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{order.items.length} {order.items.length === 1 ? 'item' : 'items'}</span>
                    </div>
                  </div>

                  {/* Body */}
                  <div className="p-6 space-y-5">
                    {/* Status Section */}
                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className={`rounded-full border-none px-3 py-1 font-black text-[9px] uppercase tracking-[0.1em] ${APPROVAL_CONFIG[order.approval_status] || 'bg-gray-100'}`}>
                          {order.approval_status}
                        </Badge>
                        <Badge variant="outline" className={`rounded-full border-none px-3 py-1 font-black text-[9px] uppercase tracking-[0.1em] ${STATUS_CONFIG[order.status]?.color || 'bg-gray-100'}`}>
                          {STATUS_CONFIG[order.status]?.label || order.status}
                        </Badge>
                      </div>
                      
                      {/* Track Button for active orders */}
                      {(order.status === 'pending' || order.status === 'preparing' || order.status === 'ready') && (
                        <Button 
                          onClick={() => router.push(`/${portalUrl}/customer/track/${order.id}`)}
                          variant="ghost" 
                          className="h-10 px-4 rounded-xl text-primary font-black text-[11px] uppercase tracking-widest bg-primary/5 hover:bg-primary/10 transition-all group"
                        >
                          Track Order
                          <ArrowRight className="w-3.5 h-3.5 ml-1.5 transition-transform group-hover:translate-x-1" />
                        </Button>
                      )}
                    </div>

                    {/* Quick Item List */}
                    <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-[24px] p-4">
                       <div className="flex items-center gap-2 overflow-x-auto no-scrollbar scroll-smooth">
                          {order.items.map((item, idx) => (
                            <div key={item.id} className="flex-shrink-0 flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 px-3 py-1.5 rounded-xl shadow-sm">
                               <span className="text-[10px] font-black text-primary">{item.quantity}x</span>
                               <span className="text-[12px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[120px]">{item.menu_item.name}</span>
                            </div>
                          ))}
                       </div>
                    </div>

                    {/* Delivery Info */}
                    <div className="flex items-center justify-between px-1">
                       <div className="flex items-center gap-3">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
                            order.order_type === 'delivery' ? 'bg-orange-50 dark:bg-orange-950/30' : 'bg-gray-50 dark:bg-gray-800/50'
                          }`}>
                             {order.order_type === 'dine-in' ? <Home className="w-4 h-4 text-gray-400" /> : 
                              order.order_type === 'delivery' ? <MapPin className="w-4 h-4 text-orange-600" /> : 
                              <Package className="w-4 h-4 text-gray-400" /> }
                          </div>
                          <div className="flex flex-col">
                             <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">{order.order_type}</span>
                             <span className="text-[13px] font-bold text-gray-700 dark:text-gray-300 truncate max-w-[180px]">
                                {order.order_type === 'dine-in' ? `Table ${order.table_name || '---'}` : 
                                 order.delivery_address || 'Pickup' }
                             </span>
                          </div>
                       </div>
                       
                       {/* Reorder Button */}
                       <Button 
                         variant="ghost" 
                         size="icon" 
                         className="rounded-xl hover:bg-primary/10 hover:text-primary transition-colors h-11 w-11"
                         onClick={() => toast.success('Starting a new order with these items...')}
                       >
                          <ArrowRight className="w-5 h-5 -rotate-45" />
                       </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
