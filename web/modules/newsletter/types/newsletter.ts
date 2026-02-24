export type BlockType =
  | 'hero_overlay' | 'hero_below' | 'hero_split' | 'cinematic_banner'
  | 'product_card' | 'product_grid_2' | 'product_grid_3' | 'product_spotlight'
  | 'scene_story' | 'workshop' | 'tip_of_month' | 'before_after'
  | 'full_image' | 'gallery_2' | 'gallery_3' | 'community_showcase'
  | 'heading_paragraph' | 'quote' | 'faq'
  | 'discount_code' | 'flash_sale' | 'free_shipping'
  | 'category_grid' | 'social_links'
  | 'video_preview' | 'how_to_steps'
  | 'footer_premium' | 'footer_minimal';

export interface BlockDefinition {
  type: BlockType;
  name: string;
  category: string;
  description: string;
  icon: string;
  defaultContent: Record<string, any>;
  defaultSettings: BlockSettings;
}

export interface BlockSettings {
  paddingTop: number;
  paddingBottom: number;
  paddingLeft: number;
  paddingRight: number;
  marginTop: number;
  marginBottom: number;
  backgroundColor?: string;
  borderRadius?: number;
  borderWidth?: number;
  textAlign?: 'left' | 'center' | 'right';
  fullWidth?: boolean;
  hideOnMobile?: boolean;
}

export interface NewsletterBlock {
  id: string;
  type: BlockType;
  content: Record<string, any>;
  settings: BlockSettings;
}

export type TemplateId = 'monthly_roundup' | 'new_arrivals' | 'scene_spotlight' | 'seasonal' | 'tutorial' | 'sale_clearance';
export type BrandStyleId = 'classic_mrs' | 'dark_cinematic' | 'bright_catalogue' | 'vintage_poster' | 'christmas' | 'summer';
export type LayoutDensity = 'compact' | 'standard' | 'spacious' | 'catalogue' | 'minimal';
export type ThemeFocus = 'new_releases' | 'seasonal' | 'diorama' | 'workshop' | 'clearance';

export interface BrandProfile {
  id: BrandStyleId;
  name: string;
  description: string;
  colors: {
    primary: string;
    secondary: string;
    accent1: string;
    accent2: string;
    background: string;
    cardBg: string;
    text: string;
    buttonBg: string;
    buttonText: string;
  };
  headingFont: string;
  bodyFont: string;
}

export interface NewsletterTemplate {
  id: TemplateId;
  name: string;
  description: string;
  defaultBlocks: BlockType[];
  recommendedBrand: BrandStyleId;
  defaultDensity: LayoutDensity;
}

export interface Newsletter {
  id: string;
  title: string;
  subject: string;
  previewText: string;
  campaignTag: string;
  themeFocus: ThemeFocus;
  templateId: TemplateId;
  brandStyleId: BrandStyleId;
  layoutDensity: LayoutDensity;
  blocks: NewsletterBlock[];
  status: 'draft' | 'exported' | 'sent';
  createdAt: string;
  updatedAt: string;
}

export interface WizardState {
  step: number;
  metadata: {
    title: string;
    subject: string;
    previewText: string;
    campaignTag: string;
    themeFocus: ThemeFocus;
  };
  templateId: TemplateId | null;
  brandStyleId: BrandStyleId;
  content: {
    headline: string;
    heroImage: string;
    introParagraph: string;
    discountCode: string;
    storyText: string;
    videoUrl: string;
  };
  selectedBlocks: BlockType[];
  layoutDensity: LayoutDensity;
}
