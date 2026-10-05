// 極簡主題：日間與夜間（低亮度暖色）。夜間模式由使用者在首頁切換，也可依系統深色自動。
import { StyleSheet } from 'react-native';

export const colors = {
  day: { bg: '#f6f7f5', surface: '#ffffff', ink: '#1f2a24', ink2: '#4c5a52', ink3: '#7c887f', line: '#dfe4df', accent: '#2f6f5e', accentInk: '#ffffff', danger: '#a3261c' },
  night: { bg: '#15110d', surface: '#1f1913', ink: '#e6d8c6', ink2: '#b9a893', ink3: '#8a7b68', line: '#33291f', accent: '#c58a3a', accentInk: '#1b1208', danger: '#e07b6e' },
};
export type Palette = typeof colors.day;

export function makeStyles(p: Palette) {
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: p.bg },
    pad: { padding: 16, gap: 12 },
    h1: { fontSize: 24, fontWeight: '700', color: p.ink },
    h2: { fontSize: 18, fontWeight: '700', color: p.ink },
    p: { fontSize: 16, lineHeight: 24, color: p.ink },
    muted: { fontSize: 14, color: p.ink3 },
    card: { backgroundColor: p.surface, borderRadius: 14, padding: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: p.line },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
    bigGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    bigBtn: { flexBasis: '47%', flexGrow: 1, minHeight: 84, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, alignItems: 'center', justifyContent: 'center', padding: 12, gap: 4 },
    bigBtnActive: { backgroundColor: p.accent, borderColor: p.accent },
    bigBtnText: { fontSize: 18, fontWeight: '700', color: p.ink },
    bigBtnTextActive: { color: p.accentInk },
    bigBtnSub: { fontSize: 13, color: p.ink3 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 999, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface },
    chipActive: { backgroundColor: p.accent, borderColor: p.accent },
    chipText: { fontSize: 16, color: p.ink },
    chipTextActive: { color: p.accentInk },
    primary: { paddingVertical: 14, borderRadius: 12, backgroundColor: p.accent, alignItems: 'center' },
    primaryText: { color: p.accentInk, fontSize: 17, fontWeight: '600' },
    ghost: { paddingVertical: 12, borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: p.line },
    ghostText: { color: p.ink, fontSize: 16 },
    input: { borderWidth: 1, borderColor: p.line, borderRadius: 10, padding: 12, fontSize: 18, color: p.ink, backgroundColor: p.surface },
    timelineItem: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: p.line },
    time: { width: 52, fontSize: 14, color: p.ink3, fontVariant: ['tabular-nums'] },
    danger: { color: p.danger },
  });
}
