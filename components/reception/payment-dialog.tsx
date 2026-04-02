'use client';

import { useState } from 'react';
import type { Order, PaymentMethod } from '@/lib/types';
import { useCreatePayment, useCompleteMockPayment } from '@/hooks/use-restaurant-data';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { CreditCard, Banknote, Smartphone, QrCode, Check, Receipt, ArrowLeft } from 'lucide-react';
import { ClickPesaForm } from '@/components/payment/ClickPesaForm';
import { api } from '@/lib/api';

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

interface PaymentDialogProps {
  order: Order;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: (order: Order) => void;
}

export function PaymentDialog({ order, open, onOpenChange, onComplete }: PaymentDialogProps) {
  const [method, setMethod] = useState<PaymentMethod>('cash');
  const [showQR, setShowQR] = useState(false);
  const [isPaid, setIsPaid] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<'method' | 'payment' | 'success'>('method');
  const [customerPhone, setCustomerPhone] = useState('');
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);
  const createPayment = useCreatePayment();
  const completeMockPayment = useCompleteMockPayment();

  const paymentMethods: { value: PaymentMethod; label: string; icon: React.ElementType }[] = [
    { value: 'cash', label: 'Cash', icon: Banknote },
    { value: 'card', label: 'Card', icon: CreditCard },
    { value: 'mobile', label: 'Mobile Money', icon: Smartphone },
    { value: 'qr', label: 'QR Code', icon: QrCode },
  ];

  const fetchLatestOrder = async () => {
    try {
      const updatedOrder = await api.get<Order>(`/api/orders/${order.id}`);
      setCompletedOrder(updatedOrder);
      return updatedOrder;
    } catch (err) {
      console.error('fetchLatestOrder error:', err);
      return null;
    }
  };

  const handlePaymentMethodSelect = () => {
    if (method === 'mobile') {
      // Show ClickPesa form for mobile money
      setCheckoutStep('payment');
    } else if (method === 'qr') {
      // Show QR code
      setShowQR(true);
    } else {
      // For cash and card, mark as paid immediately
      handlePayment();
    }
  };

  const handlePayment = async () => {
    try {
      // Create payment record
      const payment = await createPayment.mutateAsync({
        orderId: order.id,
        amount: order.total,
        method,
      });

      console.log('Payment created:', payment);
      toast.success('Payment recorded', {
        description: `Order #${order.id.slice(-6)} is marked as paid`
      });

      const finalOrder = await fetchLatestOrder();
      if (finalOrder) setCompletedOrder(finalOrder);
      setIsPaid(true);
    } catch (error) {
      toast.error('Payment failed');
      console.error('Payment error:', error);
    }
  };

  const handleMobileMoneySuccess = async () => {
    // After ClickPesa form successfully initiates payment, create payment record with pending status
    try {
      const transactionId = sessionStorage.getItem('pendingTransactionId');
      const payment = await api.post('/api/payments', {
        order_id: order.id,
        amount: order.total,
        method: 'mobile',
        status: 'pending',
        reference: transactionId,
      });

      console.log('Mobile money payment created:', payment);
      sessionStorage.removeItem('pendingTransactionId');
      
      toast.success('Mobile money payment initiated', {
        description: `Order #${order.id.slice(-6)} awaiting payment confirmation`
      });

      const finalOrder = await fetchLatestOrder();
      if (finalOrder) setCompletedOrder(finalOrder);
      setIsPaid(true);
    } catch (error) {
      toast.error('Failed to record payment');
      console.error('Payment error:', error);
    }
  };

  const handleQRPaymentConfirm = async () => {
    try {
      // Create payment record for QR payment
      const payment = await createPayment.mutateAsync({
        orderId: order.id,
        amount: order.total,
        method: 'qr',
      });

      console.log('QR Payment created:', payment);

      toast.success('QR Payment recorded', {
        description: `Order #${order.id.slice(-6)} is marked as paid`
      });

      const finalOrder = await fetchLatestOrder();
      if (finalOrder) setCompletedOrder(finalOrder);
      setIsPaid(true);
      setShowQR(false);
    } catch (error) {
      console.error('QR Payment error:', error);
      toast.error('Payment failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const handleClose = () => {
    if (isPaid) {
      onComplete(completedOrder || { ...order, status: 'paid', paid_at: new Date().toISOString() });
    }
    setIsPaid(false);
    setShowQR(false);
    setMethod('cash');
    setCompletedOrder(null);
    onOpenChange(false);
  };

  // Generate QR code data (in production, this would be a payment link)
  const qrData = JSON.stringify({
    orderId: order.id,
    amount: order.total,
    restaurant: 'RestoFlow',
    timestamp: Date.now(),
  });

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {!isPaid ? (
          <>
            <DialogHeader>
              <DialogTitle>Process Payment</DialogTitle>
              <DialogDescription>
                {order.tableName} - Order #{order.id.slice(-6)}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              {checkoutStep === 'payment' && method === 'mobile' ? (
                <ClickPesaForm
                  amount={order.total}
                  onSuccess={handleMobileMoneySuccess}
                  onBack={() => setCheckoutStep('method')}
                  isLoading={createPayment.isPending}
                  restaurantId={order.restaurantId || ''}
                  orderId={order.id}
                />
              ) : (
                <>
                  {/* Order Summary - Compact */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 rounded-xl p-4 border border-blue-100 dark:border-blue-900/30">
                    <div className="max-h-[150px] overflow-y-auto space-y-1.5 text-xs">
                      {order.items.map(item => (
                        <div key={item.menuItemId} className="flex justify-between items-center">
                          <span className="truncate flex-1">
                            {item.menuItem.name} <span className="text-muted-foreground">×{item.quantity}</span>
                          </span>
                          <span className="font-medium text-blue-600 dark:text-blue-400 ml-2 flex-shrink-0">
                            TSH {(item.menuItem.price * item.quantity).toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="border-t border-blue-200 dark:border-blue-900/50 mt-3 pt-3 space-y-1.5 text-xs">
                      <div className="flex justify-between text-muted-foreground">
                        <span>Subtotal</span>
                        <span>TSH {order.subtotal.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-muted-foreground">
                        <span>Tax (10%)</span>
                        <span>TSH {order.tax.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between font-bold text-base pt-1 border-t border-blue-200 dark:border-blue-900/50">
                        <span>Total</span>
                        <span className="text-blue-600 dark:text-blue-400">TSH {order.total.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {showQR ? (
                    <div className="flex flex-col items-center justify-center py-4">
                      <p className="text-xs text-muted-foreground mb-3">
                        Customer scans to pay
                      </p>
                      <div className="bg-white p-3 rounded-lg inline-block">
                        <QRCodeSVG value={qrData} size={160} />
                      </div>
                      <div className="mt-4 space-y-2 w-full">
                        <p className="font-bold text-lg text-center text-blue-600 dark:text-blue-400">
                          TSH {order.total.toLocaleString()}
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowQR(false)}
                          >
                            Back
                          </Button>
                          <Button
                            size="sm"
                            onClick={handleQRPaymentConfirm}
                            disabled={createPayment.isPending}
                          >
                            {createPayment.isPending ? 'Processing...' : 'Confirm'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm font-semibold mb-3 block text-muted-foreground">
                          Payment Method
                        </Label>
                        <RadioGroup
                          value={method}
                          onValueChange={(v) => setMethod(v as PaymentMethod)}
                          className="grid grid-cols-2 gap-2"
                        >
                          {paymentMethods.map(({ value, label, icon: Icon }) => (
                            <Label
                              key={value}
                              htmlFor={value}
                              className={`flex flex-col items-center justify-center p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                method === value
                                  ? 'border-primary bg-primary/10 shadow-sm'
                                  : 'border-border hover:border-primary/50 bg-muted/30'
                              }`}
                            >
                              <RadioGroupItem value={value} id={value} className="sr-only" />
                              <Icon className={`h-5 w-5 mb-1.5 ${method === value ? 'text-primary' : 'text-muted-foreground'}`} />
                              <span className={`text-xs font-medium ${method === value ? 'text-primary' : 'text-muted-foreground'}`}>
                                {label}
                              </span>
                            </Label>
                          ))}
                        </RadioGroup>
                      </div>

                      <Button
                        className="w-full mt-4"
                        size="lg"
                        onClick={handlePaymentMethodSelect}
                        disabled={createPayment.isPending}
                      >
                        {createPayment.isPending
                          ? 'Processing...'
                          : method === 'qr'
                          ? 'Show QR Code'
                          : method === 'mobile'
                          ? 'Pay via Mobile Money'
                          : `Pay TSH ${order.total.toLocaleString()}`}
                      </Button>
                    </>
                  )}
                </>
              )}
            </div>
          </>
        ) : (
          <div className="py-8 text-center">
            <div className="w-16 h-16 bg-status-available rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-xl font-bold mb-2">Payment Complete!</h3>
            <p className="text-muted-foreground mb-6">
              Order #{order.id.slice(-6)} has been paid
            </p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={handleClose}>
                <Receipt className="h-4 w-4 mr-2" />
                View Receipt
              </Button>
              <Button onClick={handleClose}>
                Done
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
