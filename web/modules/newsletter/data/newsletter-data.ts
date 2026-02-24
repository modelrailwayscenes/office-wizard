import { BlockDefinition, BrandProfile, NewsletterTemplate } from '@/modules/newsletter/types/newsletter';

export const BLOCK_LIBRARY: BlockDefinition[] = [
  // Hero blocks
  {
    type: 'hero_overlay', name: 'Hero Image + Overlay', category: 'Hero',
    description: 'Large hero image with text overlay and CTA', icon: 'Image',
    defaultContent: { headline: 'Bring Your Layout to Life', subheadline: 'New scenic details for realistic model railway scenes', buttonText: 'Shop Now', buttonLink: '#', image: '' },
    defaultSettings: { paddingTop: 40, paddingBottom: 40, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  {
    type: 'hero_below', name: 'Hero Image + Below Copy', category: 'Hero',
    description: 'Image at top with headline and text below', icon: 'LayoutTemplate',
    defaultContent: { headline: 'This Month at MRS', paragraph: 'Discover our latest additions...', buttonText: 'Explore', image: '' },
    defaultSettings: { paddingTop: 0, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  {
    type: 'hero_split', name: 'Split Hero', category: 'Hero',
    description: 'Image left, text right (stacks on mobile)', icon: 'Columns',
    defaultContent: { headline: 'Featured Collection', paragraph: 'Hand-picked scenic details...', buttonText: 'View Collection', image: '' },
    defaultSettings: { paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0 },
  },
  {
    type: 'cinematic_banner', name: 'Cinematic Banner', category: 'Hero',
    description: 'Dark overlay with dramatic typography', icon: 'Film',
    defaultContent: { headline: 'Scene of the Month', subheadline: 'A journey through miniature landscapes', image: '' },
    defaultSettings: { paddingTop: 60, paddingBottom: 60, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  // Product blocks
  {
    type: 'product_card', name: 'Featured Product', category: 'Products',
    description: 'Single product with image, price and CTA', icon: 'Package',
    defaultContent: { title: 'Product Name', price: '£12.99', description: 'A beautiful scenic detail...', buttonText: 'Shop Now', image: '' },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0 },
  },
  {
    type: 'product_grid_2', name: '2-Column Product Grid', category: 'Products',
    description: 'Two products side by side', icon: 'LayoutGrid',
    defaultContent: { products: [{ title: 'Product 1', price: '£9.99', image: '' }, { title: 'Product 2', price: '£14.99', image: '' }] },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 16 },
  },
  {
    type: 'product_grid_3', name: '3-Column Product Grid', category: 'Products',
    description: 'Three products in catalogue style', icon: 'Grid3x3',
    defaultContent: { products: [{ title: 'Product 1', price: '£9.99', image: '' }, { title: 'Product 2', price: '£14.99', image: '' }, { title: 'Product 3', price: '£11.99', image: '' }] },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 16 },
  },
  {
    type: 'product_spotlight', name: 'Product Spotlight', category: 'Products',
    description: 'Featured product with review quote', icon: 'Star',
    defaultContent: { title: 'Product Name', price: '£19.99', description: 'Our best seller...', quote: '"Absolutely stunning detail!" — Customer', buttonText: 'Shop Now', image: '' },
    defaultSettings: { paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0 },
  },
  // Storytelling blocks
  {
    type: 'scene_story', name: 'Scene Spotlight', category: 'Storytelling',
    description: 'Large scenic photo with story paragraph', icon: 'BookOpen',
    defaultContent: { image: '', headline: 'A Corner of the Cotswolds', story: 'This month we explore a quintessential English village scene...', buttonText: 'Read More' },
    defaultSettings: { paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0 },
  },
  {
    type: 'workshop', name: 'Workshop Block', category: 'Storytelling',
    description: 'Behind-the-scenes with two images', icon: 'Wrench',
    defaultContent: { image1: '', image2: '', text: 'A peek inside the workshop this month...' },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0 },
  },
  {
    type: 'tip_of_month', name: 'Tip of the Month', category: 'Storytelling',
    description: 'Highlighted tip box with icon', icon: 'Lightbulb',
    defaultContent: { title: 'Tip of the Month', tip: 'Use PVA glue thinned with water for realistic ballast adhesion.' },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, borderRadius: 8 },
  },
  // Text blocks
  {
    type: 'heading_paragraph', name: 'Heading + Text', category: 'Text',
    description: 'Simple heading with paragraph', icon: 'Type',
    defaultContent: { heading: 'Section Title', paragraph: 'Lorem ipsum dolor sit amet...' },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'left' },
  },
  {
    type: 'quote', name: 'Quote Block', category: 'Text',
    description: 'Large quotation marks style', icon: 'Quote',
    defaultContent: { quote: '"The best scenic supplies I\'ve ever used."', attribution: '— A happy customer' },
    defaultSettings: { paddingTop: 32, paddingBottom: 32, paddingLeft: 32, paddingRight: 32, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  // Promotional blocks
  {
    type: 'discount_code', name: 'Discount Code', category: 'Promotional',
    description: 'Bold code box with expiry and CTA', icon: 'Ticket',
    defaultContent: { code: 'SCENERY20', description: '20% off all scenic details', expiry: 'Ends Sunday', buttonText: 'Shop Now' },
    defaultSettings: { paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center', borderRadius: 8 },
  },
  {
    type: 'flash_sale', name: 'Flash Sale Banner', category: 'Promotional',
    description: 'Bold colours with limited time badge', icon: 'Zap',
    defaultContent: { headline: 'Flash Sale!', subtitle: 'Limited time only', buttonText: 'Shop Sale' },
    defaultSettings: { paddingTop: 32, paddingBottom: 32, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  // Social blocks
  {
    type: 'social_links', name: 'Follow Us', category: 'Social',
    description: 'Social media icons row', icon: 'Share2',
    defaultContent: { text: 'Follow us for daily inspiration', links: { instagram: '#', facebook: '#', youtube: '#' } },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  // Footer blocks
  {
    type: 'footer_premium', name: 'Premium Footer', category: 'Footer',
    description: 'Full footer with logo, links, social, contact', icon: 'PanelBottom',
    defaultContent: { companyName: 'Model Railway Scenes', tagline: 'Crafting miniature worlds since 2018', links: ['Shop', 'About', 'Contact', 'FAQ'] },
    defaultSettings: { paddingTop: 40, paddingBottom: 40, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
  {
    type: 'footer_minimal', name: 'Minimal Footer', category: 'Footer',
    description: 'Simple footer with unsubscribe', icon: 'Minus',
    defaultContent: { companyName: 'Model Railway Scenes', address: 'United Kingdom' },
    defaultSettings: { paddingTop: 24, paddingBottom: 24, paddingLeft: 24, paddingRight: 24, marginTop: 0, marginBottom: 0, textAlign: 'center' },
  },
];

export const BRAND_PROFILES: BrandProfile[] = [
  {
    id: 'classic_mrs', name: 'Classic MRS', description: 'Warm, professional heritage look',
    colors: { primary: '#2D5F4A', secondary: '#F5F0E8', accent1: '#C8963E', accent2: '#8B7355', background: '#FAF8F5', cardBg: '#FFFFFF', text: '#1F2937', buttonBg: '#2D5F4A', buttonText: '#FFFFFF' },
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
  {
    id: 'dark_cinematic', name: 'Dark Cinematic', description: 'Moody, dramatic presentation',
    colors: { primary: '#E8D5B0', secondary: '#1A1A2E', accent1: '#C8963E', accent2: '#6B7280', background: '#0F0F1A', cardBg: '#1A1A2E', text: '#E5E7EB', buttonBg: '#C8963E', buttonText: '#0F0F1A' },
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
  {
    id: 'bright_catalogue', name: 'Bright Catalogue', description: 'Clean, modern product focus',
    colors: { primary: '#2563EB', secondary: '#F8FAFC', accent1: '#F59E0B', accent2: '#10B981', background: '#FFFFFF', cardBg: '#F8FAFC', text: '#1E293B', buttonBg: '#2563EB', buttonText: '#FFFFFF' },
    headingFont: 'Inter', bodyFont: 'Inter',
  },
  {
    id: 'vintage_poster', name: 'Vintage Railway Poster', description: 'Retro railway advertising style',
    colors: { primary: '#8B2500', secondary: '#F5E6D0', accent1: '#2E5A3E', accent2: '#D4A373', background: '#FDF8F0', cardBg: '#F5E6D0', text: '#3D2B1F', buttonBg: '#8B2500', buttonText: '#FDF8F0' },
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
  {
    id: 'christmas', name: 'Christmas Edition', description: 'Festive seasonal theme',
    colors: { primary: '#B91C1C', secondary: '#1A472A', accent1: '#D4AF37', accent2: '#F5F0E8', background: '#FDF2F2', cardBg: '#FFFFFF', text: '#1F2937', buttonBg: '#B91C1C', buttonText: '#FFFFFF' },
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
  {
    id: 'summer', name: 'Summer Edition', description: 'Bright, warm seasonal look',
    colors: { primary: '#0369A1', secondary: '#FEF9C3', accent1: '#F59E0B', accent2: '#10B981', background: '#FFFBEB', cardBg: '#FFFFFF', text: '#1E293B', buttonBg: '#0369A1', buttonText: '#FFFFFF' },
    headingFont: 'Playfair Display', bodyFont: 'Inter',
  },
];

export const TEMPLATES: NewsletterTemplate[] = [
  {
    id: 'monthly_roundup', name: 'Monthly Roundup', description: 'The standard monthly newsletter with a mix of content',
    defaultBlocks: ['hero_overlay', 'heading_paragraph', 'product_grid_3', 'scene_story', 'tip_of_month', 'discount_code', 'social_links', 'footer_premium'],
    recommendedBrand: 'classic_mrs', defaultDensity: 'standard',
  },
  {
    id: 'new_arrivals', name: 'New Arrivals', description: 'Showcase new products in catalogue style',
    defaultBlocks: ['hero_below', 'product_grid_3', 'product_spotlight', 'product_grid_2', 'social_links', 'footer_minimal'],
    recommendedBrand: 'bright_catalogue', defaultDensity: 'catalogue',
  },
  {
    id: 'scene_spotlight', name: 'Scene Spotlight', description: 'Story-driven issue featuring a scene build',
    defaultBlocks: ['cinematic_banner', 'scene_story', 'workshop', 'product_grid_2', 'quote', 'social_links', 'footer_premium'],
    recommendedBrand: 'dark_cinematic', defaultDensity: 'spacious',
  },
  {
    id: 'seasonal', name: 'Seasonal Campaign', description: 'Themed seasonal issue with promotional content',
    defaultBlocks: ['hero_overlay', 'heading_paragraph', 'product_grid_3', 'discount_code', 'flash_sale', 'social_links', 'footer_premium'],
    recommendedBrand: 'christmas', defaultDensity: 'standard',
  },
  {
    id: 'tutorial', name: 'Tutorial Issue', description: 'How-to focused with step-by-step content',
    defaultBlocks: ['hero_split', 'heading_paragraph', 'tip_of_month', 'product_grid_2', 'quote', 'social_links', 'footer_minimal'],
    recommendedBrand: 'classic_mrs', defaultDensity: 'spacious',
  },
  {
    id: 'sale_clearance', name: 'Sale & Clearance', description: 'Bold promotional issue for sales events',
    defaultBlocks: ['flash_sale', 'product_grid_3', 'discount_code', 'product_grid_2', 'social_links', 'footer_minimal'],
    recommendedBrand: 'bright_catalogue', defaultDensity: 'compact',
  },
];

export const BLOCK_CATEGORIES = ['Hero', 'Products', 'Storytelling', 'Text', 'Promotional', 'Social', 'Footer'] as const;
