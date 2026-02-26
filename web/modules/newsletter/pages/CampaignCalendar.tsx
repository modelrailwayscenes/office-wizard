import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { getNewsletters } from '@/modules/newsletter/lib/newsletter-store';
import { Link } from 'react-router';
import {
  ChevronLeft, ChevronRight, Plus, Calendar as CalIcon,
  Gift, Leaf, Sun, Snowflake, Sparkles, ShoppingBag
} from 'lucide-react';

const SEASONAL_PROMPTS = [
  { month: 0, label: 'New Year Sale', icon: Sparkles, color: 'bg-primary/10 text-primary' },
  { month: 1, label: "Valentine's / Winter Scenery", icon: Snowflake, color: 'bg-blue-500/10 text-blue-400' },
  { month: 2, label: 'Spring Launch', icon: Leaf, color: 'bg-emerald-500/10 text-emerald-400' },
  { month: 3, label: 'Easter Campaign', icon: Gift, color: 'bg-muted text-muted-foreground' },
  { month: 4, label: 'Spring Collection', icon: Leaf, color: 'bg-emerald-500/10 text-emerald-400' },
  { month: 5, label: 'Summer Preview', icon: Sun, color: 'bg-amber-500/10 text-amber-400' },
  { month: 6, label: 'Mid-Year Sale', icon: ShoppingBag, color: 'bg-primary/10 text-primary' },
  { month: 7, label: 'Summer Scenery', icon: Sun, color: 'bg-amber-500/10 text-amber-400' },
  { month: 8, label: 'Autumn Launch', icon: Leaf, color: 'bg-muted text-muted-foreground' },
  { month: 9, label: 'Halloween / Autumn', icon: Leaf, color: 'bg-muted text-muted-foreground' },
  { month: 10, label: 'Black Friday', icon: ShoppingBag, color: 'bg-red-500/10 text-red-400' },
  { month: 11, label: 'Christmas Campaign', icon: Gift, color: 'bg-red-500/10 text-red-400' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CampaignCalendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const newsletters = getNewsletters();
  const currentMonth = new Date().getMonth();

  return (
    <div className="p-8 bg-background min-h-full animate-fade-in">
      <div className="border-b border-border bg-card/50 -mx-8 px-8 py-6 mb-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Campaign Calendar</h1>
          <p className="text-muted-foreground mt-1">Plan your newsletter campaigns across the year</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-semibold text-lg min-w-16 text-center">{year}</span>
          <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}><ChevronRight className="w-4 h-4" /></Button>
        </div>
      </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MONTHS.map((month, idx) => {
          const prompt = SEASONAL_PROMPTS.find(p => p.month === idx);
          const monthNewsletters = newsletters.filter(n => {
            const d = new Date(n.createdAt);
            return d.getMonth() === idx && d.getFullYear() === year;
          });
          const isPast = year < new Date().getFullYear() || (year === new Date().getFullYear() && idx < currentMonth);
          const isCurrent = year === new Date().getFullYear() && idx === currentMonth;

          return (
            <Card key={month} className={`bg-card border-border p-4 transition-all ${isCurrent ? 'ring-2 ring-primary' : ''} ${isPast ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-muted-foreground" />
                  <h3 className="font-semibold text-sm text-foreground">{month}</h3>
                </div>
                {isCurrent && <Badge className="bg-primary/10 text-primary border-primary/30">Current</Badge>}
              </div>

              {prompt && (
                <div className={`flex items-center gap-2 p-2 rounded-md text-xs ${prompt.color} mb-3`}>
                  <prompt.icon className="w-3.5 h-3.5" />
                  <span className="font-medium">{prompt.label}</span>
                </div>
              )}

              {monthNewsletters.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {monthNewsletters.map(nl => (
                    <div key={nl.id} className="flex items-center justify-between text-xs p-2 bg-muted rounded">
                      <span className="truncate font-medium text-foreground">{nl.title}</span>
                      <Badge variant="secondary" className="text-xs ml-2 bg-muted text-muted-foreground">{nl.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground mb-3">No newsletters planned</p>
              )}

              {!isPast && (
                <Link to="/marketing/newsletter/create">
                  <Button variant="outline" size="sm" className="border-border hover:bg-muted w-full gap-1.5 text-xs">
                    <Plus className="w-3 h-3" /> Plan {month} Issue
                  </Button>
                </Link>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
