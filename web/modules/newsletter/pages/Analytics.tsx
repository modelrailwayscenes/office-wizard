import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Bar, BarChart, XAxis, YAxis, CartesianGrid } from 'recharts';
import { getNewsletters } from '@/modules/newsletter/lib/newsletter-store';
import {
  TrendingUp, TrendingDown, Mail, MousePointerClick,
  Eye, DollarSign, Users, BarChart3, ArrowUpRight
} from 'lucide-react';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

// Mock analytics data for demonstration
const MOCK_STATS = {
  totalSent: 24,
  avgOpenRate: 42.3,
  avgClickRate: 8.7,
  avgRevenue: 284,
  subscribers: 1847,
  growth: 12.4,
};

const MOCK_CAMPAIGNS = [
  { name: 'January Roundup', sent: '2026-01-15', opens: 44.2, clicks: 9.1, revenue: 312, trend: 'up' as const },
  { name: 'New Year Sale', sent: '2026-01-02', opens: 51.8, clicks: 14.3, revenue: 589, trend: 'up' as const },
  { name: 'December Festive', sent: '2025-12-10', opens: 38.5, clicks: 7.2, revenue: 198, trend: 'down' as const },
  { name: 'November Workshop', sent: '2025-11-18', opens: 41.0, clicks: 6.8, revenue: 145, trend: 'down' as const },
  { name: 'Black Friday Blast', sent: '2025-11-28', opens: 55.2, clicks: 18.9, revenue: 1203, trend: 'up' as const },
];

const TOP_PRODUCTS = [
  { name: 'OO Gauge Stone Wall Pack', clicks: 89, conversions: 23 },
  { name: 'Scenic Grass Tufts - Spring', clicks: 67, conversions: 18 },
  { name: 'N Gauge Platform Kit', clicks: 54, conversions: 12 },
  { name: 'Weathering Powder Set', clicks: 48, conversions: 15 },
  { name: 'Signal Box Kit', clicks: 41, conversions: 9 },
];

export default function Analytics() {
  const newsletters = getNewsletters();

  return (
    <div className="p-8 max-w-6xl mx-auto bg-background min-h-full animate-fade-in">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground">Analytics</h1>
        <p className="text-muted-foreground mt-1">Track newsletter performance and revenue impact</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
        {[
          { label: 'Campaigns Sent', value: MOCK_STATS.totalSent, icon: Mail, suffix: '' },
          { label: 'Avg Open Rate', value: MOCK_STATS.avgOpenRate, icon: Eye, suffix: '%' },
          { label: 'Avg Click Rate', value: MOCK_STATS.avgClickRate, icon: MousePointerClick, suffix: '%' },
          { label: 'Avg Revenue', value: `£${MOCK_STATS.avgRevenue}`, icon: DollarSign, suffix: '' },
          { label: 'Subscribers', value: MOCK_STATS.subscribers.toLocaleString(), icon: Users, suffix: '' },
          { label: 'List Growth', value: MOCK_STATS.growth, icon: TrendingUp, suffix: '%' },
        ].map(stat => (
          <Card key={stat.label} className="bg-card border-border p-4">
            <div className="flex items-center gap-2 mb-2">
              <stat.icon className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{stat.label}</span>
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}{stat.suffix}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign Performance */}
        <div className="lg:col-span-2">
          <Card className="bg-card border-border p-5">
            <h2 className="text-lg font-semibold mb-4 text-foreground flex items-center gap-2">
              <BarChart3 className="w-5 h-5" /> Campaign Performance
            </h2>
            <ChartContainer
              config={{ opens: { label: "Open Rate %" }, clicks: { label: "Click Rate %" }, revenue: { label: "Revenue" } }}
              className="h-[280px] w-full"
            >
              <BarChart data={MOCK_CAMPAIGNS} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="opens" fill="#14b8a6" radius={[2, 2, 0, 0]} name="Open %" />
                <Bar dataKey="clicks" fill="#14b8a699" radius={[2, 2, 0, 0]} name="Click %" />
              </BarChart>
            </ChartContainer>
          </Card>
        </div>

        {/* Top Products */}
        <Card className="bg-card border-border p-5">
          <h2 className="text-lg font-semibold mb-4 text-foreground">Top Products from Emails</h2>
          <ChartContainer
            config={{ clicks: { label: "Clicks" }, conversions: { label: "Conversions" } }}
            className="h-[280px] w-full"
          >
            <BarChart data={TOP_PRODUCTS} layout="vertical" margin={{ top: 8, right: 8, bottom: 8, left: 60 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
              <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
              <YAxis type="category" dataKey="name" width={50} tick={{ fontSize: 9, fill: '#94a3b8' }} />
              <ChartTooltip content={<ChartTooltipContent />} />
              <Bar dataKey="clicks" fill="#14b8a6" radius={[0, 2, 2, 0]} name="Clicks" />
            </BarChart>
          </ChartContainer>
        </Card>
      </div>

      <Card className="bg-card border-border mt-6 p-6 border-dashed border-2 text-center">
        <p className="text-sm text-muted-foreground">
          📊 Connect Shopify to see real revenue attribution, product click data, and subscriber growth metrics.
        </p>
      </Card>
    </div>
  );
}
