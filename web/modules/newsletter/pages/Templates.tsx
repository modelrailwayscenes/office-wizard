import { TEMPLATES, BRAND_PROFILES } from '@/modules/newsletter/data/newsletter-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';

export default function Templates() {
  return (
    <div className="p-8 max-w-6xl mx-auto bg-background min-h-full animate-fade-in">
      <h1 className="text-3xl font-bold mb-2 text-foreground">Templates</h1>
      <p className="text-muted-foreground mb-8">Pre-built newsletter layouts ready to customize</p>

      <Carousel
        opts={{ align: "start", loop: true }}
        className="w-full"
      >
        <CarouselContent className="-ml-4">
          {TEMPLATES.map(t => {
            const brand = BRAND_PROFILES.find(b => b.id === t.recommendedBrand)!;
            return (
              <CarouselItem key={t.id} className="pl-4 md:basis-1/2 lg:basis-1/3">
                <Link to="/marketing/newsletter/create">
                  <Card className="bg-card border-border overflow-hidden hover:border-border transition-shadow cursor-pointer group">
                    <div className="h-32 relative" style={{ background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})` }}>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-2xl font-bold" style={{ color: brand.colors.buttonText }}>{t.name}</span>
                      </div>
                    </div>
                    <div className="p-4">
                      <p className="text-sm text-muted-foreground mb-3">{t.description}</p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="secondary" className="text-xs bg-muted text-muted-foreground border-border">{t.defaultBlocks.length} blocks</Badge>
                        <Badge variant="outline" className="border-border text-muted-foreground text-xs">{t.defaultDensity}</Badge>
                      </div>
                    </div>
                  </Card>
                </Link>
              </CarouselItem>
            );
          })}
        </CarouselContent>
        <CarouselPrevious className="-left-4" />
        <CarouselNext className="-right-4" />
      </Carousel>
    </div>
  );
}
