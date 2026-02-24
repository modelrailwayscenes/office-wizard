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
  { month: 0, label: 'New Year Sale', icon: Sparkles, color: 'bg-teal-500/10 text-teal-400' },
  { month: 1, label: "Valentine's / Winter Scenery", icon: Snowflake, color: 'bg-blue-500/10 text-blue-400' },
  { month: 2, label: 'Spring Launch', icon: Leaf, color: 'bg-emerald-500/10 text-emerald-400' },
  { month: 3, label: 'Easter Campaign', icon: Gift, color: 'bg-slate-700/50 text-slate-300' },
  { month: 4, label: 'Spring Collection', icon: Leaf, color: 'bg-emerald-500/10 text-emerald-400' },
  { month: 5, label: 'Summer Preview', icon: Sun, color: 'bg-amber-500/10 text-amber-400' },
  { month: 6, label: 'Mid-Year Sale', icon: ShoppingBag, color: 'bg-teal-500/10 text-teal-400' },
  { month: 7, label: 'Summer Scenery', icon: Sun, color: 'bg-amber-500/10 text-amber-400' },
  { month: 8, label: 'Autumn Launch', icon: Leaf, color: 'bg-slate-700/50 text-slate-300' },
  { month: 9, label: 'Halloween / Autumn', icon: Leaf, color: 'bg-slate-700/50 text-slate-300' },
  { month: 10, label: 'Black Friday', icon: ShoppingBag, color: 'bg-red-500/10 text-red-400' },
  { month: 11, label: 'Christmas Campaign', icon: Gift, color: 'bg-red-500/10 text-red-400' },
];

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

export default function CampaignCalendar() {
  const [year, setYear] = useState(new Date().getFullYear());
  const newsletters = getNewsletters();
  const currentMonth = new Date().getMonth();

  return (
    <div className="p-8 max-w-6xl mx-auto bg-slate-950 min-h-full animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Campaign Calendar</h1>
          <p className="text-slate-400 mt-1">Plan your newsletter campaigns across the year</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setYear(y => y - 1)}><ChevronLeft className="w-4 h-4" /></Button>
          <span className="font-semibold text-lg min-w-16 text-center">{year}</span>
          <Button variant="outline" size="icon" onClick={() => setYear(y => y + 1)}><ChevronRight className="w-4 h-4" /></Button>
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
            <Card key={month} className={`bg-slate-800/50 border-slate-700 p-4 transition-all ${isCurrent ? 'ring-2 ring-teal-500' : ''} ${isPast ? 'opacity-60' : ''}`}>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CalIcon className="w-4 h-4 text-slate-400" />
                  <h3 className="font-semibold text-sm text-white">{month}</h3>
                </div>
                {isCurrent && <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/30">Current</Badge>}
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
                    <div key={nl.id} className="flex items-center justify-between text-xs p-2 bg-slate-800 rounded">
                      <span className="truncate font-medium text-white">{nl.title}</span>
                      <Badge variant="secondary" className="text-xs ml-2 bg-slate-700 text-slate-300">{nl.status}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 mb-3">No newsletters planned</p>
              )}

              {!isPast && (
                <Link to="/marketing/newsletter/create">
                  <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800 w-full gap-1.5 text-xs">
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
