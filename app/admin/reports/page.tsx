'use client';

import { useMemo } from 'react';
import { useOrders, useMenuItems, useTables } from '@/hooks/use-restaurant-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { format, subDays, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DollarSign, TrendingUp, ShoppingCart, Clock, Star } from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#ef4444', '#3b82f6', '#8b5cf6'];

export default function ReportsPage() {
  const { data: orders = [] } = useOrders();
  const { data: menuItems = [] } = useMenuItems();
  const { data: tables = [] } = useTables();

  // Calculate stats
  const stats = useMemo(() => {
    const paidOrders = orders.filter(o => o.status === 'paid');
    const today = new Date();
    
    // Last 7 days sales
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = subDays(today, 6 - i);
      const dayOrders = paidOrders.filter(o => 
        isWithinInterval(new Date(o.paidAt || o.createdAt), {
          start: startOfDay(date),
          end: endOfDay(date),
        })
      );
      return {
        date: format(date, 'EEE'),
        sales: dayOrders.reduce((sum, o) => sum + o.total, 0),
        orders: dayOrders.length,
      };
    });

    // Category breakdown
    const categoryStats = new Map<string, { count: number; revenue: number }>();
    paidOrders.forEach(order => {
      order.items.forEach(item => {
        const cat = item.menuItem.category;
        const existing = categoryStats.get(cat) || { count: 0, revenue: 0 };
        categoryStats.set(cat, {
          count: existing.count + item.quantity,
          revenue: existing.revenue + (item.menuItem.price * item.quantity),
        });
      });
    });

    const categoryData = Array.from(categoryStats.entries()).map(([name, data]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value: data.revenue,
      count: data.count,
    }));

    // Top selling items
    const itemSales = new Map<string, { item: typeof menuItems[0]; count: number; revenue: number }>();
    paidOrders.forEach(order => {
      order.items.forEach(item => {
        const existing = itemSales.get(item.menuItemId) || { item: item.menuItem, count: 0, revenue: 0 };
        itemSales.set(item.menuItemId, {
          item: item.menuItem,
          count: existing.count + item.quantity,
          revenue: existing.revenue + (item.menuItem.price * item.quantity),
        });
      });
    });

    const topItems = Array.from(itemSales.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Summary stats
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.total, 0);
    const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;
    const todayRevenue = last7Days[6].sales;
    const yesterdayRevenue = last7Days[5].sales;
    const revenueChange = yesterdayRevenue > 0 
      ? ((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100 
      : 0;

    return {
      last7Days,
      categoryData,
      topItems,
      totalRevenue,
      avgOrderValue,
      todayRevenue,
      revenueChange,
      totalOrders: paidOrders.length,
    };
  }, [orders]);

  const summaryCards = [
    {
      title: 'Total Revenue',
      value: `TSH ${stats.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      description: 'All time',
      icon: DollarSign,
      color: 'text-status-available',
    },
    {
      title: "Today's Revenue",
      value: `TSH ${stats.todayRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      description: `${stats.revenueChange >= 0 ? '+' : ''}${stats.revenueChange.toFixed(1)}% from yesterday`,
      icon: TrendingUp,
      color: stats.revenueChange >= 0 ? 'text-status-available' : 'text-red-500',
    },
    {
      title: 'Total Orders',
      value: stats.totalOrders.toLocaleString(),
      description: 'Completed orders',
      icon: ShoppingCart,
      color: 'text-primary',
    },
    {
      title: 'Avg Order Value',
      value: `TSH ${stats.avgOrderValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`,
      description: 'Per completed order',
      icon: Clock,
      color: 'text-orange-500',
    },
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Sales analytics and insights</p>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-muted-foreground">{card.description}</p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Tabs defaultValue="sales" className="space-y-6">
        <TabsList>
          <TabsTrigger value="sales">Sales Trend</TabsTrigger>
          <TabsTrigger value="categories">Categories</TabsTrigger>
          <TabsTrigger value="items">Top Items</TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <Card>
            <CardHeader>
              <CardTitle>Last 7 Days Sales</CardTitle>
              <CardDescription>Daily revenue and order count</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.last7Days}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="date" className="text-muted-foreground" />
                    <YAxis
                      className="text-muted-foreground"
                      tickFormatter={(value) => `TSH ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'sales' ? `TSH ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}` : value,
                        name === 'sales' ? 'Revenue' : 'Orders'
                      ]}
                    />
                    <Bar dataKey="sales" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Revenue by Category</CardTitle>
                <CardDescription>Distribution of sales</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={stats.categoryData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={2}
                        dataKey="value"
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      >
                        {stats.categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`TSH ${value.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, 'Revenue']}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Category Breakdown</CardTitle>
                <CardDescription>Items sold and revenue</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Items Sold</TableHead>
                      <TableHead className="text-right">Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.categoryData.map((cat, i) => (
                      <TableRow key={cat.name}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: COLORS[i % COLORS.length] }}
                            />
                            {cat.name}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">{cat.count}</TableCell>
                        <TableCell className="text-right">TSH {cat.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="items">
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>Most popular menu items by quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Item</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Quantity</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {stats.topItems.map((item, index) => (
                    <TableRow key={item.item.id}>
                      <TableCell className="font-bold text-muted-foreground">
                        {index + 1}
                      </TableCell>
                      <TableCell className="font-medium">{item.item.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {item.item.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{item.count}</TableCell>
                      <TableCell className="text-right font-semibold">
                        TSH {item.revenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </TableCell>
                    </TableRow>
                  ))}
                  {stats.topItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        No sales data yet
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
