import { useCallback, useState } from 'react';
import { View, Text } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { listChildren } from '../../src/db/repo';
import type { Child } from '../../src/db/types';
import { ageLabel, daysSince } from '../../src/util/age';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, TopBar, Badge, Card, Section, ListCard, ListRow } from '../../src/ui/components';

// 時程分頁：規劃第 9–11 週實作。這裡不放任何數字或日期，政策數字必須標年度與查核日期並走遠端 JSON（紅線 R11）。
export default function Schedule() {
  const { styles } = useTheme();
  const [child, setChild] = useState<Child | null>(null);
  useFocusEffect(useCallback(() => { listChildren().then((cs) => setChild(cs[0] ?? null)); }, []));

  const d = child ? daysSince(child.birthDate) : null;
  return (
    <View style={styles.page}>
      <TopBar title="時程" subtitle={child && d !== null ? `${child.nickname} · 第 ${d + 1} 天 · 實際 ${ageLabel(d)}` : undefined} right={<Badge label="規劃中" tone="gray" />} />
      <Screen>
        <Card>
          <Text style={[styles.p, { fontWeight: '700' }]}>這一頁還沒有內容</Text>
          <Text style={styles.muted}>之後會依出生日計算公費健檢、發展篩檢與疫苗的時間窗，並列出津貼、補助與假別的行政待辦。每個數字都會標年度與查核日期，來源為政府開放資料。</Text>
        </Card>
        <Section title="預計提供" />
        <ListCard>
          <ListRow first main="兒童預防保健" sub="依出生日計算每次的時間窗，可與疫苗同日完成" />
          <ListRow main="兒童發展篩檢" sub="6 次篩檢的時間窗與要帶的東西" />
          <ListRow main="疫苗" sub="依疾管署現行時程，不自行標註廠牌" />
          <ListRow main="行政待辦" sub="育兒津貼、托育補助、育嬰留職停薪，標年度與查核日期" />
        </ListCard>
        <Text style={styles.muted}>在此之前，健檢與疫苗時程以《兒童健康手冊》為準。</Text>
      </Screen>
    </View>
  );
}
