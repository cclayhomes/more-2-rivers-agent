import axios from 'axios';
import { load } from 'cheerio';
import Parser from 'rss-parser';
import fs from 'fs/promises';
import path from 'path';
import { CandidateItem, SourceConfig } from '../types';

const parser = new Parser();

const readJson = async <T>(filename: string): Promise<T> => {
  const filePath = path.resolve(process.cwd(), filename);
  const data = await fs.readFile(filePath, 'utf-8');
  return JSON.parse(data) as T;
};

export const loadSources = () => readJson<SourceConfig[]>('sources.json');
export const loadDenylist = () => readJson<string[]>('denylist.json');

const parseRss = async (source: SourceConfig): Promise<CandidateItem[]> => {
  const feed = await parser.parseURL(source.url);
  return (feed.items || []).map((item) => ({
    title: item.title || 'Untitled',
    url: item.link || source.url,
    publishedDate: item.pubDate ? new Date(item.pubDate) : undefined,
    snippet: item.contentSnippet,
    sourceName: source.name,
    textForMatch: `${item.title || ''} ${item.contentSnippet || ''}`
  }));
};

const parseHtml = async (source: SourceConfig): Promise<CandidateItem[]> => {
  const res = await axios.get(source.url, { timeout: 15000 });
  const $ = load(res.data);
  const selectors = source.selectors;
  if (!selectors) {
    return [];
  }

  return $(selectors.item)
    .toArray()
    .slice(0, 25)
    .map((el) => {
      const title = $(el).find(selectors.title).first().text().trim() || 'Untitled';
      const href = $(el).find(selectors.link).first().attr('href') || source.url;
      const url = href.startsWith('http') ? href : new URL(href, source.url).toString();
      const snippet = selectors.snippet
        ? $(el).find(selectors.snippet).first().text().trim()
        : '';

      return {
        title,
        url,
        snippet,
        sourceName: source.name,
        textForMatch: `${title} ${snippet}`
      };
    });
};

export const fetchCandidates = async (): Promise<CandidateItem[]> => {
  const sources = await loadSources();
  const results = await Promise.allSettled(
    sources.map((source) => (source.type === 'rss' ? parseRss(source) : parseHtml(source)))
  );

  return results.flatMap((r) => (r.status === 'fulfilled' ? r.value : []));
};
