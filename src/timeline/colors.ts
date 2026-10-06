// 時間軸配色（設計稿 4）：課表綠、補習才藝紫、服藥紅、用餐灰、範本虛線。夜間用同色相、降低亮度。
import type { Palette } from '../ui/theme';
import type { ScheduleKind } from '../db/types';

export interface PlanColor { bg: string; border: string; ink: string; dashed?: boolean }

export function planColor(kind: ScheduleKind, p: Palette, night: boolean): PlanColor {
  switch (kind) {
    case 'routine': return { bg: 'transparent', border: p.ink3, ink: p.ink2, dashed: true };
    case 'class': return { bg: p.accentSoft, border: p.accent, ink: p.accent };
    case 'activity': return night ? { bg: '#2E2238', border: '#B79AD6', ink: '#D9C6EE' } : { bg: '#EDE6F4', border: '#6E4F91', ink: '#4F3570' };
    case 'medication': return { bg: p.dangerSoft, border: p.danger, ink: p.danger };
    case 'visit': return { bg: p.warmSoft, border: p.warm, ink: p.warm };
    case 'care':
    default: return { bg: p.surface2, border: p.line, ink: p.ink2 };
  }
}

export function pointColor(type: string, p: Palette): string {
  if (type.startsWith('feed.')) return p.accent;
  if (type.startsWith('diaper.')) return p.ink3;
  if (type === 'medication') return p.danger;
  if (type === 'temperature') return p.warm;
  if (type === 'task.attempt') return p.accent;
  return p.ink2;
}
