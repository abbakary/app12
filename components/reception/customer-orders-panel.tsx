'use client';

import { useState, useEffect } from 'react';
import type { Order } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import { Check, X, Truck, User, Phone, MapPin, Clock } from 'lucide-react';
import { toast } from 'sonner';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle_type: string;
  rating: number;
  is_available: boolean;
}

export function CustomerOrdersPanel({ restaurantId, onOrderApproved }: { restaurantId: string; onOrderApproved?: () => void }) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedOrderForDriver, setSelectedOrderForDriver] = useState<Order | null>(null);
  const [selectedDriver, setSelectedDriver] = useState<string>('');
  const [assigningDriver, setAssigningDriver] = useState(false);

  useEffect(() => {
    fetchPendingOrders();
    fetchDrivers();
    const interval = setInterval(() => {
      fetchPendingOrders();
    }, 5000);
    return () => clearInterval(interval);
  }, [restaurantId]);

  const fetchPendingOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${BASE_URL}/api/orders/pending-approval`, {
        headers: { 'X-Restaurant-ID': restaurantId }
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
      }
    } catch (err) {
      console.error('Failed to fetch pending orders', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/drivers`, {
        headers: { 'X-Restaurant-ID': restaurantId }
      });
      if (res.ok) {
        const data = await res.json();
        setDrivers(data);
      }
    } catch (err) {
      console.error('Failed to fetch drivers', err);
    }
  };

  const approveOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${orderId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Restaurant-ID': restaurantId
        },
        body: JSON.stringify({
          approval_status: 'approved',
          approval_notes: 'Approved by reception'
        })
      });

      if (res.ok) {
        toast.success('Order approved! ✅');
        fetchPendingOrders();
        onOrderApproved?.();
      } else {
        toast.error('Failed to approve order');
      }
    } catch (err) {
      toast.error('Error approving order');
    }
  };

  const rejectOrder = async (orderId: string) => {
    try {
      const res = await fetch(`${BASE_URL}/api/orders/${orderId}/approval`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-Restaurant-ID': restaurantId
        },
        body: JSON.stringify({
          approval_status: 'rejected',
          approval_notes: 'Rejected by reception'
        })
      });

      if (res.ok) {
        toast.success('Order rejected ✓');
        fetchPendingOrders();
      } else {
        toast.error('Failed to reject order');
      }
    } catch (err) {
      toast.error('Error rejecting order');
    }
  };

  const assignDriverToOrder = async () => {
    if (!selectedOrderForDriver || !selectedDriver) {
      toast.error('Please select a driver');
      return;
    }

    try {
      setAssigningDriver(true);
      const res = await fetch(
        `${BASE_URL}/api/drivers/${selectedOrderForDriver.id}/assign-driver`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Restaurant-ID': restaurantId
          },
          body: JSON.stringify({ driver_id: selectedDriver })
        }
      );

      if (res.ok) {
        toast.success('Driver assigned! 🚗');
        setSelectedOrderForDriver(null);
        setSelectedDriver('');
        fetchPendingOrders();
      } else {
        toast.error('Failed to assign driver');
      }
    } catch (err) {
      toast.error('Error assigning driver');
    } finally {
      setAssigningDriver(false);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading orders...</p>
        </div>
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 font-medium">No pending orders</p>
          <p className="text-sm text-slate-400 mt-1">All customer orders have been approved!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {orders.map(order => {
        const driverAssigned = order.driver;
        const isDelivery = order.order_type === 'delivery';

        return (
          <Card key={order.id} className="overflow-hidden hover:shadow-lg transition-shadow">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 pb-3">
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <CardTitle className="text-lg">Order #{order.couponCode || order.id.slice(0, 8).toUpperCase()}</CardTitle>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(order.created_at).toLocaleDateString()} {new Date(order.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <Badge variant={isDelivery ? 'default' : 'secondary'}>
                  {isDelivery ? '🚚 Delivery' : '📦 Pickup'}
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-4">
              {/* Order Items */}
              <div>
                <h4 className="font-semibold text-sm mb-2">Items</h4>
                <div className="space-y-1 text-sm">
                  {order.items.map(item => (
                    <div key={item.id} className="flex justify-between">
                      <span className="text-slate-600">{item.menu_item?.name || 'Unknown'}</span>
                      <span className="font-medium">x{item.quantity}</span>
                    </div>
                  ))}
                </div>
                <div className="border-t border-slate-200 dark:border-slate-700 mt-2 pt-2 flex justify-between font-bold">
                  <span>Total:</span>
                  <span className="text-lg text-blue-600">TSH {order.total.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                </div>
              </div>

              {/* Customer Info */}
              <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg space-y-2">
                <div className="flex items-start gap-2">
                  <Phone className="h-4 w-4 text-slate-500 mt-0.5" />
                  <span className="text-sm">{order.customer_phone}</span>
                </div>
                {isDelivery && (
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 text-slate-500 mt-0.5" />
                    <span className="text-sm">{order.delivery_address}</span>
                  </div>
                )}
              </div>

              {/* Driver Assignment Status */}
              {isDelivery && (
                <div className="bg-gradient-to-r from-orange-50 to-red-50 dark:from-orange-950/30 dark:to-red-950/30 p-3 rounded-lg">
                  {driverAssigned ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Truck className="h-4 w-4 text-green-600" />
                        <span className="font-semibold text-green-700 dark:text-green-400">Driver Assigned</span>
                      </div>
                      <div className="bg-white dark:bg-slate-800 p-2 rounded space-y-1 text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3" />
                          <span>{driverAssigned.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Phone className="h-3 w-3" />
                          <span>{driverAssigned.phone}</span>
                        </div>
                        <div className="text-xs text-slate-500">
                          {driverAssigned.vehicle_type} • Rating: ⭐ {driverAssigned.rating}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full border-orange-300 text-orange-700 hover:bg-orange-50 dark:border-orange-700 dark:text-orange-400"
                          onClick={() => setSelectedOrderForDriver(order)}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Assign Driver
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Assign Driver to Delivery</DialogTitle>
                          <DialogDescription>
                            Select a driver for Order #{order.couponCode || order.id.slice(0, 8).toUpperCase()}
                          </DialogDescription>
                        </DialogHeader>

                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium mb-2 block">Available Drivers</label>
                            <Select value={selectedDriver} onValueChange={setSelectedDriver}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a driver" />
                              </SelectTrigger>
                              <SelectContent>
                                {drivers.filter(d => d.is_available).length > 0 ? (
                                  drivers
                                    .filter(d => d.is_available)
                                    .map(driver => (
                                      <SelectItem key={driver.id} value={driver.id}>
                                        <div className="flex items-center gap-2">
                                          <span>{driver.name}</span>
                                          <span className="text-xs text-slate-500">({driver.vehicle_type})</span>
                                        </div>
                                      </SelectItem>
                                    ))
                                ) : (
                                  <SelectItem value="none" disabled>
                                    No available drivers
                                  </SelectItem>
                                )}
                              </SelectContent>
                            </Select>
                          </div>

                          <Button
                            className="w-full bg-blue-600 hover:bg-blue-700"
                            onClick={assignDriverToOrder}
                            disabled={!selectedDriver || assigningDriver}
                          >
                            {assigningDriver ? 'Assigning...' : 'Confirm Assignment'}
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  )}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  className="flex-1 border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950/50"
                  onClick={() => rejectOrder(order.id)}
                >
                  <X className="h-4 w-4 mr-2" />
                  Reject
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700"
                  onClick={() => approveOrder(order.id)}
                >
                  <Check className="h-4 w-4 mr-2" />
                  Approve
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
