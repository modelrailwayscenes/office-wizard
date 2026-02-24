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
    <div className="p-8 max-w-4xl mx-auto bg-slate-950 min-h-full animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white">Settings</h1>
          <p className="text-slate-400 mt-1">Configure your newsletter builder</p>
        </div>
        <Button onClick={handleSave} className="bg-teal-500 hover:bg-teal-600 text-black font-medium gap-2">
          <Save className="w-4 h-4" /> Save All
        </Button>
      </div>

      <Tabs defaultValue="company" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-slate-700">
          <TabsTrigger value="company" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-1.5 text-xs"><Building2 className="w-3.5 h-3.5" /> Company</TabsTrigger>
          <TabsTrigger value="email" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-1.5 text-xs"><Mail className="w-3.5 h-3.5" /> Email</TabsTrigger>
          <TabsTrigger value="brand" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-1.5 text-xs"><Palette className="w-3.5 h-3.5" /> Brand</TabsTrigger>
          <TabsTrigger value="shopify" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-1.5 text-xs"><Globe className="w-3.5 h-3.5" /> Shopify</TabsTrigger>
          <TabsTrigger value="output" className="data-[state=active]:bg-slate-700 data-[state=active]:text-white text-slate-400 gap-1.5 text-xs"><Share2 className="w-3.5 h-3.5" /> Output</TabsTrigger>
        </TabsList>

        {/* Company Info */}
        <TabsContent value="company">
          <Card className="bg-slate-800/50 border-slate-700 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Company Information</h2>
            <p className="text-sm text-slate-400">This information populates your email footer and branding.</p>
            <Separator className="bg-slate-700" />

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Company Logo URL</Label>
                <div className="flex gap-2 mt-1.5">
                  <Input value={settings.company.logoUrl} onChange={e => update('company', { logoUrl: e.target.value })} placeholder="https://..." className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" />
                  <Button variant="outline" size="icon" className="border-slate-700 hover:bg-slate-800"><Upload className="w-4 h-4" /></Button>
                </div>
                {settings.company.logoUrl && (
                  <div className="mt-3 p-4 bg-slate-800 rounded-lg inline-block">
                    <img src={settings.company.logoUrl} alt="Logo preview" className="max-h-16 max-w-48 object-contain" />
                  </div>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Company Name</Label><Input value={settings.company.name} onChange={e => update('company', { name: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
                <div><Label className="text-slate-300">Tagline</Label><Input value={settings.company.tagline} onChange={e => update('company', { tagline: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
              </div>
              <div><Label className="text-slate-300">Address</Label><Textarea value={settings.company.address} onChange={e => update('company', { address: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" rows={2} placeholder="123 Railway Lane, UK" /></div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">Email</Label><Input value={settings.company.email} onChange={e => update('company', { email: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" placeholder="hello@..." /></div>
                <div><Label className="text-slate-300">Phone</Label><Input value={settings.company.phone} onChange={e => update('company', { phone: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
              </div>
              <div><Label className="text-slate-300">Website</Label><Input value={settings.company.website} onChange={e => update('company', { website: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
            </div>

            <Separator className="bg-slate-700" />
            <h3 className="text-base font-semibold text-white">Social Media Links</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Instagram className="w-4 h-4 text-slate-400" /><Input value={settings.social.instagram} onChange={e => update('social', { instagram: e.target.value })} placeholder="Instagram URL" className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="flex items-center gap-2"><Facebook className="w-4 h-4 text-slate-400" /><Input value={settings.social.facebook} onChange={e => update('social', { facebook: e.target.value })} placeholder="Facebook URL" className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="flex items-center gap-2"><Youtube className="w-4 h-4 text-slate-400" /><Input value={settings.social.youtube} onChange={e => update('social', { youtube: e.target.value })} placeholder="YouTube URL" className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
              <div className="flex items-center gap-2"><Twitter className="w-4 h-4 text-slate-400" /><Input value={settings.social.twitter} onChange={e => update('social', { twitter: e.target.value })} placeholder="X / Twitter URL" className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
            </div>
          </Card>
        </TabsContent>

        {/* Email Settings */}
        <TabsContent value="email">
          <Card className="bg-slate-800/50 border-slate-700 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Email Settings</h2>
            <Separator className="bg-slate-700" />
            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Subject Line Prefix</Label>
                <Input value={settings.email.subjectPrefix} onChange={e => update('email', { subjectPrefix: e.target.value })} placeholder="e.g. [MRS] or 🚂 MRS:" className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" />
                <p className="text-xs text-slate-400 mt-1">This text is automatically prepended to every newsletter subject line</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div><Label className="text-slate-300">From Name</Label><Input value={settings.email.fromName} onChange={e => update('email', { fromName: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" /></div>
                <div><Label className="text-slate-300">Reply-To Email</Label><Input value={settings.email.replyTo} onChange={e => update('email', { replyTo: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" placeholder="hello@..." /></div>
              </div>
              <div>
                <Label className="text-slate-300">Default Footer Text</Label>
                <Textarea value={settings.email.defaultFooterText} onChange={e => update('email', { defaultFooterText: e.target.value })} className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" rows={3} placeholder="You're receiving this because you signed up at modelrailwayscenes.com..." />
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Brand Colours */}
        <TabsContent value="brand">
          <Card className="bg-slate-800/50 border-slate-700 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Brand Colour Presets</h2>
            <p className="text-sm text-slate-400">Click a brand profile to customise its colours</p>
            <Separator className="bg-slate-700" />

            {editingBrand ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{BRAND_PROFILES.find(b => b.id === editingBrand)?.name} — Edit Colours</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="border-slate-700 hover:bg-slate-800" onClick={() => setEditingBrand(null)}>Cancel</Button>
                    <Button size="sm" onClick={saveBrandOverride} className="bg-teal-500 hover:bg-teal-600 text-black font-medium">Save Colours</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {Object.entries(brandColors).map(([key, val]) => (
                    <div key={key}>
                      <Label className="text-xs text-slate-300 capitalize">{key.replace(/([A-Z])/g, ' $1')}</Label>
                      <div className="flex items-center gap-2 mt-1">
                        <input type="color" value={val} onChange={e => setBrandColors(c => ({ ...c, [key]: e.target.value }))} className="w-10 h-10 rounded cursor-pointer border-0 p-0" />
                        <Input value={val} onChange={e => setBrandColors(c => ({ ...c, [key]: e.target.value }))} className="font-mono text-xs h-8 bg-slate-800/50 border-slate-700 text-white" />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-4">
                  <Label className="text-xs text-slate-300">Preview</Label>
                  <div className="mt-2 rounded-lg overflow-hidden border border-slate-700" style={{ maxWidth: '400px' }}>
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
                    <Card key={profile.id} className="bg-slate-800/50 border-slate-700 overflow-hidden cursor-pointer hover:border-slate-600 transition-shadow" onClick={() => startEditBrand(profile.id)}>
                      <div className="h-14" style={{ background: `linear-gradient(135deg, ${profile.colors.primary}, ${profile.colors.accent1})` }} />
                      <div className="p-4 flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold text-sm text-white">{profile.name}</h3>
                          <p className="text-xs text-slate-400">{profile.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {hasOverride && <Badge variant="outline" className="border-slate-600 text-slate-300 text-xs">Customised</Badge>}
                          <Palette className="w-4 h-4 text-slate-400" />
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
          <Card className="bg-slate-800/50 border-slate-700 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Shopify Connection</h2>
            <p className="text-sm text-slate-400">Connect your Shopify store to pull products, collections, images, and blog posts into newsletters.</p>
            <Separator className="bg-slate-700" />

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Shopify Store URL</Label>
                <Input value={settings.shopify.storeUrl} onChange={e => update('shopify', { storeUrl: e.target.value })} placeholder="your-store.myshopify.com" className="mt-1.5 bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="p-4 bg-slate-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-white">Connection Status</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {settings.shopify.connected ? 'Connected and syncing products' : 'Not connected — enable Shopify to sync products, images, and collections'}
                    </p>
                  </div>
                  <Badge variant={settings.shopify.connected ? 'default' : 'secondary'} className={settings.shopify.connected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' : 'bg-slate-700 text-slate-400'}>
                    {settings.shopify.connected ? 'Connected' : 'Disconnected'}
                  </Badge>
                </div>
              </div>

              <div className="border border-slate-700 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-white">When connected, you can:</h3>
                <ul className="text-sm text-slate-400 space-y-2">
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-teal-400" /> Pull products by tag, type, or keyword into product grids</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-teal-400" /> Browse and insert images from your Shopify file library</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-teal-400" /> Feature entire collections with auto-populated blocks</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-teal-400" /> Embed or link to Shopify blog posts</li>
                  <li className="flex items-center gap-2"><Link2 className="w-3.5 h-3.5 text-teal-400" /> Push newsletter drafts directly to Shopify Email</li>
                </ul>
              </div>
            </div>
          </Card>
        </TabsContent>

        {/* Output */}
        <TabsContent value="output">
          <Card className="bg-slate-800/50 border-slate-700 p-6 space-y-5">
            <h2 className="text-lg font-semibold text-white">Output & Export</h2>
            <p className="text-sm text-slate-400">How newsletters get from this app to your email platform</p>
            <Separator className="bg-slate-700" />

            <div className="space-y-4">
              <div>
                <Label className="text-slate-300">Default Export Format</Label>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                  {[
                    { id: 'html_clipboard' as const, label: 'Copy HTML', desc: 'Copy email-safe HTML to clipboard for pasting into Shopify Email or Outlook' },
                    { id: 'html_download' as const, label: 'Download HTML', desc: 'Download as .html file for import into any email platform' },
                    { id: 'shopify_push' as const, label: 'Shopify Email', desc: 'Push draft directly to Shopify Email (requires connection)' },
                  ].map(opt => (
                    <Card
                      key={opt.id}
                      className={`bg-slate-800/50 border-slate-700 p-4 cursor-pointer transition-all ${settings.output.defaultFormat === opt.id ? 'ring-2 ring-teal-500' : 'hover:border-slate-600'}`}
                      onClick={() => update('output', { defaultFormat: opt.id })}
                    >
                      <h4 className="text-sm font-semibold text-white">{opt.label}</h4>
                      <p className="text-xs text-slate-400 mt-1">{opt.desc}</p>
                    </Card>
                  ))}
                </div>
              </div>
              <div>
                <Label className="text-slate-300">Email Max Width (px)</Label>
                <Input type="number" value={settings.output.emailWidth} onChange={e => update('output', { emailWidth: parseInt(e.target.value) || 600 })} className="mt-1.5 max-w-32 bg-slate-800/50 border-slate-700 text-white" />
                <p className="text-xs text-slate-400 mt-1">Standard is 600px. Max recommended: 700px.</p>
              </div>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
