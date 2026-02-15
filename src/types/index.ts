export type DraftType = 'DEV' | 'SCHOOL' | 'INFRA' | 'EVENT' | 'MARKET' | 'LISTINGS' | 'NEWS';
export type DraftStatus = 'QUEUED' | 'APPROVED' | 'REJECTED' | 'POSTED';

export interface SourceConfig {
  name: string;
  type: 'rss' | 'html';
  url: string;
  selectors?: {
    item: string;
    title: string;
    link: string;
    snippet?: string;
    publishedDate?: string;
  };
}

export interface CandidateItem {
  title: string;
  url: string;
  publishedDate?: Date;
  snippet?: string;
  sourceName: string;
  textForMatch: string;
}

export interface DraftContent {
  type: DraftType;
  headline: string;
  bullets: string[];
  localContext: string;
}
