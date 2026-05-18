import { Marked } from 'marked';

const marked = new Marked({
  gfm: false,
  breaks: true,
  async: false,
});

export function renderMarkdown(source: string): string {
  return marked.parse(source) as string;
}
