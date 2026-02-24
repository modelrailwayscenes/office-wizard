import { Newsletter, WizardState } from '@/modules/newsletter/types/newsletter';

const STORAGE_KEY = 'mrs_newsletters';

export function getNewsletters(): Newsletter[] {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

export function saveNewsletter(newsletter: Newsletter): void {
  const newsletters = getNewsletters();
  const idx = newsletters.findIndex(n => n.id === newsletter.id);
  if (idx >= 0) newsletters[idx] = newsletter;
  else newsletters.unshift(newsletter);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newsletters));
}

export function deleteNewsletter(id: string): void {
  const newsletters = getNewsletters().filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(newsletters));
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function getInitialWizardState(): WizardState {
  return {
    step: 1,
    metadata: { title: '', subject: '', previewText: '', campaignTag: '', themeFocus: 'new_releases' },
    templateId: null,
    brandStyleId: 'classic_mrs',
    content: { headline: '', heroImage: '', introParagraph: '', discountCode: '', storyText: '', videoUrl: '' },
    selectedBlocks: [],
    layoutDensity: 'standard',
  };
}
