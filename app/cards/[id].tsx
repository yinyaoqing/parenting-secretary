import { View, Text, Pressable, ScrollView, Linking } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { cardById, GROUP_LABEL } from '../../src/content/loader';
import { useTheme } from '../../src/ui/useTheme';

export default function CardDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { styles, palette } = useTheme();
  const c = id ? cardById(id) : undefined;
  if (!c) return <View style={[styles.page, styles.pad]}><Text style={styles.p}>找不到這張內容卡。</Text></View>;

  const foreign = c.foreignOnly || (c.translated && c.sources.every((s) => s.lang !== 'zh-TW'));

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.pad}>
      <Text style={styles.muted}>{GROUP_LABEL[c.topicGroup]}</Text>
      <Text style={styles.h1}>{c.title}</Text>
      {foreign && (
        <View style={[styles.card, { borderColor: palette.accent }]}>
          <Text style={styles.muted}>本內容翻譯改寫自國外公開資料，原文連結見下方。台灣的健檢與篩檢時點以國健署為準。</Text>
        </View>
      )}
      {c.status !== 'published' && <Text style={styles.muted}>草稿：內容與來源尚未完成最終查核。</Text>}

      <View style={styles.card}>
        {c.body.split(/\n{2,}/).map((para, i) => <Text key={i} style={[styles.p, { marginBottom: 10 }]}>{para}</Text>)}
      </View>

      {c.supplement && (
        <View style={styles.card}>
          <Text style={styles.muted}>本產品補充（非原文）</Text>
          <Text style={styles.p}>{c.supplement}</Text>
        </View>
      )}

      {c.readMore?.length ? (
        <View style={styles.card}>
          <Text style={styles.h2}>閱讀更多</Text>
          {c.readMore.map((r) => (
            <View key={r.url} style={{ marginTop: 8 }}>
              <Pressable onPress={() => Linking.openURL(r.url)} accessibilityRole="link"><Text style={[styles.p, { color: palette.accent }]}>{r.label}</Text></Pressable>
              {r.note && <Text style={styles.muted}>{r.note}</Text>}
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.h2}>資料來源</Text>
        {c.sources.map((s) => (
          <View key={s.url + s.name} style={{ marginTop: 8 }}>
            <Pressable onPress={() => Linking.openURL(s.url)} accessibilityRole="link"><Text style={[styles.p, { color: palette.accent }]}>{s.name}</Text></Pressable>
            <Text style={styles.muted}>查核日期 {s.checkedAt}{s.lang === 'en' ? ' · 翻譯自英文原文' : ''}</Text>
          </View>
        ))}
        <Text style={[styles.muted, { marginTop: 10 }]}>本內容為對上述來源的摘述或翻譯，請以來源原文為準。本 APP 不提供診斷或就醫判斷。</Text>
      </View>
    </ScrollView>
  );
}
