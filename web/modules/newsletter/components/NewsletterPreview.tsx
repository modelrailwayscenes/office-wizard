import { useState } from 'react';
import { WizardState } from '@/modules/newsletter/types/newsletter';
import { BRAND_PROFILES, BLOCK_LIBRARY } from '@/modules/newsletter/data/newsletter-data';
import { Button } from '@/components/ui/button';
import { Monitor, Smartphone } from 'lucide-react';

interface Props {
  state: WizardState;
}

export default function NewsletterPreview({ state }: Props) {
  const [viewMode, setViewMode] = useState<'desktop' | 'mobile'>('desktop');
  const brand = BRAND_PROFILES.find(b => b.id === state.brandStyleId)!;

  const densityScale = {
    compact: 0.7,
    standard: 1,
    spacious: 1.4,
    catalogue: 0.85,
    minimal: 1.2,
  };
  const scale = densityScale[state.layoutDensity];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Button
          variant={viewMode === 'desktop' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('desktop')}
          className="gap-1.5"
        >
          <Monitor className="w-3.5 h-3.5" /> Desktop
        </Button>
        <Button
          variant={viewMode === 'mobile' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setViewMode('mobile')}
          className="gap-1.5"
        >
          <Smartphone className="w-3.5 h-3.5" /> Mobile
        </Button>
      </div>

      <div
        className="border rounded-lg overflow-hidden mx-auto transition-all duration-300"
        style={{
          width: viewMode === 'desktop' ? '100%' : '375px',
          maxWidth: '100%',
          backgroundColor: brand.colors.background,
        }}
      >
        {/* Email preview */}
        <div style={{ fontFamily: `${brand.bodyFont}, sans-serif`, color: brand.colors.text, maxWidth: '600px', margin: '0 auto' }}>
          {state.selectedBlocks.map((type, idx) => {
            const def = BLOCK_LIBRARY.find(b => b.type === type);
            if (!def) return null;

            const p = Math.round(def.defaultSettings.paddingTop * scale);

            return (
              <div
                key={`${type}-${idx}`}
                style={{
                  padding: `${p}px ${Math.round(def.defaultSettings.paddingLeft * scale)}px`,
                  textAlign: def.defaultSettings.textAlign || 'left',
                }}
              >
                {/* Render block preview based on type */}
                {renderBlockPreview(type, def.defaultContent, brand, state.content)}
              </div>
            );
          })}

          {state.selectedBlocks.length === 0 && (
            <div style={{ padding: '60px 24px', textAlign: 'center', color: '#9CA3AF' }}>
              <p>No blocks selected. Go back to step 5 to add blocks.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderBlockPreview(type: string, content: any, brand: any, wizardContent: any) {
  const colors = brand.colors;

  switch (type) {
    case 'hero_overlay':
      return (
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`, borderRadius: '8px', padding: '48px 24px', textAlign: 'center', position: 'relative' }}>
          <h1 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '28px', fontWeight: 700, color: colors.buttonText, marginBottom: '8px' }}>
            {wizardContent.headline || content.headline}
          </h1>
          <p style={{ fontSize: '14px', color: `${colors.buttonText}cc`, marginBottom: '20px' }}>{content.subheadline}</p>
          <span style={{ display: 'inline-block', background: colors.buttonBg, color: colors.buttonText, padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 600 }}>
            {content.buttonText}
          </span>
        </div>
      );

    case 'hero_below':
      return (
        <div>
          <div style={{ background: colors.cardBg, height: '160px', borderRadius: '8px 8px 0 0', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.primary}22` }}>
            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>Hero Image</span>
          </div>
          <div style={{ padding: '20px 0', textAlign: 'center' }}>
            <h2 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '22px', fontWeight: 700, marginBottom: '8px' }}>{content.headline}</h2>
            <p style={{ fontSize: '13px', color: '#6B7280' }}>{content.paragraph}</p>
          </div>
        </div>
      );

    case 'hero_split':
      return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <div style={{ flex: 1, background: colors.cardBg, height: '120px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `1px solid ${colors.primary}22` }}>
            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>Image</span>
          </div>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '18px', fontWeight: 700, marginBottom: '6px' }}>{content.headline}</h2>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>{content.paragraph}</p>
            <span style={{ display: 'inline-block', background: colors.buttonBg, color: colors.buttonText, padding: '8px 16px', borderRadius: '5px', fontSize: '12px', fontWeight: 600 }}>{content.buttonText}</span>
          </div>
        </div>
      );

    case 'cinematic_banner':
      return (
        <div style={{ background: '#0F0F1A', borderRadius: '8px', padding: '60px 24px', textAlign: 'center' }}>
          <h1 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '32px', fontWeight: 700, color: '#E8D5B0', marginBottom: '8px' }}>{content.headline}</h1>
          <p style={{ fontSize: '14px', color: '#9CA3AF' }}>{content.subheadline}</p>
        </div>
      );

    case 'product_card':
      return (
        <div style={{ border: `1px solid ${colors.primary}15`, borderRadius: '8px', overflow: 'hidden' }}>
          <div style={{ background: colors.cardBg, height: '140px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>Product Image</span>
          </div>
          <div style={{ padding: '16px' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 600, marginBottom: '4px' }}>{content.title}</h3>
            <p style={{ fontSize: '16px', fontWeight: 700, color: colors.primary, marginBottom: '8px' }}>{content.price}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '12px' }}>{content.description}</p>
            <span style={{ display: 'inline-block', background: colors.buttonBg, color: colors.buttonText, padding: '8px 16px', borderRadius: '5px', fontSize: '12px', fontWeight: 600 }}>{content.buttonText}</span>
          </div>
        </div>
      );

    case 'product_grid_2':
    case 'product_grid_3':
      const cols = type === 'product_grid_2' ? 2 : 3;
      return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap: '12px' }}>
          {(content.products || []).map((p: any, i: number) => (
            <div key={i} style={{ border: `1px solid ${colors.primary}15`, borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ background: colors.cardBg, height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: '#9CA3AF', fontSize: '10px' }}>Image</span>
              </div>
              <div style={{ padding: '10px' }}>
                <h4 style={{ fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>{p.title}</h4>
                <p style={{ fontSize: '13px', fontWeight: 700, color: colors.primary }}>{p.price}</p>
              </div>
            </div>
          ))}
        </div>
      );

    case 'product_spotlight':
      return (
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', border: `1px solid ${colors.primary}15`, borderRadius: '8px', padding: '16px' }}>
          <div style={{ width: '120px', height: '120px', background: colors.cardBg, borderRadius: '8px', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: '#9CA3AF', fontSize: '10px' }}>Image</span>
          </div>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '2px' }}>{content.title}</h3>
            <p style={{ fontSize: '16px', fontWeight: 700, color: colors.primary, marginBottom: '6px' }}>{content.price}</p>
            <p style={{ fontSize: '12px', color: '#6B7280', marginBottom: '8px', fontStyle: 'italic' }}>{content.quote}</p>
            <span style={{ display: 'inline-block', background: colors.buttonBg, color: colors.buttonText, padding: '8px 16px', borderRadius: '5px', fontSize: '12px', fontWeight: 600 }}>{content.buttonText}</span>
          </div>
        </div>
      );

    case 'scene_story':
      return (
        <div>
          <div style={{ background: colors.cardBg, height: '180px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: `1px solid ${colors.primary}15` }}>
            <span style={{ color: '#9CA3AF', fontSize: '11px' }}>Scene Image</span>
          </div>
          <h3 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{wizardContent.storyText ? 'Scene Spotlight' : content.headline}</h3>
          <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>{wizardContent.storyText || content.story}</p>
        </div>
      );

    case 'tip_of_month':
      return (
        <div style={{ background: `${colors.primary}10`, border: `2px solid ${colors.primary}25`, borderRadius: '8px', padding: '20px' }}>
          <h3 style={{ fontSize: '15px', fontWeight: 700, marginBottom: '8px', color: colors.primary }}>💡 {content.title}</h3>
          <p style={{ fontSize: '13px', lineHeight: '1.5' }}>{content.tip}</p>
        </div>
      );

    case 'heading_paragraph':
      return (
        <div>
          <h2 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>{content.heading}</h2>
          <p style={{ fontSize: '13px', color: '#6B7280', lineHeight: '1.6' }}>{wizardContent.introParagraph || content.paragraph}</p>
        </div>
      );

    case 'quote':
      return (
        <div style={{ padding: '24px', textAlign: 'center' }}>
          <p style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '20px', fontStyle: 'italic', color: colors.primary, lineHeight: '1.4' }}>{content.quote}</p>
          <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>{content.attribution}</p>
        </div>
      );

    case 'discount_code':
      return (
        <div style={{ background: `${colors.primary}08`, border: `2px dashed ${colors.primary}40`, borderRadius: '8px', padding: '24px', textAlign: 'center' }}>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '8px' }}>{content.description}</p>
          <div style={{ background: colors.primary, color: colors.buttonText, display: 'inline-block', padding: '10px 32px', borderRadius: '6px', fontSize: '20px', fontWeight: 800, letterSpacing: '2px', marginBottom: '8px' }}>
            {wizardContent.discountCode || content.code}
          </div>
          <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{content.expiry}</p>
        </div>
      );

    case 'flash_sale':
      return (
        <div style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.accent1})`, borderRadius: '8px', padding: '32px', textAlign: 'center' }}>
          <span style={{ background: colors.buttonText, color: colors.primary, fontSize: '10px', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '1px' }}>Limited Time</span>
          <h2 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '28px', fontWeight: 800, color: colors.buttonText, margin: '12px 0 6px' }}>{content.headline}</h2>
          <p style={{ fontSize: '13px', color: `${colors.buttonText}bb`, marginBottom: '16px' }}>{content.subtitle}</p>
          <span style={{ display: 'inline-block', background: colors.buttonText, color: colors.primary, padding: '10px 24px', borderRadius: '6px', fontSize: '13px', fontWeight: 700 }}>{content.buttonText}</span>
        </div>
      );

    case 'social_links':
      return (
        <div style={{ textAlign: 'center', padding: '16px 0' }}>
          <p style={{ fontSize: '13px', color: '#6B7280', marginBottom: '12px' }}>{content.text}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
            {['Instagram', 'Facebook', 'YouTube'].map(s => (
              <span key={s} style={{ display: 'inline-block', width: '36px', height: '36px', borderRadius: '50%', background: `${colors.primary}15`, lineHeight: '36px', fontSize: '10px', color: colors.primary }}>{s[0]}</span>
            ))}
          </div>
        </div>
      );

    case 'footer_premium':
      return (
        <div style={{ borderTop: `2px solid ${colors.primary}20`, padding: '24px 0', textAlign: 'center' }}>
          <h4 style={{ fontFamily: `${brand.headingFont}, serif`, fontSize: '16px', fontWeight: 700, marginBottom: '4px' }}>{content.companyName}</h4>
          <p style={{ fontSize: '11px', color: '#9CA3AF', marginBottom: '12px' }}>{content.tagline}</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', fontSize: '11px', color: colors.primary }}>
            {(content.links || []).map((l: string) => <span key={l}>{l}</span>)}
          </div>
          <p style={{ fontSize: '10px', color: '#D1D5DB', marginTop: '16px' }}>Unsubscribe · View in browser</p>
        </div>
      );

    case 'footer_minimal':
      return (
        <div style={{ borderTop: `1px solid ${colors.primary}15`, padding: '16px 0', textAlign: 'center' }}>
          <p style={{ fontSize: '11px', color: '#9CA3AF' }}>{content.companyName} · {content.address}</p>
          <p style={{ fontSize: '10px', color: '#D1D5DB', marginTop: '4px' }}>Unsubscribe</p>
        </div>
      );

    default:
      return (
        <div style={{ background: '#F3F4F6', borderRadius: '6px', padding: '16px', textAlign: 'center' }}>
          <span style={{ fontSize: '11px', color: '#9CA3AF' }}>{type} block</span>
        </div>
      );
  }
}
