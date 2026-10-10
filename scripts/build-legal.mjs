#!/usr/bin/env node
// 把 docs/legal 的隱私權政策與服務條款轉成網頁，放到 docs/data/（GitHub Pages 網站根目錄），並產生支援頁。
// 商店要求的三個網址：
//   隱私權政策  https://yinyaoqing.github.io/parenting-secretary/privacy.html
//   服務條款    https://yinyaoqing.github.io/parenting-secretary/terms.html
//   支援        https://yinyaoqing.github.io/parenting-secretary/support.html
// 只支援這兩份文件用到的 Markdown：標題、段落、清單、表格、引言、粗體、連結。
// 文件第一個引言區塊是給擁有者的草稿說明，不放上網頁。
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const OUT = join(ROOT, 'docs', 'data');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '<a href="$2">$1</a>');

export function mdToHtml(md) {
  const lines = md.replace(/\r/g, '').split('\n');
  const out = []; let i = 0; let droppedNote = false;
  while (i < lines.length) {
    const l = lines[i];
    if (!l.trim()) { i++; continue; }
    if (l.startsWith('>')) { const buf = []; while (i < lines.length && lines[i].startsWith('>')) buf.push(lines[i++].replace(/^>\s?/, '')); if (!droppedNote) { droppedNote = true; continue; } out.push(`<blockquote>${inline(buf.join(' '))}</blockquote>`); continue; }
    const h = l.match(/^(#{1,3})\s+(.*)$/); if (h) { out.push(`<h${h[1].length}>${inline(h[2].replace(/（草稿）/, ''))}</h${h[1].length}>`); i++; continue; }
    if (l.startsWith('|')) {
      const rows = []; while (i < lines.length && lines[i].startsWith('|')) rows.push(lines[i++]);
      const cells = (r) => r.replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
      const [head, , ...body] = rows;
      out.push(`<table><thead><tr>${cells(head).map((c) => `<th>${inline(c)}</th>`).join('')}</tr></thead><tbody>${body.map((r) => `<tr>${cells(r).map((c) => `<td>${inline(c)}</td>`).join('')}</tr>`).join('')}</tbody></table>`);
      continue;
    }
    if (/^(-|\d+\.)\s/.test(l)) {
      const ordered = /^\d+\./.test(l); const items = [];
      while (i < lines.length && /^(-|\d+\.)\s/.test(lines[i])) items.push(lines[i++].replace(/^(-|\d+\.)\s+/, ''));
      out.push(`<${ordered ? 'ol' : 'ul'}>${items.map((t) => `<li>${inline(t)}</li>`).join('')}</${ordered ? 'ol' : 'ul'}>`);
      continue;
    }
    const buf = []; while (i < lines.length && lines[i].trim() && !/^(#|\||>|-\s|\d+\.\s)/.test(lines[i])) buf.push(lines[i++]);
    out.push(`<p>${inline(buf.join(''))}</p>`);
  }
  return out.join('\n');
}

const page = (title, body) => `<!doctype html>
<html lang="zh-Hant-TW"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}｜育村</title>
<style>
:root{--bg:#F3F5F1;--fg:#1F2A22;--muted:#56645A;--line:#D5DDD6;--accent:#2F6F5E}
@media (prefers-color-scheme:dark){:root{--bg:#15110D;--fg:#F1E9DE;--muted:#C2B5A3;--line:#3A2E22;--accent:#D99A4A}}
body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.75 -apple-system,"PingFang TC","Noto Sans TC",sans-serif}
main{max-width:720px;margin:0 auto;padding:24px 16px 64px}
h1{font-size:26px;line-height:1.3}h2{font-size:19px;margin-top:32px}
a{color:var(--accent)}table{border-collapse:collapse;width:100%;display:block;overflow-x:auto;font-size:15px}
th,td{border:1px solid var(--line);padding:8px;text-align:left;vertical-align:top}
blockquote{margin:0;padding:8px 16px;border-left:4px solid var(--line);color:var(--muted)}
nav{font-size:14px;color:var(--muted)}
</style></head><body><main>
<nav><a href="privacy.html">隱私權政策</a> · <a href="terms.html">服務條款</a> · <a href="support.html">支援</a></nav>
${body}
</main></body></html>
`;

mkdirSync(OUT, { recursive: true });
for (const [src, dst, title] of [['privacy-policy.md', 'privacy.html', '隱私權政策'], ['terms.md', 'terms.html', '服務條款']]) {
  writeFileSync(join(OUT, dst), page(title, mdToHtml(readFileSync(join(ROOT, 'docs', 'legal', src), 'utf8'))));
  console.log(`docs/data/${dst}`);
}
const contact = (readFileSync(join(ROOT, 'docs', 'legal', 'privacy-policy.md'), 'utf8').match(/聯絡方式：([^\s。]+)/) ?? [])[1] ?? '[聯絡信箱]';
writeFileSync(join(OUT, 'support.html'), page('支援', mdToHtml(`# 育村 支援

## 聯絡

有問題、建議或發現錯誤，請寫信到 ${contact}。信裡請附上手機型號、系統版本與 APP 版本（設定頁最下方）。請不要在信裡寫孩子的紀錄內容。

## 常見問題

- **資料存在哪裡？** 只存在你的手機。沒有帳號、沒有伺服器，開發者看不到你的紀錄。
- **換手機怎麼辦？** 在「設定 › 資料」匯出加密備份檔，到新手機匯入。忘記備份密碼就無法還原。
- **怎麼和家人一起記？** 在「設定 › 同步與交接」面對面掃一次配對 QR code，之後用 QR code 或交接檔交換紀錄，不經任何伺服器。
- **鄰里小組怎麼用？** 在「育村」分頁建立小組，請其他家庭當面掃加入碼。有人新增或修改行程後，按「把行程傳給其他家庭」，用 LINE 傳出小組檔，對方點開就合併。小組只交換行程，不交換孩子的紀錄。
- **收到的交接檔打不開？** 先確認兩支手機已經配對。點檔案沒有開啟 APP 時，到「同步與交接」按「匯入交接檔」選檔案。
- **提醒不準時？** 到「設定 › 提醒 › 通知健康檢查」看權限與準時度。Android 請打開「鬧鐘與提醒」權限並關閉電池最佳化。
- **APP 會判斷孩子是不是生病嗎？** 不會。APP 只做紀錄、提醒與官方衛教連結，不診斷、不判讀。孩子不舒服請就醫，緊急狀況撥 119。
`)));
console.log('docs/data/support.html');
