// 設計系統（設計稿 v1「Tokens」）：日間米綠底深綠強調，夜間深褐底琥珀強調。
// 夜間由使用者在首頁切換，或跟隨系統深色。字級三段（標準、大、特大）由 factor 放大。
import { StyleSheet } from 'react-native';

export const colors = {
  day: {
    bg: '#F3F5F1', surface: '#FFFFFF', surface2: '#EAF0EC',
    ink: '#1B2620', ink2: '#46534B', ink3: '#66736A', line: '#DCE2DD',
    accent: '#2F6F5E', accentSoft: '#E1EEE8', accentInk: '#FFFFFF',
    warm: '#9A5B16', warmSoft: '#F6ECDD', danger: '#A3261C', dangerSoft: '#F8E5E2',
  },
  night: {
    bg: '#15110D', surface: '#201912', surface2: '#2B2219',
    ink: '#EADCC8', ink2: '#C9B79F', ink3: '#A08F79', line: '#372C21',
    accent: '#D99A4A', accentSoft: '#3A2A14', accentInk: '#1B1208',
    warm: '#D99A4A', warmSoft: '#3A2A14', danger: '#E8857A', dangerSoft: '#3D1F1A',
  },
};
export type Palette = typeof colors.day;

export type TextScale = 'standard' | 'large' | 'xlarge';
export const SCALE: Record<TextScale, number> = { standard: 1, large: 1.15, xlarge: 1.3 };
export const SCALE_LABEL: Record<TextScale, string> = { standard: '標準', large: '大', xlarge: '特大' };

export function makeStyles(p: Palette, f = 1) {
  const fs = (n: number) => Math.round(n * f);
  return StyleSheet.create({
    page: { flex: 1, backgroundColor: p.bg },
    pad: { padding: 16, paddingBottom: 32, gap: 12 },
    center: { alignItems: 'center', justifyContent: 'center' },
    topbar: { paddingHorizontal: 16, paddingBottom: 10, flexDirection: 'row', alignItems: 'center', gap: 10, minHeight: 56 },
    topTitle: { fontSize: fs(20), fontWeight: '700', color: p.ink, lineHeight: fs(26) },

    h1: { fontSize: fs(26), fontWeight: '700', color: p.ink, lineHeight: fs(34) },
    h2: { fontSize: fs(17), fontWeight: '700', color: p.ink, marginTop: 4 },
    label: { fontSize: fs(14), fontWeight: '600', color: p.ink2 },
    p: { fontSize: fs(17), lineHeight: fs(26), color: p.ink },
    body: { fontSize: fs(17), lineHeight: fs(30), color: p.ink },
    read: { fontSize: fs(18), lineHeight: fs(32), color: p.ink },
    muted: { fontSize: fs(14), lineHeight: fs(21), color: p.ink3 },
    step: { fontSize: fs(13), fontWeight: '700', color: p.accent, letterSpacing: 0.5 },
    link: { color: p.accent, fontWeight: '600', fontSize: fs(16), lineHeight: fs(23) },
    danger: { color: p.danger },

    card: { backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, gap: 6 },
    cardAccent: { borderColor: p.accent },
    cardWarm: { borderColor: p.warm, backgroundColor: p.warmSoft },
    row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    sp: { flex: 1, minWidth: 0 },

    tiles: { flexDirection: 'row', gap: 8 },
    tile: { flex: 1, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 10, gap: 4, minHeight: 96 },
    tileOn: { backgroundColor: p.warmSoft, borderColor: p.warm },
    tileK: { fontSize: fs(13), fontWeight: '600', color: p.ink2 },
    tileV: { fontSize: fs(19), fontWeight: '700', color: p.ink, lineHeight: fs(23), fontVariant: ['tabular-nums'] },
    tileS: { fontSize: fs(12), lineHeight: fs(16), color: p.ink3 },
    tileOnText: { color: p.warm },

    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    big: { flexGrow: 1, flexBasis: '45%', minHeight: 84, borderRadius: 16, backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 14, gap: 2 },
    bigThird: { flexBasis: '30%', minHeight: 72 },
    bigOn: { backgroundColor: p.accent, borderColor: p.accent },
    bigWarm: { backgroundColor: p.warmSoft, borderColor: p.warm },
    bigL: { fontSize: fs(18), fontWeight: '700', color: p.ink },
    bigS: { fontSize: fs(13), color: p.ink3 },
    bigOnText: { color: p.accentInk },
    bigWarmText: { color: p.warm },

    chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    chip: { minHeight: 44, paddingVertical: 9, paddingHorizontal: 16, borderRadius: 999, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, flexDirection: 'row', alignItems: 'center', gap: 6 },
    chipOn: { backgroundColor: p.accent, borderColor: p.accent },
    chipOff: { opacity: 0.5 },
    chipSm: { minHeight: 36, paddingVertical: 5, paddingHorizontal: 12 },
    chipText: { fontSize: fs(16), color: p.ink },
    chipTextSm: { fontSize: fs(14) },
    chipTextOn: { color: p.accentInk, fontWeight: '600' },

    primary: { minHeight: 56, borderRadius: 14, backgroundColor: p.accent, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    primaryDim: { opacity: 0.45 },
    primaryText: { color: p.accentInk, fontSize: fs(18), fontWeight: '700' },
    ghost: { minHeight: 52, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 8, paddingHorizontal: 16 },
    ghostText: { color: p.ink, fontSize: fs(17), fontWeight: '600' },
    ghostAc: { borderColor: p.accent },
    ghostAcText: { color: p.accent },
    ghostDgText: { color: p.danger },
    ghostPlain: { borderWidth: 0, backgroundColor: 'transparent' },
    iconBtn: { width: 44, height: 44, borderRadius: 12, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, alignItems: 'center', justifyContent: 'center' },
    iconBtnPlain: { borderWidth: 0, backgroundColor: 'transparent' },

    input: { minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, paddingHorizontal: 16, fontSize: fs(18), color: p.ink },
    numCard: { flexDirection: 'row', alignItems: 'baseline', gap: 8, paddingVertical: 10 },
    num: { fontSize: fs(44), fontWeight: '700', color: p.ink, fontVariant: ['tabular-nums'], padding: 0, minWidth: 130, lineHeight: fs(52) },
    numUnit: { fontSize: fs(20), fontWeight: '600', color: p.ink3 },
    field: { gap: 6 },
    pickrow: { minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
    pickText: { fontSize: fs(17), color: p.ink, flex: 1 },
    pickPh: { color: p.ink3 },

    lrow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, minHeight: 56, borderTopWidth: 1, borderTopColor: p.line },
    lrowFirst: { borderTopWidth: 0 },
    lrowSelected: { backgroundColor: p.accentSoft, marginHorizontal: -16, paddingHorizontal: 16 },
    lrowTime: { width: 48, fontSize: fs(14), color: p.ink3, fontVariant: ['tabular-nums'] },
    lrowMain: { fontSize: fs(16), fontWeight: '600', color: p.ink, lineHeight: fs(22) },
    lrowSub: { fontSize: fs(13), color: p.ink3, lineHeight: fs(18) },
    listCard: { backgroundColor: p.surface, borderWidth: 1, borderColor: p.line, borderRadius: 16, paddingVertical: 2, paddingHorizontal: 16 },

    badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 3, paddingHorizontal: 8, borderRadius: 999, backgroundColor: p.accentSoft, alignSelf: 'flex-start' },
    badgeText: { fontSize: fs(12), fontWeight: '600', color: p.accent },
    badgeWarm: { backgroundColor: p.warmSoft },
    badgeWarmText: { color: p.warm },
    badgeGray: { backgroundColor: p.surface2 },
    badgeGrayText: { color: p.ink2 },

    banner: { borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16, backgroundColor: p.warmSoft, borderWidth: 1, borderColor: p.warm, gap: 10 },
    bannerTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    bannerTitleText: { fontWeight: '700', color: p.warm, fontSize: fs(16), lineHeight: fs(22), flex: 1 },
    safety: { borderRadius: 16, paddingVertical: 12, paddingHorizontal: 16, backgroundColor: p.accentSoft, borderWidth: 1, borderColor: p.accent, flexDirection: 'row', gap: 12, alignItems: 'center' },

    toast: { position: 'absolute', left: 16, right: 16, bottom: 16, backgroundColor: p.ink, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 12, shadowOffset: { width: 0, height: 6 }, elevation: 6 },
    toastText: { color: p.bg, fontSize: fs(15), flex: 1 },
    toastUndo: { color: p.bg, fontWeight: '700', fontSize: fs(15) },

    prog: { height: 6, borderRadius: 3, backgroundColor: p.line, overflow: 'hidden' },
    progFill: { height: '100%', backgroundColor: p.accent, borderRadius: 3 },

    seg: { flexDirection: 'row', borderWidth: 1, borderColor: p.line, borderRadius: 12, overflow: 'hidden', backgroundColor: p.surface },
    segBtn: { flex: 1, minHeight: 46, alignItems: 'center', justifyContent: 'center' },
    segOn: { backgroundColor: p.accentSoft },
    segText: { fontSize: fs(15), color: p.ink2 },
    segTextOn: { color: p.accent, fontWeight: '700' },

    opt: { minHeight: 56, borderRadius: 14, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, paddingVertical: 12, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
    optOn: { borderColor: p.accent, backgroundColor: p.accentSoft },
    optText: { fontSize: fs(17), color: p.ink, flex: 1, lineHeight: fs(24) },
    optTextOn: { color: p.accent, fontWeight: '700' },
    radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: p.line, alignItems: 'center', justifyContent: 'center' },
    radioOn: { borderColor: p.accent },
    radioDot: { width: 11, height: 11, borderRadius: 6, backgroundColor: p.accent },

    axisEnds: { flexDirection: 'row', justifyContent: 'space-between' },
    axisEnd: { fontSize: fs(13), color: p.ink2, fontWeight: '600' },
    axisTrack: { height: 8, borderRadius: 4, backgroundColor: p.surface2, borderWidth: 1, borderColor: p.line, marginVertical: 8 },
    axisDot: { position: 'absolute', top: -7, width: 20, height: 20, borderRadius: 10, backgroundColor: p.accent, marginLeft: -10, borderWidth: 3, borderColor: p.surface },

    section: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
    sectionAction: { fontSize: fs(14), color: p.accent, fontWeight: '600' },
    footer: { paddingHorizontal: 16, paddingTop: 12, backgroundColor: p.bg, borderTopWidth: 1, borderTopColor: p.line, gap: 8 },
    handle: { width: 40, height: 5, borderRadius: 3, backgroundColor: p.line, alignSelf: 'center', marginTop: 10 },

    summary: { flexDirection: 'row', paddingVertical: 12, paddingHorizontal: 8 },
    summaryCell: { flex: 1, alignItems: 'center', borderLeftWidth: 1, borderLeftColor: p.line, gap: 2 },
    summaryCellFirst: { borderLeftWidth: 0 },
    summaryV: { fontSize: fs(17), fontWeight: '700', color: p.ink },
    summaryK: { fontSize: fs(12), color: p.ink3 },
  });
}

export type Styles = ReturnType<typeof makeStyles>;
