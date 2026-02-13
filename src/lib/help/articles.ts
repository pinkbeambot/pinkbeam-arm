export interface HelpArticle {
  id: string;
  slug: string;
  title: string;
  summary: string;
  content: string;
  category: string;
}

export function searchArticles(query: string): HelpArticle[] {
  return [];
}

export function getFeaturedArticles(): HelpArticle[] {
  return [];
}
