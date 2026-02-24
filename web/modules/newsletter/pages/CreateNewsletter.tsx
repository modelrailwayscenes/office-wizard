import { useState } from 'react';
import { useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { TEMPLATES, BRAND_PROFILES, BLOCK_LIBRARY } from '@/modules/newsletter/data/newsletter-data';
import { getInitialWizardState, saveNewsletter, generateId } from '@/modules/newsletter/lib/newsletter-store';
import { WizardState, ThemeFocus, TemplateId, BrandStyleId, LayoutDensity, BlockType, Newsletter, NewsletterBlock } from '@/modules/newsletter/types/newsletter';
import { ArrowLeft, ArrowRight, Check, Sparkles, X } from 'lucide-react';
import NewsletterPreview from '@/modules/newsletter/components/NewsletterPreview';

const STEPS = ['Metadata', 'Template', 'Brand Style', 'Content', 'Blocks', 'Layout', 'Review'];

const THEME_OPTIONS: { id: ThemeFocus; label: string }[] = [
  { id: 'new_releases', label: 'New Releases' },
  { id: 'seasonal', label: 'Seasonal Layout' },
  { id: 'diorama', label: 'Diorama Focus' },
  { id: 'workshop', label: 'Workshop / Tutorial' },
  { id: 'clearance', label: 'Clearance / Sale' },
];

const DENSITY_OPTIONS: { id: LayoutDensity; label: string; desc: string }[] = [
  { id: 'compact', label: 'Compact', desc: 'Tight spacing, more content visible' },
  { id: 'standard', label: 'Standard', desc: 'Balanced spacing and readability' },
  { id: 'spacious', label: 'Spacious', desc: 'Generous whitespace, premium feel' },
  { id: 'catalogue', label: 'Catalogue', desc: 'Product-grid focused layout' },
  { id: 'minimal', label: 'Minimal', desc: 'Clean, sparse layout' },
];

export default function CreateNewsletter() {
  const [state, setState] = useState<WizardState>(getInitialWizardState());
  const navigate = useNavigate();

  const update = (patch: Partial<WizardState>) => setState(s => ({ ...s, ...patch }));
  const updateMeta = (patch: Partial<WizardState['metadata']>) => setState(s => ({ ...s, metadata: { ...s.metadata, ...patch } }));
  const updateContent = (patch: Partial<WizardState['content']>) => setState(s => ({ ...s, content: { ...s.content, ...patch } }));

  const selectedTemplate = TEMPLATES.find(t => t.id === state.templateId);

  const handleGenerate = () => {
    const blocks: NewsletterBlock[] = state.selectedBlocks.map(type => {
      const def = BLOCK_LIBRARY.find(b => b.type === type)!;
      return {
        id: generateId(),
        type,
        content: { ...def.defaultContent, ...(type === 'hero_overlay' ? { headline: state.content.headline || def.defaultContent.headline } : {}) },
        settings: { ...def.defaultSettings },
      };
    });

    const newsletter: Newsletter = {
      id: generateId(),
      title: state.metadata.title || 'Untitled Newsletter',
      subject: state.metadata.subject || 'Newsletter',
      previewText: state.metadata.previewText,
      campaignTag: state.metadata.campaignTag,
      themeFocus: state.metadata.themeFocus,
      templateId: state.templateId || 'monthly_roundup',
      brandStyleId: state.brandStyleId,
      layoutDensity: state.layoutDensity,
      blocks,
      status: 'draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveNewsletter(newsletter);
    navigate('/marketing/newsletter');
  };

  return (
    <div className="p-8 max-w-5xl mx-auto animate-fade-in">
      {/* Progress */}
      <div className="mb-8">
        <div className="flex items-center gap-1 mb-6">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <button
                onClick={() => update({ step: i + 1 })}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                  state.step === i + 1
                    ? 'bg-primary text-primary-foreground'
                    : state.step > i + 1
                    ? 'bg-primary/10 text-primary'
                    : 'bg-muted text-muted-foreground'
                }`}
              >
                {state.step > i + 1 ? <Check className="w-3 h-3" /> : <span>{i + 1}</span>}
                <span className="hidden sm:inline">{step}</span>
              </button>
              {i < STEPS.length - 1 && <div className="w-4 h-px bg-border mx-1" />}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="min-h-[400px]">
        {state.step === 1 && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-2xl font-bold mb-1">Newsletter Details</h2>
              <p className="text-sm text-muted-foreground">Set up the basic information</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Newsletter Title (internal)</Label>
                <Input value={state.metadata.title} onChange={e => updateMeta({ title: e.target.value })} placeholder="February 2026 Newsletter" className="mt-1.5" />
              </div>
              <div>
                <Label>Email Subject Line</Label>
                <Input value={state.metadata.subject} onChange={e => updateMeta({ subject: e.target.value })} placeholder="New Scenic Details Just Landed 🚂" className="mt-1.5" />
              </div>
              <div>
                <Label>Preview Text</Label>
                <Input value={state.metadata.previewText} onChange={e => updateMeta({ previewText: e.target.value })} placeholder="Fresh arrivals, new textures, and more..." className="mt-1.5" />
              </div>
              <div>
                <Label>Campaign Tag</Label>
                <Input value={state.metadata.campaignTag} onChange={e => updateMeta({ campaignTag: e.target.value })} placeholder="feb-2026" className="mt-1.5" />
              </div>
              <div>
                <Label>Theme Focus</Label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {THEME_OPTIONS.map(opt => (
                    <button
                      key={opt.id}
                      onClick={() => updateMeta({ themeFocus: opt.id })}
                      className={`px-3 py-1.5 rounded-full text-sm border transition-colors ${
                        state.metadata.themeFocus === opt.id
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-card border-border hover:border-primary/40'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {state.step === 2 && (
          <div>
            <h2 className="text-2xl font-bold mb-1">Choose a Template</h2>
            <p className="text-sm text-muted-foreground mb-6">Select a starting layout for your newsletter</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {TEMPLATES.map(t => {
                const brand = BRAND_PROFILES.find(b => b.id === t.recommendedBrand)!;
                const isSelected = state.templateId === t.id;
                return (
                  <Card
                    key={t.id}
                    className={`overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-card' : 'hover:shadow-card'}`}
                    onClick={() => {
                      update({ templateId: t.id as TemplateId, selectedBlocks: t.defaultBlocks, brandStyleId: t.recommendedBrand, layoutDensity: t.defaultDensity });
                    }}
                  >
                    <div className="h-24" style={{ background: `linear-gradient(135deg, ${brand.colors.primary}, ${brand.colors.secondary})` }} />
                    <div className="p-4">
                      <h3 className="font-semibold text-sm">{t.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                      <Badge variant="outline" className="text-xs mt-2">{t.defaultBlocks.length} blocks</Badge>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {state.step === 3 && (
          <div>
            <h2 className="text-2xl font-bold mb-1">Brand Style</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose the visual personality for this issue</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {BRAND_PROFILES.map(p => {
                const isSelected = state.brandStyleId === p.id;
                return (
                  <Card
                    key={p.id}
                    className={`overflow-hidden cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-card' : 'hover:shadow-card'}`}
                    onClick={() => update({ brandStyleId: p.id as BrandStyleId })}
                  >
                    <div className="h-16" style={{ background: `linear-gradient(135deg, ${p.colors.primary}, ${p.colors.accent1})` }} />
                    <div className="p-4">
                      <h3 className="font-semibold text-sm">{p.name}</h3>
                      <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                      <div className="flex gap-1.5 mt-3">
                        {Object.values(p.colors).slice(0, 5).map((c, i) => (
                          <div key={i} className="w-6 h-6 rounded border" style={{ backgroundColor: c }} />
                        ))}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {state.step === 4 && (
          <div className="space-y-6 max-w-xl">
            <div>
              <h2 className="text-2xl font-bold mb-1">Content</h2>
              <p className="text-sm text-muted-foreground">Add your newsletter content</p>
            </div>
            <div className="space-y-4">
              <div>
                <Label>Hero Headline</Label>
                <Input value={state.content.headline} onChange={e => updateContent({ headline: e.target.value })} placeholder="Bring Your Layout to Life" className="mt-1.5" />
              </div>
              <div>
                <Label>Intro Paragraph</Label>
                <Textarea value={state.content.introParagraph} onChange={e => updateContent({ introParagraph: e.target.value })} placeholder="This month we're excited to share..." className="mt-1.5" rows={3} />
              </div>
              <div>
                <Label>Hero Image URL</Label>
                <Input value={state.content.heroImage} onChange={e => updateContent({ heroImage: e.target.value })} placeholder="https://..." className="mt-1.5" />
              </div>
              <div>
                <Label>Discount Code (optional)</Label>
                <Input value={state.content.discountCode} onChange={e => updateContent({ discountCode: e.target.value })} placeholder="SCENERY20" className="mt-1.5" />
              </div>
              <div>
                <Label>Scene Story (optional)</Label>
                <Textarea value={state.content.storyText} onChange={e => updateContent({ storyText: e.target.value })} placeholder="Tell a story about a scene..." className="mt-1.5" rows={3} />
              </div>
              <div>
                <Label>Video / Tutorial URL (optional)</Label>
                <Input value={state.content.videoUrl} onChange={e => updateContent({ videoUrl: e.target.value })} placeholder="https://youtube.com/..." className="mt-1.5" />
              </div>
            </div>
          </div>
        )}

        {state.step === 5 && (
          <div>
            <h2 className="text-2xl font-bold mb-1">Select Blocks</h2>
            <p className="text-sm text-muted-foreground mb-6">Choose which content blocks to include</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {BLOCK_LIBRARY.map(block => {
                const isChecked = state.selectedBlocks.includes(block.type);
                return (
                  <label key={block.type} className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${isChecked ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'}`}>
                    <Checkbox
                      checked={isChecked}
                      onCheckedChange={checked => {
                        update({
                          selectedBlocks: checked
                            ? [...state.selectedBlocks, block.type]
                            : state.selectedBlocks.filter(b => b !== block.type),
                        });
                      }}
                    />
                    <div>
                      <span className="text-sm font-medium">{block.name}</span>
                      <span className="text-xs text-muted-foreground ml-2">{block.category}</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
        )}

        {state.step === 6 && (
          <div>
            <h2 className="text-2xl font-bold mb-1">Layout Density</h2>
            <p className="text-sm text-muted-foreground mb-6">Control spacing and visual rhythm</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-3xl">
              {DENSITY_OPTIONS.map(opt => {
                const isSelected = state.layoutDensity === opt.id;
                return (
                  <Card
                    key={opt.id}
                    className={`p-5 cursor-pointer transition-all ${isSelected ? 'ring-2 ring-primary shadow-card' : 'hover:shadow-card'}`}
                    onClick={() => update({ layoutDensity: opt.id })}
                  >
                    <h3 className="font-semibold text-sm">{opt.label}</h3>
                    <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                  </Card>
                );
              })}
            </div>
          </div>
        )}

        {state.step === 7 && (
          <div>
            <h2 className="text-2xl font-bold mb-1">Review & Generate</h2>
            <p className="text-sm text-muted-foreground mb-6">Preview your newsletter before generating</p>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-4">
                <Card className="p-4 space-y-2">
                  <h3 className="font-semibold text-sm">Summary</h3>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <p><span className="font-medium text-foreground">Title:</span> {state.metadata.title || 'Untitled'}</p>
                    <p><span className="font-medium text-foreground">Subject:</span> {state.metadata.subject || '—'}</p>
                    <p><span className="font-medium text-foreground">Template:</span> {selectedTemplate?.name || '—'}</p>
                    <p><span className="font-medium text-foreground">Brand:</span> {BRAND_PROFILES.find(b => b.id === state.brandStyleId)?.name}</p>
                    <p><span className="font-medium text-foreground">Density:</span> {state.layoutDensity}</p>
                    <p><span className="font-medium text-foreground">Blocks:</span> {state.selectedBlocks.length}</p>
                  </div>
                </Card>
                <div className="flex flex-wrap gap-2">
                  {state.selectedBlocks.map(type => {
                    const def = BLOCK_LIBRARY.find(b => b.type === type);
                    return <Badge key={type} variant="secondary" className="text-xs">{def?.name}</Badge>;
                  })}
                </div>
              </div>

              <NewsletterPreview state={state} />
            </div>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex items-center justify-between mt-10 pt-6 border-t">
        <Button
          variant="outline"
          onClick={() => update({ step: Math.max(1, state.step - 1) })}
          disabled={state.step === 1}
          className="gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </Button>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            onClick={() => navigate('/marketing/newsletter')}
            className="gap-2 text-muted-foreground"
          >
            <X className="w-4 h-4" /> Cancel
          </Button>

          {state.step < 7 ? (
            <Button onClick={() => update({ step: state.step + 1 })} className="gap-2">
              Next <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleGenerate} className="gap-2">
              <Sparkles className="w-4 h-4" /> Generate Newsletter
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
