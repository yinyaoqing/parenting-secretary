// 如廁訓練任務（第一版唯一的任務，擁有者決定 2026-10-06）。純函式與原文，不碰資料庫，可用 node 測試。
// 內容逐字引用國健署孕產兒關懷網站「和尿布說掰掰～如廁訓練」（政府網站資料開放宣告，A1）。
// 原則：準備度由家長自己勾、APP 不判斷；只數次數、不算百分比、不比常模（R1）；沒有挑戰、排行或點數。
// 任務狀態用事件記錄（task.start／task.pause／task.complete），沿用 append-only 與交接合併，不另開資料表。

export const TOILET_TASK = 'toilet';
export const TOILET_CARD_ID = 'health.toilet-training';
export const TOILET_MIN_DAYS = 548; // 官方開始時機「1歲半至2歲之間」，1 歲半前不顯示任務入口
export const TOILET_MAX_DAYS = 6 * 365;

export const SOURCE = {
  name: '國民健康署孕產兒關懷網站：和尿布說掰掰～如廁訓練',
  url: 'https://mammy.hpa.gov.tw/Home/NewsKBContent?id=3636&type=01',
  checkedAt: '2026-10-06',
};

export const TIMING = '1歲半至2歲之間，通常男孩會較女孩慢一些。';

export const READINESS = [
  '感覺得到膀胱脹和便意（例如突然安靜下來、臉部表情改變、跳腳、蹲下、拉扯褲子或用語言、手勢告訴大人）。',
  '尿濕了或解便了，會有所表示或讓大人知道。',
  '喜歡換上乾淨的尿布。',
  '瞭解「尿尿」、「嗯嗯」、「臭臭」、「便便」、「馬桶」、「乾的」、「乾淨」、「濕的」、「髒」的意思。',
  '看過同性別的大人或孩子（例如手足）使用馬桶，知道馬桶是做什麼用的。',
  '會自己拉下及拉上褲子。',
];

export const MINDSET = [
  '孩子揮別尿布是遲早的事，家長不必太急躁，應保持輕鬆自在的態度，像是跟孩子玩遊戲似的完成訓練。',
  '如果遇到阻力，勿跟孩子硬拗，可包回尿布等一、兩個星期後再試，如廁訓練終會成功的。',
  '孩子失誤時，以有點惋惜的態度，告訴他下次想尿或解便的時候，趕快告訴大人，大人會幫助他。然後幫他清理乾淨，並請他幫點小忙，例如把髒尿布丟進垃圾桶等，勿責罵或體罰孩子，家長強烈的情緒反應常常是訓練失敗的主要原因。',
  '即使已經成功的達成訓練，孩子仍會有幾個月的時間偶有「意外」發生，這是正常現象，勿苛責孩子，冷靜、淡然處理即可。',
];

export const TIPS = [
  '買了小馬桶後，先將它放在孩子常遊戲的地方，鼓勵他常常坐在上面，時間長短不拘，讓孩子逐漸熟悉它，視它為所有物。',
  '注意孩子想小便或大便的跡象，或利用午睡剛睡醒或是飯後20-30分鐘的好時機，帶他到小馬桶處，鼓勵他脫下尿布坐上去，尿（或便）在裡面。',
  '當孩子已經有一半的機率成功時，可以開始不穿尿布，改穿寬鬆的褲子，讓他練習自己拉下、拉上褲子，尿布只在午睡或夜裡才使用。',
];

export const SMALL_TIPS = [
  '唸1、2本有關如廁訓練的故事書給孩子聽。',
  '讓孩子跟1、2位已經達成訓練的孩子一起玩，並看著別的孩子使用小馬桶。',
  '不要選擇孩子正處於反抗期或生病時開始訓練。',
  '不要一直嘮嘮叨叨的提醒、催促孩子，只有在他顯示出有尿意或便意時才帶他去坐小馬桶。',
  '不要強制孩子坐上小馬桶；孩子不想坐了，就應該讓他起來；即使孩子未抗拒，坐了5分鐘還解不出來，也應該讓他起來。',
  '孩子肯合作就應該誇獎他，如果解出，更應同時給予精神鼓勵和實質上的獎勵（例如外出散步、貼紙等），可以有效的提高成功機率，不要怕物質獎勵寵壞孩子。',
];

export const PAUSE_QUOTE = MINDSET[1];

// ---------- 練習紀錄 ----------
export type Outcome = 'pee' | 'poo' | 'none' | 'refused' | 'accident';
export const OUTCOMES: { key: Outcome; label: string }[] = [
  { key: 'pee', label: '有尿' },
  { key: 'poo', label: '有便' },
  { key: 'none', label: '沒尿' },
  { key: 'refused', label: '不想坐' },
  { key: 'accident', label: '尿在褲子' },
];
export const OUTCOME_LABEL: Record<Outcome, string> = Object.fromEntries(OUTCOMES.map((o) => [o.key, o.label])) as Record<Outcome, string>;

export type TaskEventType = 'task.start' | 'task.pause' | 'task.complete' | 'task.attempt';
export interface TaskEventLike { type: string; startAt: string; payload: Record<string, unknown> }

export type TaskStatus = { state: 'none' } | { state: 'active' | 'paused' | 'done'; since: string };

// 最後一筆生命週期事件決定狀態。
export function taskStatus(events: TaskEventLike[], task = TOILET_TASK): TaskStatus {
  const life = events
    .filter((e) => (e.type === 'task.start' || e.type === 'task.pause' || e.type === 'task.complete') && e.payload.task === task)
    .sort((a, b) => b.startAt.localeCompare(a.startAt));
  const last = life[0];
  if (!last) return { state: 'none' };
  const state = last.type === 'task.start' ? 'active' : last.type === 'task.pause' ? 'paused' : 'done';
  return { state, since: last.startAt };
}

export interface WeekCounts { total: number; byOutcome: Record<Outcome, number> }

// 只數次數：這段時間坐了幾次、各結果幾次。不算比例。
export function countAttempts(events: TaskEventLike[], fromIso: string, task = TOILET_TASK): WeekCounts {
  const byOutcome: Record<Outcome, number> = { pee: 0, poo: 0, none: 0, refused: 0, accident: 0 };
  let total = 0;
  for (const e of events) {
    if (e.type !== 'task.attempt' || e.payload.task !== task || e.startAt < fromIso) continue;
    const o = e.payload.outcome as Outcome;
    if (o in byOutcome) byOutcome[o]++;
    total++;
  }
  return { total, byOutcome };
}
