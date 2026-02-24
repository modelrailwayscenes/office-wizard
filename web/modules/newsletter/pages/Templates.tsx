import { TEMPLATES, BRAND_PROFILES } from '@/modules/newsletter/data/newsletter-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router';

export default function Templates() {
  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      <h1 className="text-3xl font-bold mb-2">Templates</h1>
      <p className="text-muted-foreground mb-8">Pre-built newsletter layouts ready to customize</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {TEMPLATES.map(t => {
          const brand = BRAND_PROFILES.find(b => b.id === t.recommendedBrand)!;
          return (
            <Link to="/marketing/newsletter/create" key={t.id}>
              <Card className="overflow-hidden hover:shadow-card transition-shadow cursor-pointer group">
                <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})` }}>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-2xl font-bold" style={{ color: brand.colors.buttonText }}>{t.name}</span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="secondary" className="text-xs">{t.defaultBlocks.length} blocks</Badge>
                    <Badge variant="outline" className="text-xs">{t.defaultDensity}</Badge>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
