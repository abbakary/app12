'use client';

import { useAnalyticsInsights } from '@/hooks/use-restaurant-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Sparkles, TrendingUp, Users, UtensilsCrossed, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';
import { ChartQA } from '@/components/insights/chart-qa';

const COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#14b8a6', '#f59e0b', '#64748b'];

export default function ReceptionInsightsPage() {
  const { data, isLoading, isFetching, refetch } = useAnalyticsInsights();

  if (isLoading || !data) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <div className="text-center space-y-3">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Loading analytics…</p>
        </div>
      </div>
    );
  }

  const menuChart = data.menuTop.slice(0, 8).map((m) => ({
    name: m.name.length > 18 ? `${m.name.slice(0, 18)}…` : m.name,
    fullName: m.name,
    qty: m.quantitySold,
    revenue: m.revenue,
  }));

  const catChart = data.categoryRevenue.map((c) => ({
    name: c.category,
    revenue: c.revenue,
    quantity: c.quantity,
  }));

  const generated = data.generatedAt ? format(new Date(data.generatedAt), 'PPpp') : '—';

  return (
    <div className="p-6 h-full overflow-y-auto space-y-8 bg-slate-50/50 dark:bg-slate-950/20">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-3">
            <span className="p-2 rounded-2xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-lg">
              <Sparkles className="h-7 w-7" />
            </span>
            Customer &amp; menu insights
          </h1>
          <p className="text-muted-foreground mt-2 max-w-2xl">
            Behavior from paid orders, menu mix, and locations.
          </p>
          <p className="text-xs text-muted-foreground mt-1">Snapshot: {generated}</p>
        </div>
        <Button variant="outline" className="rounded-xl gap-2" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Top menu items (volume)
            </CardTitle>
            <CardDescription>Units sold across paid orders</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px]">
            {menuChart.length === 0 ? (
              <p className="text-sm text-muted-foreground py-12 text-center">No paid orders yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={menuChart} margin={{ top: 8, right: 8, left: 0, bottom: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                  <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value: number) => [`${value} units`, 'Quantity']} />
                  <Bar dataKey="qty" fill="#6366f1" radius={[6, 6, 0, 0]} name="Units" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-3xl border-none shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Revenue by category
            </CardTitle>
            <CardDescription>Normalized groups (matches kitchen &amp; portal)</CardDescription>
          </CardHeader>
          <CardContent className="h-[320px] flex items-center justify-center">
            {catChart.length === 0 ? (
              <p className="text-sm text-muted-foreground">No category data yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={catChart}
                    dataKey="revenue"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {catChart.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: number) => `TSH ${v.toLocaleString()}`} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="rounded-3xl border-none shadow-sm bg-gradient-to-br from-violet-50/80 to-fuchsia-50/40 dark:from-violet-950/30 dark:to-fuchsia-950/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Recommendations
          </CardTitle>
          <CardDescription>Automated from your sales data</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <ul className="list-disc pl-5 space-y-2 text-sm">
            {data.recommendations.map((r, i) => (
              <li key={i} className="leading-relaxed">
                {r}
              </li>
            ))}
          </ul>
          {data.aiSummary && (
            <div className="mt-6 p-4 rounded-2xl bg-background/80 border border-border/60">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="secondary" className="text-[10px] uppercase tracking-wider">
                  AI assistant{data.aiModel ? ` · ${data.aiModel}` : ''}
                </Badge>
              </div>
              <pre className="whitespace-pre-wrap text-sm font-sans text-foreground">{data.aiSummary}</pre>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border-none shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Customer snapshot
          </CardTitle>
          <CardDescription>Registered portal customers linked to orders</CardDescription>
        </CardHeader>
        <CardContent>
          {data.customers.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No customer accounts yet.</p>
          ) : (
            <div className="rounded-2xl border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Orders (paid)</TableHead>
                    <TableHead className="text-right">Lifetime</TableHead>
                    <TableHead>Top items</TableHead>
                    <TableHead>Locations</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.customers.slice(0, 25).map((c) => (
                    <TableRow key={c.userId}>
                      <TableCell className="font-medium">{c.name || c.username || 'Guest'}</TableCell>
                      <TableCell className="text-right">{c.orderCount}</TableCell>
                      <TableCell className="text-right">TSH {c.totalSpent.toLocaleString()}</TableCell>
                      <TableCell className="max-w-[200px] text-xs text-muted-foreground">
                        {c.favoriteMenuItems.slice(0, 3).join(', ') || '—'}
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-muted-foreground">
                        {c.locations.length ? c.locations.slice(0, 2).join(' · ') : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Interactive Chart Q&A */}
      <ChartQA
        chartData={{
          menuTop: data.menuTop,
          categoryRevenue: data.categoryRevenue,
          customers: data.customers,
          todaySales: data.todaySales || 0,
          todayOrders: data.todayOrders || 0,
        }}
      />
    </div>
  );
}
