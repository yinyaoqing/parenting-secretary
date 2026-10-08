import { useMemo, useState } from 'react';
import { View, Text, Linking, Pressable } from 'react-native';
import data from '../../content/resources/kindergartens.json';
import { PlaceList, type Place, type PlaceSource } from '../../src/ui/PlaceList';
import { useTheme } from '../../src/ui/useTheme';
import { Chip, Icon } from '../../src/ui/components';

type Kind = 'p' | 'n' | 'r';
const D = data as unknown as { items: [string, Kind, number, string, string, string][]; counties: string[]; source: PlaceSource; schoolYear: number; checkedAt: string };
const KIND_LABEL: Record<Kind, string> = { p: '公立', n: '非營利', r: '私立' };
const ALL: (Place & { kind: Kind })[] = D.items.map(([name, kind, ci, district, address, phone]) => ({ name, kind, county: D.counties[ci], district, address, phone, detail: KIND_LABEL[kind] }));
const COUNTIES = D.counties.filter((c) => ALL.some((p) => p.county === c));
const ECE_URL = 'https://www.ece.moe.edu.tw/ch/';

// 找幼兒園（規劃 v1.0 第 5.1 節）：教育部名錄，依縣市鄉鎮列出，不排序、不推薦。
// 準公共、收費、評鑑結果不在名錄裡，連到全國教保資訊網看官方資料。
export default function Kindergartens() {
  const { styles, palette } = useTheme();
  const [kind, setKind] = useState<Kind | null>(null);
  const places = useMemo(() => (kind ? ALL.filter((p) => p.kind === kind) : ALL), [kind]);

  const header = (
    <View style={{ gap: 8 }}>
      <View style={styles.chips}>
        <Chip sm label="全部" on={!kind} onPress={() => setKind(null)} />
        {(['p', 'n', 'r'] as Kind[]).map((k) => <Chip key={k} sm label={KIND_LABEL[k]} on={kind === k} onPress={() => setKind(k)} />)}
      </View>
      <Pressable onPress={() => Linking.openURL(ECE_URL)} accessibilityRole="link" style={[styles.row, { gap: 6 }]}>
        <Text style={[styles.link, styles.sp, { fontSize: 14 }]}>哪些是準公共、收費多少、評鑑結果：到全國教保資訊網查</Text>
        <Icon name="external-link" size={14} color={palette.accent} />
      </Pressable>
    </View>
  );

  return (
    <PlaceList title="找幼兒園" subtitle={`${D.schoolYear} 學年度立案幼兒園 ${ALL.length} 所`} places={places} counties={COUNTIES} source={D.source} asOf={`${D.schoolYear} 學年度，整理 ${D.checkedAt}`} settingKey="kindergartenCounty"
      searchHint="園名或路名" emptyHint="先選縣市。名單依教育部名錄的順序，不代表推薦。公立與非營利幼兒園每年春天登記抽籤，見時程分頁的行政待辦。"
      footnote="非營利幼兒園從園名辨識，可能有遺漏。名錄只列立案資料，招生名額與是否還有空位請洽園所。" header={header} />
  );
}
