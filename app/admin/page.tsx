'use client';

import { useStats, useTables, useOrders, useMenuItems } from '@/hooks/use-restaurant-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, ShoppingCart, Clock, TrendingUp, Users, UtensilsCrossed, Grid3X3 } from 'lucide-react';
import { CustomerPortalCard } from '@/components/customer-portal-card';

export default function AdminDashboard() {
  const { data: stats } = useStats();
  const { data: tables = [] } = useTables();
  const { data: orders = [] } = useOrders();
  const { data: menuItems = [] } = useMenuItems();

  const occupiedTables = tables.filter(t => t.status !== 'available').length;
  const totalCapacity = tables.reduce((sum, t) => sum + t.capacity, 0);

  // Calculate average order value
  const paidOrders = orders.filter(o => o.status === 'paid');
  const avgOrderValue = paidOrders.length > 0
    ? paidOrders.reduce((sum, o) => sum + o.total, 0) / paidOrders.length
    : 0;

  const statCards = [
    {
      title: "Today's Sales",
      value: `TSH ${(stats?.todaySales || 0).toLocaleString()}`,
      description: 'Total revenue today',
      icon: DollarSign,
      bgGradient: 'from-emerald-400 to-teal-500',
    },
    {
      title: 'Orders Today',
      value: stats?.todayOrders || 0,
      description: `${stats?.completedToday || 0} completed`,
      icon: ShoppingCart,
      bgGradient: 'from-blue-500 to-indigo-600',
    },
    {
      title: 'Active Orders',
      value: (stats?.pendingOrders || 0) + (stats?.preparingOrders || 0),
      description: `${stats?.pendingOrders || 0} pending, ${stats?.preparingOrders || 0} prep`,
      icon: Clock,
      bgGradient: 'from-orange-400 to-rose-500',
    },
    {
      title: 'Avg Order Value',
      value: `TSH ${avgOrderValue.toLocaleString()}`,
      description: 'Per completed order',
      icon: TrendingUp,
      bgGradient: 'from-fuchsia-500 to-purple-600',
    },
  ];

  const quickStats = [
    {
      label: 'Total Tables',
      value: tables.length,
      sub: `${occupiedTables} occupied`,
      icon: Grid3X3,
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
    },
    {
      label: 'Seating Capacity',
      value: totalCapacity,
      sub: 'Total seats',
      icon: Users,
      color: 'text-purple-500',
      bg: 'bg-purple-500/10',
    },
    {
      label: 'Menu Items',
      value: menuItems.length,
      sub: `${menuItems.filter(m => m.available).length} available`,
      icon: UtensilsCrossed,
      color: 'text-pink-500',
      bg: 'bg-pink-500/10',
    },
  ];

  // Recent orders
  const recentOrders = [...orders]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 5);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview of your restaurant operations</p>
        </div>

      </div>

      {/* Main Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.title}
              className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${stat.bgGradient} p-6 shadow-lg shadow-slate-200/50 dark:shadow-none hover:scale-[1.02] active:scale-[0.98] transition-all`}
            >
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col h-full gap-4 relative z-10">
                <div className="flex items-start justify-between">
                  <div className="p-3 rounded-2xl bg-white/20 backdrop-blur-md shadow-sm">
                    <Icon className="h-6 w-6 text-white" />
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-white/90 mb-1">{stat.title}</p>
                  <p className="text-3xl font-extrabold text-white tracking-tight">{stat.value}</p>
                  <p className="text-xs text-white/70 mt-1 font-medium">{stat.description}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Quick Stats */}
        <Card className="rounded-3xl border-0 shadow-lg bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
          <CardHeader>
            <CardTitle className="text-xl">Quick Stats</CardTitle>
            <CardDescription>Restaurant overview</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {quickStats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div key={stat.label} className="flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={`p-3 ${stat.bg} rounded-2xl group-hover:scale-110 transition-transform`}>
                      <Icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">{stat.label}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{stat.sub}</p>
                    </div>
                  </div>
                  <span className="text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</span>
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Recent Orders */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Recent Orders</CardTitle>
            <CardDescription>Latest order activity</CardDescription>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No orders yet</p>
            ) : (
              <div className="space-y-3">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${order.status === 'paid' ? 'bg-status-available' :
                        order.status === 'ready' ? 'bg-status-ready' :
                          order.status === 'preparing' ? 'bg-status-ready' :
                            'bg-status-occupied'
                        }`} />
                      <div>
                        <p className="font-medium">{order.tableName}</p>
                        <p className="text-xs text-muted-foreground">
                          {order.items.length} items - #{order.id.slice(-6)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">TSH {order.total.toLocaleString()}</p>
                      <p className="text-xs text-muted-foreground capitalize">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Customer Portal Section */}
      <div>
        <h2 className="text-2xl font-bold text-foreground mb-4">Share with Customers</h2>
        <CustomerPortalCard />
      </div>
    </div>
  );
}
