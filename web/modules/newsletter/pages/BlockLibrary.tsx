import { useState } from 'react';
import { BLOCK_LIBRARY, BLOCK_CATEGORIES, BRAND_PROFILES } from '@/modules/newsletter/data/newsletter-data';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import * as LucideIcons from 'lucide-react';
import { Eye } from 'lucide-react';

function getIcon(name: string) {
  const Icon = (LucideIcons as any)[name];
  return Icon ? <Icon className="w-5 h-5" /> : null;
}

// Reuse the block renderer from NewsletterPreview
function renderBlockPreview(type: string, content: any, brand: any) {
  const colors = brand.colors;
  switch (type) {
    case 'hero_overlay':
      return (
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, borderRadius: '8px', padding: '40px 20px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Inter, sans-serif', fontSize: '22px', fontWeight: 700, color: colors.buttonText, marginBottom: '6px' }}>{content.headline}</h1>
          <p style={{ fontSize: '12px', color: `${colors.buttonText}cc`, marginBottom: '16px' }}>{content.subheadline}</p>
          <span style={{ display: 'inline-block', background: colors.buttonBg, color: colors.buttonText, padding: '8px 20px', borderRadius: '6px', fontSize: '11px', fontWeight: 600 }}>{content.buttonText}</span>
        </div>
      );
    case 'hero_below':
      return (
        <div>
          <div style={{ background: colors.cardBg, height: '100px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.primary}22` }}>
            <span style={{ color: '#9CA3AF', fontSize: '10px' }}>Hero Image</span>
          </div>
          <div style={{ padding: '14px 0', textAlign: 'center' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{content.headline}</h2>
            <p style={{ fontSize: '11px', color: '#6B7280' }}>{content.paragraph}</p>
          </div>
        </div>
      );
    case 'hero_split':
      return (
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ flex: 1, background: colors.cardBg, height: '80px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.primary}22` }}>
            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>Image</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{content.headline}</h2>
            <p style={{ fontSize: '10px', color: '#6B7280' }}>{content.paragraph}</p>
          </div>
        </div>
      );
    case 'cinematic_banner':
      return (
        <div style={{ background: '#0F0F1A', borderRadius: '8px', padding: '36px 16px', textAlign: 'center' }}>
          <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#E8D5B0', marginBottom: '4px' }}>{content.headline}</h1>
          <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{content.subheadline}</p>
        </div>
      );
    case 'product_card':
      return (
        <div style={{ border: `1px solid ${colors.primary}15`, borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: colors.cardBg, height: '80px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>Product</span>
          </div>
          <div style={{ padding: '10px' }}>
            <h3 style={{ fontSize: '12px', fontWeight: 600 }}>{content.title}</h3>
            <p style={{ fontSize: '13px', fontWeight: 700, color: colors.primary }}>{content.price}</p>
          </div>
        </div>
      );
    case 'product_grid_2':
    case 'product_grid_3':
      const cols = type === 'product_grid_2' ? 2 : 3;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '8px' }}>
          {(content.products || []).map((p: any, i: number) => (
            <div key={i} style={{ border: `1px solid ${colors.primary}15`, borderRadius: '6px', overflow: 'hidden' }}>
              <div style={{ background: colors.cardBg, height: '50px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#9CA3AF', fontSize: '8px' }}>Img</span>
              </div>
              <div style={{ padding: '6px' }}>
                <h4 style={{ fontSize: '9px', fontWeight: 600 }}>{p.title}</h4>
                <p style={{ fontSize: '10px', fontWeight: 700, color: colors.primary }}>{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      );
    case 'product_spotlight':
      return (
        <div style={{ display: 'flex', gap: '10px', border: `1px solid ${colors.primary}15`, borderRadius: '8px', padding: '10px' }}>
          <div style={{ width: '60px', height: '60px', background: colors.cardBg, borderRadius: '6px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9CA3AF', fontSize: '8px' }}>Img</span>
          </div>
          <div>
            <h3 style={{ fontSize: '12px', fontWeight: 600 }}>{content.title}</h3>
            <p style={{ fontSize: '11px', fontWeight: 700, color: colors.primary }}>{content.price}</p>
            <p style={{ fontSize: '9px', color: '#6B7280', fontStyle: 'italic' }}>{content.quote}</p>
          </div>
        </div>
      );
    case 'scene_story':
      return (
        <div>
          <div style={{ background: colors.cardBg, height: '80px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', border: `1px solid ${colors.primary}15` }}>
            <span style={{ color: '#9CA3AF', fontSize: '9px' }}>Scene</span>
          </div>
          <h3 style={{ fontSize: '13px', fontWeight: 700, marginBottom: '4px' }}>{content.headline}</h3>
          <p style={{ fontSize: '10px', color: '#6B7280' }}>{content.story?.substring(0, 60)}...</p>
        </div>
      );
    case 'workshop':
      return (
        <div style={{ display: 'flex', gap: '8px' }}>
          <div style={{ flex: 1, background: colors.cardBg, height: '60px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.primary}15` }}>
            <span style={{ color: '#9CA3AF', fontSize: '8px' }}>Img 1</span>
          </div>
          <div style={{ flex: 1, background: colors.cardBg, height: '60px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.primary}15` }}>
            <span style={{ color: '#9CA3AF', fontSize: '8px' }}>Img 2</span>
          </div>
        </div>
      );
    case 'tip_of_month':
      return (
        <div style={{ background: `${colors.primary}10`, border: `2px solid ${colors.primary}25`, borderRadius: '8px', padding: '12px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, color: colors.primary }}>💡 {content.title}</h3>
          <p style={{ fontSize: '10px', marginTop: '4px' }}>{content.tip?.substring(0, 50)}...</p>
        </div>
      );
    case 'heading_paragraph':
      return (
        <div>
          <h2 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '4px' }}>{content.heading}</h2>
          <p style={{ fontSize: '10px', color: '#6B7280' }}>{content.paragraph?.substring(0, 50)}...</p>
        </div>
      );
    case 'quote':
      return (
        <div style={{ textAlign: 'center', padding: '12px' }}>
          <p style={{ fontSize: '13px', fontStyle: 'italic', color: colors.primary }}>{content.quote}</p>
          <p style={{ fontSize: '9px', color: '#9CA3AF', marginTop: '4px' }}>{content.attribution}</p>
        </div>
      );
    case 'discount_code':
      return (
        <div style={{ background: `${colors.primary}08`, border: `2px dashed ${colors.primary}40`, borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
          <div style={{ background: colors.primary, color: colors.buttonText, display: 'inline-block', padding: '6px 20px', borderRadius: '4px', fontSize: '14px', fontWeight: 800, letterSpacing: '2px' }}>{content.code}</div>
          <p style={{ fontSize: '10px', color: '#6B7280', marginTop: '6px' }}>{content.description}</p>
        </div>
      );
    case 'flash_sale':
      return (
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`, borderRadius: '8px', padding: '20px', textAlign: 'center' }}>
          <span style={{ background: colors.buttonText, color: colors.primary, fontSize: '8px', fontWeight: 700, padding: '2px 8px', borderRadius: '10px', textTransform: 'uppercase' }}>Limited Time</span>
          <h2 style={{ fontSize: '18px', fontWeight: 800, color: colors.buttonText, margin: '8px 0' }}>{content.headline}</h2>
        </div>
      );
    case 'social_links':
      return (
        <div style={{ textAlign: 'center', padding: '10px' }}>
          <p style={{ fontSize: '10px', color: '#6B7280', marginBottom: '8px' }}>{content.text}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {['I', 'F', 'Y'].map(s => (
              <span key={s} style={{ width: '24px', height: '24px', borderRadius: '50%', background: `${colors.primary}15`, lineHeight: '24px', fontSize: '8px', color: colors.primary, display: 'inline-block', textAlign: 'center' }}>{s}</span>
            ))}
          </div>
        </div>
      );
    case 'footer_premium':
      return (
        <div style={{ borderTop: `2px solid ${colors.primary}20`, padding: '12px 0', textAlign: 'center' }}>
          <h4 style={{ fontSize: '12px', fontWeight: 700, marginBottom: '2px' }}>{content.companyName}</h4>
          <p style={{ fontSize: '9px', color: '#9CA3AF' }}>{content.tagline}</p>
        </div>
      );
    case 'footer_minimal':
      return (
        <div style={{ borderTop: `1px solid ${colors.primary}15`, padding: '10px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '9px', color: '#9CA3AF' }}>{content.companyName}</p>
        </div>
      );
    default:
      return (
        <div style={{ background: '#F3F4F6', borderRadius: '6px', padding: '12px', textAlign: 'center' }}>
          <span style={{ fontSize: '9px', color: '#9CA3AF' }}>{type}</span>
        </div>
      );
  }
}

export default function BlockLibrary() {
  const [previewBlock, setPreviewBlock] = useState<string | null>(null);
  const brand = BRAND_PROFILES[0]; // Classic MRS for previews

  const previewDef = previewBlock ? BLOCK_LIBRARY.find(b => b.type === previewBlock) : null;

  return (
    <div className="p-8 bg-background min-h-full animate-fade-in">
      <div className="border-b border-border bg-card/50 -mx-8 px-8 py-6 mb-8">
        <h1 className="text-2xl font-semibold mb-2 text-foreground">Block Library</h1>
        <p className="text-muted-foreground">Modular content blocks for your newsletters</p>
      </div>

      {BLOCK_CATEGORIES.map(cat => {
        const blocks = BLOCK_LIBRARY.filter(b => b.category === cat);
        return (
          <div key={cat} className="mb-8">
            <h2 className="text-lg font-semibold mb-3 text-foreground">{cat}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {blocks.map(block => (
                <Card key={block.type} className="bg-card border-border p-4 hover:border-border transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-md bg-primary/10 flex items-center justify-center text-primary flex-shrink-0">
                      {getIcon(block.icon)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-semibold text-sm text-foreground">{block.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{block.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant="outline" className="border-border text-muted-foreground text-xs">{block.category}</Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 gap-1 text-xs text-primary hover:text-primary"
                          onClick={() => setPreviewBlock(block.type)}
                        >
                          <Eye className="w-3 h-3" /> Preview
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      {/* Preview Dialog */}
      <Dialog open={!!previewBlock} onOpenChange={() => setPreviewBlock(null)}>
        <DialogContent className="max-w-lg bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">{previewDef?.name || 'Block Preview'}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground mb-4">{previewDef?.description}</p>
          <div className="border border-border rounded-lg p-4" style={{ backgroundColor: brand.colors.background, color: brand.colors.text }}>
            {previewDef && renderBlockPreview(previewDef.type, previewDef.defaultContent, brand)}
          </div>
          <p className="text-xs text-muted-foreground mt-2">Shown with "Classic MRS" brand profile</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
