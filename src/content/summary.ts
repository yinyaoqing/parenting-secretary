// 卡片的「這週一句話」：取內文第一段的第一句（到第一個句號），不另外撰寫，避免改寫原文的意思。
import type { ContentCard } from './types';

export function firstLine(c: Pick<ContentCard, 'body'>, max = 70): string {
  const para = c.body.split(/\n+/).map((s) => s.trim()).find((s) => s.length > 0) ?? '';
  const stripped = para.replace(/^這週的樣子：/, '');
  const i = stripped.search(/[。！？]/);
  const sent = i >= 0 ? stripped.slice(0, i + 1) : stripped;
  return sent.length > max ? `${sent.slice(0, max)}…` : sent;
}

// 內文分段：第一段當摘要，其餘段落可折疊；段首「標題：」拿來當折疊標題。
export function sections(body: string): { title: string; text: string }[] {
  const paras = body.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return paras.map((p, i) => {
    const m = /^([^：。\n]{1,14})：/.exec(p);
    return { title: m ? m[1] : i === 0 ? '重點' : `第 ${i + 1} 段`, text: p };
  });
}
