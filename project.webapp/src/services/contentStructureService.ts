import { apiService } from './apiService';

export interface ContentStructureAnalysis {
  originalContent: string;
  structuredContent: string;
  seoScore: number;
  llmOptimizationScore: number;
  readabilityScore: number;
  suggestions: StructureSuggestion[];
  metadata: ContentMetadata;
  structuredData: StructuredData;
  fullPageHtml?: string;
  pageTitle?: string;
  pageDescription?: string;
}

export interface StructureSuggestion {
  type: 'heading' | 'paragraph' | 'list' | 'table' | 'quote' | 'code' | 'link' | 'image' | 'schema' | 'meta_description' | 'title' | 'meta_keywords' | 'meta_viewport' | 'og_title' | 'og_description' | 'canonical' | 'lang_attribute' | 'replace_b_with_strong' | 'semantic_html';
  priority: 'high' | 'medium' | 'low';
  description: string;
  implementation: string;
  impact: string;
  currentContent?: string;
  enhancedContent?: string;
  exactReplacement?: {
    find: string;
    replace: string;
  };
}

export interface ContentMetadata {
  title: string;
  description: string;
  keywords: string[];
  author: string;
  publishDate: string;
  lastModified: string;
  readingTime: number;
  wordCount: number;
  language: string;
  // Optional fields populated by the structural crawler for real page analytics
  headings?: number;
  paragraphs?: number;
  lists?: number;
  contentStructure?: {
    headings: Array<{ level: string; text: string; id: string; className: string }>;
    paragraphs: string[];
    lists: Array<{ type: string; items: string[] }>;
  };
  faqs?: Array<{ question: string; answer: string }>; // Suggested FAQs derived from page
}

export interface StructuredData {
  faqSchema?: FAQSchema;
  articleSchema?: ArticleSchema;
  howToSchema?: HowToSchema;
  breadcrumbSchema?: BreadcrumbSchema;
}

export interface FAQSchema {
  '@context': string;
  '@type': string;
  mainEntity: FAQItem[];
}

export interface FAQItem {
  '@type': string;
  name: string;
  acceptedAnswer: {
    '@type': string;
    text: string;
  };
}

export interface ArticleSchema {
  '@context': string;
  '@type': string;
  headline: string;
  description: string;
  author: {
    '@type': string;
    name: string;
  };
  publisher: {
    '@type': string;
    name: string;
  };
  datePublished: string;
  dateModified: string;
  mainEntityOfPage: {
    '@type': string;
    '@id': string;
  };
}

export interface HowToSchema {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  step: HowToStep[];
}

export interface HowToStep {
  '@type': string;
  name: string;
  text: string;
  url?: string;
  image?: string;
}

export interface BreadcrumbSchema {
  '@context': string;
  '@type': string;
  itemListElement: BreadcrumbItem[];
}

export interface BreadcrumbItem {
  '@type': string;
  position: number;
  name: string;
  item: string;
}

class ContentStructureService {
  async analyzeContentStructure(content: string, url?: string): Promise<ContentStructureAnalysis> {
    try {
      console.log('[ContentStructureService] Calling API with:', { contentLength: content.length, url });
      const response = await apiService.analyzeContentStructure(content, url);
      console.log('[ContentStructureService] Raw API response:', response);
      console.log('[ContentStructureService] Response type:', typeof response);
      console.log('[ContentStructureService] Response keys:', response ? Object.keys(response) : 'No response');
      
      // Handle the response structure from the backend
      if (response && response.success && response.analysis) {
        console.log('[ContentStructureService] Using response.analysis (success case)');
        return response.analysis;
      } else if (response && response.analysis) {
        // Handle case where success might be undefined but analysis exists
        console.log('[ContentStructureService] Using response.analysis (no success field)');
        return response.analysis;
      } else if (response && !response.success) {
        console.error('[ContentStructureService] API returned error:', response.error);
        throw new Error(response.error || 'Analysis failed');
      } else {
        console.error('[ContentStructureService] Invalid response format:', response);
        throw new Error('Invalid response format from server');
      }
    } catch (error) {
      console.error('[ContentStructureService] Error analyzing content structure:', error);
      throw error;
    }
  }



  async applyStructureSuggestions(content: string, suggestions: StructureSuggestion[]): Promise<string> {
    try {
      const response = await apiService.applyStructureSuggestions(content, suggestions);
      if (response.success) return response.improvedContent;
      throw new Error(response.error || 'Failed to apply suggestions');
    } catch (error) {
      console.error('Error applying structure suggestions:', error);
      return content;
    }
  }


}

export const contentStructureService = new ContentStructureService(); 