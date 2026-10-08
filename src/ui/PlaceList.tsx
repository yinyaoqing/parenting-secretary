import { useCallback, useMemo, useState, type ReactNode } from 'react';
import { View, Text, Pressable, Linking, Platform, ScrollView, TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { getSetting, setSetting } from '../db/repo';
import { useChildren } from './ChildContext';
import { useTheme } from './useTheme';
import { Screen, TopBar, Chip, ListRow, ListCard, Icon, Card } from './components';

export interface Place { name: string; county: string; district: string; address: string; phone: string; detail?: string }
export interface PlaceSource { name: string; url: string; license: string }

// 用手機的地圖 APP 開地址（不內嵌地圖，規劃 v0.8 D6-6）。
export function openMap(p: Place) {
  const q = encodeURIComponent(`${p.address} ${p.name}`);
  const url = Platform.OS === 'ios' ? `http://maps.apple.com/?q=${q}` : `geo:0,0?q=${q}`;
  void Linking.openURL(url).catch(() => Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${q}`));
}

// 依縣市、鄉鎮篩選的場所清單（哺集乳室、親子館、幼兒園共用）。沒選過縣市時，用孩子的戶籍縣市當預設。
export function PlaceList({ title, subtitle, places, counties, source, asOf, settingKey, searchHint, emptyHint, footnote, header }: {
  title: string; subtitle: string; places: Place[]; counties: string[]; source: PlaceSource; asOf: string; settingKey: string; searchHint: string; emptyHint: string; footnote?: string; header?: ReactNode;
}) {
  const { styles, palette } = useTheme();
  const { active } = useChildren();
  const childCounty = active?.county;
  const [county, setCounty] = useState<string | null>(null);
  const [district, setDistrict] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useFocusEffect(useCallback(() => {
    getSetting(settingKey).then((v) => {
      if (v && counties.includes(v)) setCounty(v);
      else if (childCounty && counties.includes(childCounty)) setCounty(childCounty);
    });
  }, [settingKey, counties, childCounty]));

  const districts = useMemo(() => (county ? [...new Set(places.filter((r) => r.county === county).map((r) => r.district))].filter(Boolean) : []), [county, places]);
  const list = useMemo(() => places.filter((r) => (!county || r.county === county) && (!district || r.district === district) && (!q.trim() || r.name.includes(q.trim()) || r.address.includes(q.trim()))), [county, district, q, places]);
  const pickCounty = async (c: string) => { setCounty(c); setDistrict(null); await setSetting(settingKey, c); };

  return (
    <View style={styles.page}>
      <TopBar back title={title} subtitle={subtitle} />
      <Screen>
        <View style={[styles.pickrow, { gap: 8 }]}>
          <Icon name="search" size={20} color={palette.accent} />
          <TextInput value={q} onChangeText={setQ} placeholder={searchHint} placeholderTextColor={palette.ink3} style={[styles.pickText, { paddingVertical: 10 }]} accessibilityLabel={`搜尋${title}`} />
        </View>
        {header}
        <Text style={styles.label}>縣市</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {counties.map((c) => <Chip key={c} sm label={c} on={county === c} onPress={() => pickCounty(c)} />)}
        </ScrollView>
        {county ? (
          <>
            <Text style={styles.label}>鄉鎮市區</Text>
            <View style={styles.chips}>
              <Chip sm label="全部" on={!district} onPress={() => setDistrict(null)} />
              {districts.map((d) => <Chip key={d} sm label={d} on={district === d} onPress={() => setDistrict(d)} />)}
            </View>
          </>
        ) : null}

        {!county && !q.trim() ? (
          <Card><Text style={styles.muted}>{emptyHint}</Text></Card>
        ) : (
          <ListCard>
            {list.length === 0 ? <ListRow first main="這裡沒有找到。" mainColor={palette.ink3} /> : null}
            {list.slice(0, 200).map((r, i) => (
              <ListRow key={`${r.name}|${r.address}`} first={i === 0} main={r.name} sub={[r.address, r.detail].filter(Boolean).join('\n')}
                right={r.phone ? (
                  <Pressable onPress={() => Linking.openURL(`tel:${r.phone.replace(/[^\d#]/g, '').replace('#', ',')}`)} accessibilityRole="button" accessibilityLabel={`撥打 ${r.name} ${r.phone}`} hitSlop={8}>
                    <Icon name="phone" size={20} color={palette.accent} />
                  </Pressable>
                ) : undefined}
                onPress={() => openMap(r)} />
            ))}
          </ListCard>
        )}
        {list.length > 200 ? <Text style={styles.muted}>只顯示前 200 筆，請選鄉鎮或搜尋縮小範圍。</Text> : null}

        <Pressable onPress={() => Linking.openURL(source.url)} accessibilityRole="link" style={[styles.row, { gap: 6, alignItems: 'flex-start' }]}>
          <Text style={[styles.link, styles.sp, { fontSize: 13, lineHeight: 19 }]}>{source.name}（{source.license}），{asOf}</Text>
          <Icon name="external-link" size={14} color={palette.accent} />
        </Pressable>
        {footnote ? <Text style={styles.muted}>{footnote}</Text> : null}
      </Screen>
    </View>
  );
}
