import { useState } from 'react';
import { View, Text, Pressable, Linking } from 'react-native';
import { firstLine, sections } from '../../src/content/summary';
import { useLocalSearchParams } from 'expo-router';
import { cardById, GROUP_LABEL } from '../../src/content/loader';
import type { ContentCard, LicenseLevel } from '../../src/content/types';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Badge, Card, SafetyBox, Icon } from '../../src/ui/components';
import { Hero, artForCard } from '../../src/ui/art';
import type { TextScale } from '../../src/ui/theme';

const LICENSE_LABEL: Record<LicenseLevel, string> = { A1: '原文可引用', A2: '公眾領域，翻譯改寫', B: '重述並引用', C: '一句話結論加連結' };
const NEXT_SCALE: Record<TextScale, TextScale> = { standard: 'large', large: 'xlarge', xlarge: 'standard' };

function ageRangeLabel(c: ContentCard): string {
  const { ageMinDays: a, ageMaxDays: b } = c;
  if (a === 0 && b >= 360 && b <= 400) return '1 歲以下';
  if (b <= 90 && b - a <= 7) return `第 ${Math.floor(a / 7) + 1} 週`;
  const m = (d: number) => Math.round(d / 30.4375);
  if (m(b) <= 24) return `${m(a)}–${m(b)} 個月`;
  if (a === 0) return `${Math.round(m(b) / 12)} 歲以下`;
  return `${(m(a) / 12).toFixed(m(a) % 12 ? 1 : 0)}–${(m(b) / 12).toFixed(m(b) % 12 ? 1 : 0)} 歲`;
}

function orgOf(name: string): string { return name.split(/[：:（(]/)[0].trim(); }

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { styles, palette, scale, setScale } = useTheme();
  const c = id ? cardById(id) : undefined;
  const [openIdx, setOpenIdx] = useState<Set<number>>(new Set([0]));
  const [allOpen, setAllOpen] = useState(false);

  if (!c) return <View style={styles.page}><TopBar back /><Screen><Text style={styles.p}>找不到這張內容卡。</Text></Screen></View>;

  const foreign = c.foreignOnly || (c.translated && c.sources.every((s) => s.lang !== 'zh-TW'));
  const isSafety = c.topicGroup === 'safety';
  const primary = c.sources[0];
  const checked = c.sources.map((s) => s.checkedAt).sort().at(-1);

  return (
    <View style={styles.page}>
      <TopBar back right={
        <Pressable style={styles.iconBtn} onPress={() => setScale(NEXT_SCALE[scale])} accessibilityRole="button" accessibilityLabel="調整字級">
          <Text style={{ color: palette.ink, fontWeight: '700', fontSize: 15 }}>A<Text style={{ fontSize: 19 }}>A</Text></Text>
        </Pressable>
      } />
      <Screen style={{ paddingBottom: 40 }}>
        {artForCard(c.id, c.topicGroup) ? <Hero art={artForCard(c.id, c.topicGroup)!} height={200} /> : null}
        <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
          <Badge label={isSafety ? '安全內容' : GROUP_LABEL[c.topicGroup]} icon={isSafety ? 'shield' : undefined} />
          <Badge label={ageRangeLabel(c)} tone="gray" />
        </View>
        <Text style={[styles.h1, { fontSize: 28, lineHeight: 36 }]}>{c.title}</Text>
        <Text style={styles.muted}>{orgOf(primary.name)} · {LICENSE_LABEL[primary.license]}{checked ? ` · 查核 ${checked}` : ''}</Text>

        {foreign ? (
          <Card accent>
            <Text style={styles.muted}>本內容翻譯改寫自國外公開資料，原文連結見下方。台灣的健檢與篩檢時點以國健署為準。</Text>
          </Card>
        ) : null}

        {(() => {
          const secs = sections(c.body);
          // 安全內容與短卡全部展開；其餘卡片只開第一段，其他段落點標題展開（媽媽視角：半夜只看一句）。
          const fold = !isSafety && secs.length >= 3 && !allOpen;
          if (!fold) {
            return (
              <Card style={{ gap: 14, paddingVertical: 18, paddingHorizontal: 18 }}>
                {secs.map((p, i) => <Text key={i} style={styles.read}>{p.text}</Text>)}
              </Card>
            );
          }
          return (
            <>
              <Card style={{ backgroundColor: palette.accentSoft, borderColor: palette.accent, gap: 4 }}>
                <Text style={[styles.label, { color: palette.accent }]}>一句話</Text>
                <Text style={styles.read}>{firstLine(c)}</Text>
              </Card>
              <Card style={{ gap: 0, paddingVertical: 4 }}>
                {secs.map((p, i) => {
                  const isOpen = openIdx.has(i);
                  return (
                    <View key={i} style={{ borderTopWidth: i ? 1 : 0, borderTopColor: palette.line }}>
                      <Pressable onPress={() => setOpenIdx((cur) => { const n = new Set(cur); if (n.has(i)) n.delete(i); else n.add(i); return n; })} accessibilityRole="button" accessibilityState={{ expanded: isOpen }} style={[styles.row, { minHeight: 52, gap: 8 }]}>
                        <Text style={[styles.lrowMain, styles.sp]}>{p.title}</Text>
                        <Icon name={isOpen ? 'chevron-up' : 'chevron-down'} size={18} color={palette.ink3} />
                      </Pressable>
                      {isOpen ? <Text style={[styles.read, { paddingBottom: 14 }]}>{p.text}</Text> : null}
                    </View>
                  );
                })}
              </Card>
              <Pressable onPress={() => setAllOpen(true)} accessibilityRole="button"><Text style={[styles.link, { fontSize: 14 }]}>全部展開</Text></Pressable>
            </>
          );
        })()}

        {c.supplement ? (
          <Card>
            <Text style={styles.muted}>本產品補充（非原文）</Text>
            <Text style={styles.read}>{c.supplement}</Text>
          </Card>
        ) : null}

        {c.readMore?.length ? (
          <>
            <Text style={styles.h2}>閱讀更多</Text>
            <Card style={{ gap: 10 }}>
              {c.readMore.map((r) => (
                <View key={r.url} style={{ gap: 4 }}>
                  <Pressable onPress={() => Linking.openURL(r.url)} accessibilityRole="link" style={[styles.row, { gap: 4, alignItems: 'flex-start' }]}>
                    <Text style={[styles.link, styles.sp]}>{r.label}</Text>
                    <Icon name="external-link" size={16} color={palette.accent} />
                  </Pressable>
                  {r.note ? <Text style={styles.muted}>{r.note}</Text> : null}
                </View>
              ))}
            </Card>
          </>
        ) : null}

        <Text style={styles.h2}>資料來源</Text>
        <Card style={{ gap: 10 }}>
          {c.sources.map((s) => (
            <View key={s.url + s.name} style={{ gap: 2 }}>
              <Pressable onPress={() => Linking.openURL(s.url)} accessibilityRole="link" style={[styles.row, { gap: 4, alignItems: 'flex-start' }]}>
                <Text style={[styles.link, styles.sp]}>{s.name}</Text>
                <Icon name="external-link" size={16} color={palette.accent} />
              </Pressable>
              <Text style={styles.muted}>查核日期 {s.checkedAt} · {LICENSE_LABEL[s.license]}{s.lang === 'en' ? ' · 翻譯自英文原文' : ''}</Text>
            </View>
          ))}
          <View style={{ borderTopWidth: 1, borderTopColor: palette.line, borderStyle: 'dashed', paddingTop: 10, marginTop: 4 }}>
            <Text style={styles.muted}>本內容為對上述來源的摘述或翻譯，請以來源原文為準。本 APP 不提供診斷或就醫判斷。</Text>
          </View>
        </Card>

        {isSafety ? <SafetyBox sub="安全內容在任何照顧風格與設定下都會顯示，離線也能讀。" /> : null}
      </Screen>
    </View>
  );
}
