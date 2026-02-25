import { BRAND_PROFILES } from '@/modules/newsletter/data/newsletter-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function BrandSettings() {
  return (
    <div className="p-8 max-w-6xl mx-auto bg-background min-h-full animate-fade-in">
      <h1 className="text-3xl font-bold mb-2 text-foreground">Brand Settings</h1>
      <p className="text-muted-foreground mb-8">Manage colour palettes and typography for consistent branding</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {BRAND_PROFILES.map(profile => (
          <Card key={profile.id} className="bg-card border-border overflow-hidden hover:border-border transition-shadow">
            <div className="h-20" style={{ background: `linear-gradient(135deg, ${profile.colors.primary}, ${profile.colors.accent1})` }} />
            <div className="p-5">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-foreground">{profile.name}</h3>
                {profile.id === 'classic_mrs' && <Badge className="bg-primary/10 text-primary border-primary/30">Default</Badge>}
              </div>
              <p className="text-sm text-muted-foreground mb-4">{profile.description}</p>

              <div className="flex gap-2 mb-4">
                {Object.entries(profile.colors).slice(0, 6).map(([key, val]) => (
                  <div key={key} className="text-center">
                    <div className="w-8 h-8 rounded-md border" style={{ backgroundColor: val }} title={key} />
                  </div>
                ))}
              </div>

              <div className="text-xs text-muted-foreground space-y-1">
                <p>Heading: <span className="font-medium text-foreground">{profile.headingFont}</span></p>
                <p>Body: <span className="font-medium text-foreground">{profile.bodyFont}</span></p>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
