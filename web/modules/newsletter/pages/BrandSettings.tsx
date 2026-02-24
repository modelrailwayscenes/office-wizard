import { BRAND_PROFILES } from '@/modules/newsletter/data/newsletter-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BrandSettings() {
  return (
    <div className="p-8 max-w-6xl mx-auto bg-slate-950 min-h-full animate-fade-in">
      <h1 className="text-3xl font-bold mb-2 text-white">Brand Settings</h1>
      <p className="text-slate-400 mb-8">Manage colour palettes and typography for consistent branding</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {BRAND_PROFILES.map(profile => (
          <Card key={profile.id} className="bg-slate-800/50 border-slate-700 overflow-hidden hover:border-slate-600 transition-shadow">
            <div className="h-20" style={{ background: `linear-gradient(135deg, ${profile.colors.primary}, ${profile.colors.accent1})` }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-white">{profile.name}</h3>
                {profile.id === 'classic_mrs' && <Badge className="bg-teal-500/10 text-teal-400 border-teal-500/30">Default</Badge>}
              </div>
              <p className="text-sm text-slate-400 mb-4">{profile.description}</p>

              <div className="flex gap-2 mb-4">
                {Object.entries(profile.colors).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: val }} title={key} />
                  </div>
                ))}
              </div>

              <div className="text-xs text-slate-400 space-y-1">
                <p>Heading: <span className="font-medium text-white">{profile.headingFont}</span></p>
                <p>Body: <span className="font-medium text-white">{profile.bodyFont}</span></p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
