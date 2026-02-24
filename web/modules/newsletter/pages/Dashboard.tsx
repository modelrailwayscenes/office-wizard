import { useState } from 'react';
import { Link } from 'react-router';
import { Plus, FileText, Copy, Trash2, MoreHorizontal, Wand2, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { getNewsletters, deleteNewsletter } from '@/modules/newsletter/lib/newsletter-store';
import { Newsletter } from '@/modules/newsletter/types/newsletter';

export default function Dashboard() {
  const [newsletters, setNewsletters] = useState<Newsletter[]>(getNewsletters());

  const handleDelete = (id: string) => {
    deleteNewsletter(id);
    setNewsletters(getNewsletters());
  };

  const statusColor = (status: Newsletter['status']) => {
    if (status === 'draft') return 'bg-slate-800 text-slate-400';
    if (status === 'exported') return 'bg-teal-500/10 text-teal-400';
    return 'bg-emerald-500/10 text-emerald-400';
  };

  return (
    <div className="p-8 max-w-6xl mx-auto bg-slate-950 min-h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 mt-1">Manage your Model Railway Scenes newsletters</p>
        </div>
        <Link to="/marketing/newsletter/create">
          <Button className="bg-teal-500 hover:bg-teal-600 text-black font-medium gap-2">
            <Plus className="w-4 h-4" />
            Create Newsletter
          </Button>
        </Link>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
        <Link to="/marketing/newsletter/create">
          <Card className="bg-slate-800/50 border-slate-700 p-5 hover:border-slate-600 transition-shadow cursor-pointer border-dashed border-2 group">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-teal-500/10 flex items-center justify-center group-hover:bg-teal-500/20 transition-colors">
                <Wand2 className="w-5 h-5 text-teal-400" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Quick Create</h3>
                <p className="text-xs text-slate-400">Start the wizard</p>
              </div>
            </div>
          </Card>
        </Link>
        <Link to="/marketing/newsletter/templates">
          <Card className="bg-slate-800/50 border-slate-700 p-5 hover:border-slate-600 transition-shadow cursor-pointer group">
            <div className="flex items-center gap-4">
              <div className="w-11 h-11 rounded-lg bg-teal-500/20 flex items-center justify-center group-hover:bg-teal-500/30 transition-colors">
                <FileText className="w-5 h-5 text-slate-300" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-white">Templates</h3>
                <p className="text-xs text-slate-400">Browse {6} templates</p>
              </div>
            </div>
          </Card>
        </Link>
        <Card className="bg-slate-800/50 border-slate-700 p-5">
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 rounded-lg bg-slate-800 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-slate-400" />
            </div>
            <div>
              <h3 className="font-semibold text-sm text-white">This Month</h3>
              <p className="text-xs text-slate-400">{newsletters.filter(n => n.status === 'draft').length} drafts</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Newsletter Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-white">Recent Newsletters</h2>
        {newsletters.length === 0 ? (
          <Card className="bg-slate-800/50 border-slate-700 p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mx-auto mb-4">
              <FileText className="w-7 h-7 text-slate-400" />
            </div>
            <h3 className="font-semibold mb-1 text-white">No newsletters yet</h3>
            <p className="text-sm text-slate-400 mb-4">Create your first newsletter to get started</p>
            <Link to="/marketing/newsletter/create">
              <Button variant="outline" className="border-slate-700 hover:bg-slate-800 gap-2">
                <Plus className="w-4 h-4" /> Create your first newsletter
              </Button>
            </Link>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {newsletters.map(nl => (
              <Card key={nl.id} className="bg-slate-800/50 border-slate-700 p-5 hover:border-slate-600 transition-shadow">
                <div className="flex items-start justify-between mb-3">
                  <Badge variant="secondary" className={statusColor(nl.status)}>
                    {nl.status}
                  </Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-white hover:bg-slate-800 h-7 w-7">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="bg-slate-900 border-slate-700">
                      <DropdownMenuItem className="text-slate-200 focus:bg-slate-800 focus:text-white"><Copy className="w-3.5 h-3.5 mr-2" /> Duplicate</DropdownMenuItem>
                      <DropdownMenuItem className="text-red-400" onClick={() => handleDelete(nl.id)}>
                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <h3 className="font-semibold text-sm text-white mb-1 truncate">{nl.title}</h3>
                <p className="text-xs text-slate-400 mb-3 truncate">{nl.subject}</p>
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span>{nl.campaignTag}</span>
                  <span>{new Date(nl.updatedAt).toLocaleDateString()}</span>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
