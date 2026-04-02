'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useCustomers, useCustomerAnalyticsDetail } from '@/hooks/use-restaurant-data';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  Phone, 
  Mail, 
  Calendar, 
  User, 
  History,
  MapPin,
  Users,
  Sparkles
} from 'lucide-react';
import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function ReceptionCustomersPage() {
  const { data: customers = [], isLoading } = useCustomers();
  const [searchQuery, setSearchQuery] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data: customerDetail, isLoading: detailLoading } = useCustomerAnalyticsDetail(detailId ?? undefined);

  const filteredCustomers = useMemo(() => {
    return customers.filter(c => 
      c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.phone?.includes(searchQuery) ||
      c.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [customers, searchQuery]);

  return (
    <div className="p-6 h-full flex flex-col gap-6 overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-3">
            Customer Directory
            <div className="px-3 py-1 bg-primary/10 text-primary text-xs font-black rounded-full uppercase tracking-widest">
              {customers.length} Results
            </div>
          </h1>
          <p className="text-muted-foreground font-medium text-sm mt-1">
            Profiles, orders, delivery locations —{' '}
            <Link href="/reception/insights" className="text-primary font-bold inline-flex items-center gap-1 hover:underline">
              <Sparkles className="h-3.5 w-3.5" />
              Insights dashboard
            </Link>
          </p>
        </div>
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search name, phone..." 
            className="pl-10 h-12 rounded-2xl border-none shadow-sm bg-card"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Grid of Customers */}
      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-48 bg-muted/40 animate-pulse rounded-[28px]" />
            ))}
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center opacity-60">
            <div className="w-20 h-20 bg-muted rounded-[32px] flex items-center justify-center mb-4">
              <Users className="h-10 w-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-bold">No customers found</h3>
            <p className="text-sm">Try a different search term or check filters</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filteredCustomers.map((customer, i) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: i * 0.05 }}
                  layout
                >
                  <Card className="border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-[28px] overflow-hidden bg-card group">
                    <CardContent className="p-0">
                       <div className="p-6 space-y-4">
                          <div className="flex items-start justify-between">
                             <div className="flex items-center gap-3">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center text-primary font-black text-xl group-hover:scale-110 transition-transform duration-500">
                                   {customer.name?.charAt(0).toUpperCase() || 'C'}
                                </div>
                                <div>
                                   <h4 className="font-black text-lg tracking-tight text-foreground line-clamp-1">{customer.name || 'Anonymous'}</h4>
                                   <div className="flex items-center gap-2">
                                      <Badge variant="secondary" className="bg-muted text-[10px] font-black uppercase tracking-wider h-5">
                                         {customer.username ? `@${customer.username}` : 'guest user'}
                                      </Badge>
                                   </div>
                                </div>
                             </div>
                          </div>

                          <div className="space-y-2.5 pt-2">
                             <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <Phone className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold text-foreground">{customer.phone || 'No phone'}</span>
                             </div>
                             <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800/50">
                                <Mail className="h-4 w-4 text-primary" />
                                <span className="text-sm font-bold text-foreground truncate">{customer.email || 'No email address'}</span>
                             </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 border-t border-muted/50 mt-2">
                             <div className="flex items-center gap-2 text-[11px] font-black text-muted-foreground uppercase tracking-widest">
                                <Calendar className="h-3.5 w-3.5" />
                                Since {format(new Date(customer.createdAt), 'MMM yyyy')}
                             </div>
                             <Button
                                size="sm"
                                variant="ghost"
                                className="h-8 rounded-lg font-black text-[10px] uppercase tracking-widest text-primary hover:bg-primary/5"
                                onClick={() => setDetailId(customer.id)}
                              >
                                <History className="h-3 w-3 mr-1.5" />
                                Activity
                             </Button>
                          </div>
                       </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <Sheet open={!!detailId} onOpenChange={(open) => !open && setDetailId(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              {customerDetail?.user?.name || 'Customer'}
            </SheetTitle>
            <SheetDescription>
              Orders and locations tied to this portal account
            </SheetDescription>
          </SheetHeader>
          {detailLoading && (
            <div className="py-12 flex justify-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
            </div>
          )}
          {!detailLoading && customerDetail && (
            <div className="mt-6 space-y-6">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-muted-foreground">Phone:</span>{' '}
                  {customerDetail.user.phone || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Email:</span>{' '}
                  {customerDetail.user.email || '—'}
                </p>
                <p>
                  <span className="text-muted-foreground">Member since:</span>{' '}
                  {customerDetail.user.createdAt
                    ? format(new Date(customerDetail.user.createdAt), 'PP')
                    : '—'}
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Delivery locations (from orders)
                </h4>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {Array.from(
                    new Set(
                      customerDetail.orders
                        .map((o) => o.deliveryAddress)
                        .filter(Boolean) as string[]
                    )
                  ).length === 0 ? (
                    <li>None recorded</li>
                  ) : (
                    Array.from(
                      new Set(
                        customerDetail.orders
                          .map((o) => o.deliveryAddress)
                          .filter(Boolean) as string[]
                      )
                    ).map((addr) => <li key={addr}>{addr}</li>)
                  )}
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <History className="h-4 w-4" />
                  Order history
                </h4>
                <div className="rounded-xl border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="text-xs">When</TableHead>
                        <TableHead className="text-xs">Type</TableHead>
                        <TableHead className="text-xs text-right">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {customerDetail.orders.map((o) => (
                        <TableRow key={o.id}>
                          <TableCell className="text-xs whitespace-nowrap">
                            {format(new Date(o.createdAt), 'MMM d, HH:mm')}
                          </TableCell>
                          <TableCell className="text-xs capitalize">{o.orderType || '—'}</TableCell>
                          <TableCell className="text-xs text-right">TSH {o.total.toLocaleString()}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
