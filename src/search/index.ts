// 「問問看」官方內容檢索（規劃 4.8）：離線關鍵字與同義詞搜尋，只回內容卡裡的原文段落與來源。
// 不生成、不改寫、不回答「要不要就醫」。查詢含危急字詞時，結果最上方固定顯示 119 與就醫文字（固定文案，非判斷）。
// 純函式，可用 node 測試。

export interface SearchDoc { id: string; title: string; body: string; topicGroup: string; ageMinDays: number; ageMaxDays: number }
export interface SearchHit { id: string; title: string; topicGroup: string; snippet: string; score: number; inAge: boolean }

// 同義詞：家長的說法 → 卡片裡常用的詞。查詢展開後每個詞都比對。
export const SYNONYMS: Record<string, string[]> = {
  發燒: ['體溫', '高燒', '退燒', '耳溫', '額溫', '肛溫'],
  燒: ['發燒', '體溫'],
  拉肚子: ['腹瀉', '水便', '水瀉'],
  便秘: ['便祕', '排便', '糞便', '大便'],
  便祕: ['便秘', '排便', '糞便'],
  吐奶: ['溢奶', '嘔吐', '嗆奶'],
  溢奶: ['吐奶', '嗆奶'],
  哭: ['哭鬧', '哭聲', '安撫', '腸絞痛'],
  哭鬧: ['哭', '安撫', '腸絞痛'],
  不睡: ['入睡', '睡眠', '夜醒', '哄睡'],
  睡過夜: ['夜間睡眠', '夜醒', '夜裡'],
  夜奶: ['夜間', '夜裡', '餵奶'],
  奶量: ['毫升', 'ml', '喝奶', '餵奶', '厭奶'],
  厭奶: ['奶量', '喝奶'],
  副食品: ['離乳食', '泥', '手指食物', '食材'],
  過敏: ['致敏', '紅疹', '異位性'],
  紅屁股: ['尿布疹', '屁屁'],
  尿布疹: ['紅屁股', '屁屁'],
  長牙: ['乳牙', '出牙', '牙齒', '固齒器'],
  刷牙: ['口腔', '牙齒', '含氟'],
  趴睡: ['仰睡', '安全睡眠', '俯臥', '清醒趴臥'],
  翻身: ['俯臥', '清醒趴臥'],
  打針: ['疫苗', '接種', '預防針'],
  疫苗: ['接種', '預防針'],
  健檢: ['預防保健', '健康檢查', '篩檢'],
  補助: ['津貼', '托育', '給付'],
  津貼: ['補助', '育兒'],
  蚊子: ['蚊蟲', '叮咬', '防蚊'],
  跌倒: ['墜落', '撞到', '跌落'],
  燙傷: ['燒燙傷', '沖脫泡蓋送'],
  噎到: ['噎食', '異物', '哈姆立克'],
  噎: ['噎食', '異物'],
  戒尿布: ['如廁', '小馬桶', '馬桶'],
  如廁: ['戒尿布', '小馬桶'],
  奶嘴: ['安撫奶嘴', '戒奶嘴'],
  螢幕: ['電視', '手機', '平板', '3C'],
  憂鬱: ['情緒低落', '心情', '產後', '安心專線'],
  累: ['疲憊', '休息', '照顧者', '喘息'],
  餵母乳: ['哺乳', '親餵', '母乳'],
  親餵: ['哺乳', '母乳', '含乳'],
  擠奶: ['擠乳', '母乳保存', '儲乳'],
  配方奶: ['嬰兒配方', '沖調', '奶粉'],
  感冒: ['呼吸道', '鼻塞', '咳嗽', '流鼻水'],
  咳嗽: ['呼吸道', '痰', '喘鳴'],
  中耳炎: ['耳朵', '拉耳朵'],
  黃疸: ['黃金九色卡', '膽汁'],
  體重: ['生長', '生長曲線', '身高'],
  走路: ['扶站', '學步', '赤腳'],
  爬: ['爬行', '匍匐'],
  說話: ['語言', '牙牙學語', '詞彙'],
  托嬰: ['托育', '保母', '托嬰中心'],
  上班: ['職場', '回職場', '托育'],
};

// 危急字詞：固定顯示 119 與就醫文字。這不是判斷，是固定文案。
export const EMERGENCY_TERMS = ['發燒', '高燒', '呼吸', '喘', '抽搐', '痙攣', '抽筋', '誤食', '吞', '不醒', '叫不醒', '昏', '發紺', '發紫', '噎', '溺', '燙傷', '出血', '流血', '撞到頭', '摔', '癲癇', '過敏反應', '休克'];
export const EMERGENCY_TEXT = '孩子呼吸困難、臉色發紫、抽搐、叫不醒、嚴重過敏、大量出血，或 3 個月以下發燒，請立即撥打 119 或就醫。APP 不判斷是否需要就醫，以下只是相關的官方原文。';

const STOP = new Set(['的', '了', '嗎', '怎麼', '怎麼辦', '要', '可以', '會', '是', '不', '有', '要不要', '該', '如何', '什麼', '為什麼', '我', '寶寶', '孩子', '小孩', '一直', '很', '好', '多', '還是', '在', '和', '跟', '又', '都', '就', '呢', '啊', '請問', '請', '問']);

export function tokenize(q: string): string[] {
  const clean = q.replace(/[\s，,。.?？!！、:：;；()（）「」『』]+/g, ' ').trim().toLowerCase();
  if (!clean) return [];
  const words = clean.split(' ').filter(Boolean);
  const out = new Set<string>();
  for (const w of words) {
    // 同義詞表的鍵若出現在詞裡，整個鍵算一個詞
    for (const k of Object.keys(SYNONYMS)) if (w.includes(k)) out.add(k);
    // 英文或數字整個詞；中文用二字詞切分，去掉停用詞
    if (/^[a-z0-9]+$/.test(w)) { out.add(w); continue; }
    const chars = [...w].filter((c) => !STOP.has(c));
    const s = chars.join('');
    if (s.length === 1) out.add(s);
    for (let i = 0; i + 2 <= s.length; i++) { const bi = s.slice(i, i + 2); if (!STOP.has(bi)) out.add(bi); }
  }
  for (const w of [...out]) if (STOP.has(w)) out.delete(w);
  return [...out];
}

export function expand(tokens: string[]): { term: string; weight: number }[] {
  const out = new Map<string, number>();
  for (const t of tokens) {
    out.set(t, Math.max(out.get(t) ?? 0, 1));
    for (const s of SYNONYMS[t] ?? []) out.set(s, Math.max(out.get(s) ?? 0, 0.7));
  }
  return [...out].map(([term, weight]) => ({ term, weight }));
}

export function isEmergency(q: string): boolean {
  return EMERGENCY_TERMS.some((t) => q.includes(t));
}

function snippetAround(body: string, terms: string[]): string {
  const paras = body.split(/\n+/).filter(Boolean);
  let best = paras[0] ?? '';
  let bestN = -1;
  for (const p of paras) {
    const n = terms.reduce((a, t) => a + (p.includes(t) ? 1 : 0), 0);
    if (n > bestN) { bestN = n; best = p; }
  }
  const i = Math.max(0, Math.min(...terms.map((t) => best.indexOf(t)).filter((x) => x >= 0), best.length));
  const start = Math.max(0, i - 30);
  const s = best.slice(start, start + 120);
  return (start > 0 ? '…' : '') + s + (start + 120 < best.length ? '…' : '');
}

export function search(q: string, docs: SearchDoc[], ageDays: number | null, limit = 20): { emergency: boolean; hits: SearchHit[] } {
  const tokens = tokenize(q);
  const emergency = isEmergency(q);
  if (!tokens.length) return { emergency, hits: [] };
  const terms = expand(tokens);
  const hits: SearchHit[] = [];
  for (const d of docs) {
    let score = 0;
    const matched: string[] = [];
    for (const { term, weight } of terms) {
      const inTitle = d.title.includes(term);
      const inBody = d.body.includes(term);
      if (inTitle) score += 3 * weight;
      if (inBody) score += weight * Math.min(3, d.body.split(term).length - 1);
      if (inTitle || inBody) matched.push(term);
    }
    if (score <= 0) continue;
    const inAge = ageDays === null ? true : ageDays >= d.ageMinDays && ageDays <= d.ageMaxDays;
    if (d.topicGroup === 'safety') score += 1.5; // 安全層優先
    if (inAge) score += 1;
    hits.push({ id: d.id, title: d.title, topicGroup: d.topicGroup, snippet: snippetAround(d.body, matched), score, inAge });
  }
  hits.sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));
  return { emergency, hits: hits.slice(0, limit) };
}
