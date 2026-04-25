export type SectionType =
  | 'hero'
  | 'features'
  | 'benefits'
  | 'testimonials'
  | 'pricing'
  | 'cta'
  | 'faq'
  | 'header'
  | 'footer'
  | 'custom';

export interface LPField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'image_url' | 'color' | 'url' | 'list';
  placeholder: string;
  value?: string;
  listItems?: string[];
}

export interface LPSection {
  id: string;
  type: SectionType;
  label: string;
  fields: LPField[];
  htmlTemplate: string; // HTML with {{field_key}} placeholders
  description: string;
}

export interface LPTemplate {
  id: string;
  name: string;
  description: string;
  sourceUrl?: string;
  sections: LPSection[];
  globalStyles: string;   // CSS including @keyframes, animations, transitions
  globalScripts: string;  // Standalone JS reproducing all dynamic behavior
  cdnLinks: string[];     // External CDN URLs needed (e.g. AOS, GSAP)
  createdAt: string;
  updatedAt: string;
}

export interface LPProject {
  id: string;
  templateId: string;
  name: string;
  fieldValues: Record<string, string>; // sectionId_fieldKey -> value
  createdAt: string;
  updatedAt: string;
}

export interface AnalyzeRequest {
  url?: string;
  html?: string;
}

export interface AnalyzeResponse {
  sections: LPSection[];
  globalStyles: string;
  globalScripts: string;
  cdnLinks: string[];
  suggestedName: string;
  description: string;
}

export interface GenerateRequest {
  templateId: string;
  fieldValues: Record<string, string>;
}

export interface GenerateResponse {
  html: string;
}
