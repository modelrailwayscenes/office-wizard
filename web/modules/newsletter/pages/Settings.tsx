import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BRAND_PROFILES } from '@/modules/newsletter/data/newsletter-data';
import {
  Building2, Palette, Type, Link2, Mail, Share2, Upload,
  Globe, Instagram, Facebook, Youtube, Twitter, Save, ExternalLink
} from 'lucide-react';
import { toast } from 'sonner';

const STORAGE_KEY = 'mrs_settings';

interface AppSettings {
  company: {
    name: string;
    tagline: string;
    address: string;
    email: string;
    phone: string;
    website: string;
    logoUrl: string;
  };
  email: {
    subjectPrefix: string;
    replyTo: string;
    fromName: string;
    defaultFooterText: string;
  };
  social: {
    instagram: string;
    facebook: string;
    youtube: string;
    twitter: string;
    tiktok: string;
    pinterest: string;
  };
  shopify: {
    storeUrl: string;
    connected: boolean;
  };
  output: {
    defaultFormat: 'html_clipboard' | 'html_download' | 'shopify_push';
    emailWidth: number;
  };
  brandOverrides: Record<string, Record<string, string>>;
}

function getSettings(): AppSettings {
  const data = localStorage.getItem(STORAGE_KEY);
  if (data) return JSON.parse(data);
  return {
    company: { name: 'Model Railway Scenes', tagline: 'Crafting miniature worlds since 2018', address: '', email: '', phone: '', website: 'https://modelrailwayscenes.com', logoUrl: '' },
    email: { subjectPrefix: '', replyTo: '', fromName: 'Model Railway Scenes', defaultFooterText: '' },
    social: { instagram: '', facebook: '', youtube: '', twitter: '', tiktok: '', pinterest: '' },
    shopify: { storeUrl: '', connected: false },
    output: { defaultFormat: 'html_clipboard', emailWidth: 600 },
    brandOverrides: {},
  };
}

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const [editingBrand, setEditingBrand] = useState<string | null>(null);
  const [brandColors, setBrandColors] = useState<Record<string, string>>({});

  const update = (section: keyof AppSettings, patch: any) => {
    setSettings(s => ({ ...s, [section]: { ...s[section], ...patch } }));
  };

  const handleSave = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    toast.success('Settings saved');
  };

  const startEditBrand = (brandId: string) => {
    const profile = BRAND_PROFILES.find(b => b.id === brandId);
    if (profile) {
      setBrandColors(settings.brandOverrides[brandId] || { ...profile.colors });
      setEditingBrand(brandId);
    }
  };

  const saveBrandOverride = () => {
    if (!editingBrand) return;
    const updated = { ...settings, brandOverrides: { ...settings.brandOverrides, [editingBrand]: brandColors } };
    setSettings(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    setEditingBrand(null);
    toast.success('Brand colours updated');
  };

  return (
    <div className="p-8 bg-background min-h-full animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Settings</h1>
          <p className="text-muted-foreground mt-1">Configure your newsletter builder</p>
        </div>
        <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-card border border-border">
          <TabsTrigger value="company" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> Email</TabsTrigger>
          <TabsTrigger value="brand" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-1.5 text-xs"><Palette className="w-3.5 h-3.5" /> Brand</TabsTrigger>
          <TabsTrigger value="shopify" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-1.5 text-xs"><Globe className="w-3.5 h-3.5" /> Shopify</TabsTrigger>
          <TabsTrigger value="output" className="data-[state=active]:bg-muted data-[state=active]:text-foreground text-muted-foreground gap-1.5 text-xs"><Share2 className="w-3.5 h-3.5" /> Output</TabsTrigger>
        </TabsList>

        {/* Company Info */}
        <TabsContent value="company">
          <Card className="bg-card border-border p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Company Information</h2>
            <p className="text-sm text-muted-foreground">This information populates your email footer and branding.</p>
            <Separator className="bg-border" />

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Company Logo URL</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input value={settings.company.logoUrl} onChange={e => update('company', { logoUrl: e.target.value })} placeholder="https://..." className="bg-card border-border text-foreground placeholder:text-muted-foreground" />
                  <Button variant="outline" size="icon" className="border-border hover:bg-muted"><Upload className="w-4 h-4" /></Button>
                </div>
                {settings.company.logoUrl && (
                  <div className="mt-3 p-4 bg-muted rounded-lg inline-block">
                    <img src={settings.company.logoUrl} alt="Logo preview" className="max-h-16 max-w-48 object-contain" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Company Name</Label><Input value={settings.company.name} onChange={e => update('company', { name: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
                <div><Label className="text-muted-foreground">Tagline</Label><Input value={settings.company.tagline} onChange={e => update('company', { tagline: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
              </div>
              <div><Label className="text-muted-foreground">Address</Label><Textarea value={settings.company.address} onChange={e => update('company', { address: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" rows={2} placeholder="123 Railway Lane, UK" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">Email</Label><Input value={settings.company.email} onChange={e => update('company', { email: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" placeholder="hello@..." /></div>
                <div><Label className="text-muted-foreground">Phone</Label><Input value={settings.company.phone} onChange={e => update('company', { phone: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
              </div>
              <div><Label className="text-muted-foreground">Website</Label><Input value={settings.company.website} onChange={e => update('company', { website: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
            </div>

            <Separator className="bg-border" />
            <h3 className="text-base font-semibold text-foreground">Social Media Links</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Instagram className="w-4 h-4 text-muted-foreground" /><Input value={settings.social.instagram} onChange={e => update('social', { instagram: e.target.value })} placeholder="Instagram URL" className="bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
              <div className="flex items-center gap-2"><Facebook className="w-4 h-4 text-muted-foreground" /><Input value={settings.social.facebook} onChange={e => update('social', { facebook: e.target.value })} placeholder="Facebook URL" className="bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
              <div className="flex items-center gap-2"><Youtube className="w-4 h-4 text-muted-foreground" /><Input value={settings.social.youtube} onChange={e => update('social', { youtube: e.target.value })} placeholder="YouTube URL" className="bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
              <div className="flex items-center gap-2"><Twitter className="w-4 h-4 text-muted-foreground" /><Input value={settings.social.twitter} onChange={e => update('social', { twitter: e.target.value })} placeholder="X / Twitter URL" className="bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
            </div>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="bg-card border-border p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Email Settings</h2>
            <Separator className="bg-border" />
            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Subject Line Prefix</Label>
                <Input value={settings.email.subjectPrefix} onChange={e => update('email', { subjectPrefix: e.target.value })} placeholder="e.g. [MRS] or 🚂 MRS:" className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" />
                <p className="text-xs text-muted-foreground mt-1">This text is automatically prepended to every newsletter subject line</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-muted-foreground">From Name</Label><Input value={settings.email.fromName} onChange={e => update('email', { fromName: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" /></div>
                <div><Label className="text-muted-foreground">Reply-To Email</Label><Input value={settings.email.replyTo} onChange={e => update('email', { replyTo: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" placeholder="hello@..." /></div>
              </div>
              <div>
                <Label className="text-muted-foreground">Default Footer Text</Label>
                <Textarea value={settings.email.defaultFooterText} onChange={e => update('email', { defaultFooterText: e.target.value })} className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" rows={3} placeholder="You're receiving this because you signed up at modelrailwayscenes.com..." />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Brand Colours */}
        <TabsContent value="brand">
          <Card className="bg-card border-border p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Brand Colour Presets</h2>
            <p className="text-sm text-muted-foreground">Click a brand profile to customise its colours</p>
            <Separator className="bg-border" />

            {editingBrand ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground">{BRAND_PROFILES.find(b => b.id === editingBrand)?.name} — Edit Colours</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-border hover:bg-muted" onClick={() => setEditingBrand(null)}>Cancel</Button>
                    <Button size="sm" onClick={saveBrandOverride} className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium">Save Colours</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(brandColors).map(([key, val]) => (
                    <div key={key}>
                      <Label className="text-xs text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={val} onChange={e => setBrandColors(c => ({ ...c, [key]: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                        <Input value={val} onChange={e => setBrandColors(c => ({ ...c, [key]: e.target.value }))} className="font-mono text-xs h-8 bg-card border-border text-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Label className="text-xs text-muted-foreground">Preview</Label>
                  <div className="mt-2 rounded-lg overflow-hidden border border-border" style={{ maxWidth: '400px' }}>
                    <div className="h-12" style={{ background: `linear-gradient(135deg, ${brandColors.primary || '#000'}, ${brandColors.accent1 || '#666'})` }} />
                    <div className="p-4" style={{ background: brandColors.background || '#fff', color: brandColors.text || '#000' }}>
                      <p className="text-sm font-semibold mb-2">Preview text</p>
                      <span className="inline-block text-xs px-3 py-1.5 rounded" style={{ background: brandColors.buttonBg || '#000', color: brandColors.buttonText || '#fff' }}>Button</span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BRAND_PROFILES.map(profile => {
                  const hasOverride = !!settings.brandOverrides[profile.id];
                  return (
                    <Card key={profile.id} className="bg-card border-border overflow-hidden cursor-pointer hover:border-border transition-shadow" onClick={() => startEditBrand(profile.id)}>
                      <div className="h-14" style={{ background: `linear-gradient(135deg, ${profile.colors.primary}, ${profile.colors.accent1})` }} />
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{profile.name}</h3>
                          <p className="text-xs text-muted-foreground">{profile.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasOverride && <Badge variant="outline" className="border-border text-muted-foreground text-xs">Customised</Badge>}
                          <Palette className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* Shopify */}
        <TabsContent value="shopify">
          <Card className="bg-card border-border p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Shopify Connection</h2>
            <p className="text-sm text-muted-foreground">Connect your Shopify store to pull products, collections, images, and blog posts into newsletters.</p>
            <Separator className="bg-border" />

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Shopify Store URL</Label>
                <Input value={settings.shopify.storeUrl} onChange={e => update('shopify', { storeUrl: e.target.value })} placeholder="your-store.myshopify.com" className="mt-1.5 bg-card border-border text-foreground placeholder:text-muted-foreground" />
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Connection Status</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {settings.shopify.connected ? 'Connected and syncing products' : 'Not connected — enable Shopify to sync products, images, and collections'}
                    </p>
                  </div>
                  <Badge variant={settings.shopify.connected ? 'default' : 'secondary'} className={settings.shopify.connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-muted text-muted-foreground'}>
                    {settings.shopify.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              <div className="border border-border rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-foreground">When connected, you can:</h3>
                <ul className="text-sm text-muted-foreground space-y-2">
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-primary" /> Pull products by tag, type, or keyword into product grids</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-primary" /> Browse and insert images from your Shopify file library</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-primary" /> Feature entire collections with auto-populated blocks</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-primary" /> Embed or link to Shopify blog posts</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-primary" /> Push newsletter drafts directly to Shopify Email</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Output */}
        <TabsContent value="output">
          <Card className="bg-card border-border p-6 space-y-5">
            <h2 className="text-lg font-semibold text-foreground">Output & Export</h2>
            <p className="text-sm text-muted-foreground">How newsletters get from this app to your email platform</p>
            <Separator className="bg-border" />

            <div className="space-y-4">
              <div>
                <Label className="text-muted-foreground">Default Export Format</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {[
                    { id: 'html_clipboard' as const, label: 'Copy HTML', desc: 'Copy email-safe HTML to clipboard for pasting into Shopify Email or Outlook' },
                    { id: 'html_download' as const, label: 'Download HTML', desc: 'Download as .html file for import into any email platform' },
                    { id: 'shopify_push' as const, label: 'Shopify Email', desc: 'Push draft directly to Shopify Email (requires connection)' },
                  ].map(opt => (
                    <Card
                      key={opt.id}
                      className={`bg-card border-border p-4 cursor-pointer transition-all ${settings.output.defaultFormat === opt.id ? 'ring-2 ring-primary' : 'hover:border-border'}`}
                      onClick={() => update('output', { defaultFormat: opt.id })}
                    >
                      <h4 className="text-sm font-semibold text-foreground">{opt.label}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{opt.desc}</p>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-muted-foreground">Email Max Width (px)</Label>
                <Input type="number" value={settings.output.emailWidth} onChange={e => update('output', { emailWidth: parseInt(e.target.value) || 600 })} className="mt-1.5 max-w-32 bg-card border-border text-foreground" />
                <p className="text-xs text-muted-foreground mt-1">Standard is 600px. Max recommended: 700px.</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
