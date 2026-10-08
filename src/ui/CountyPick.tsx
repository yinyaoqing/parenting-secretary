import { ScrollView } from 'react-native';
import { COUNTIES } from '../home/county';
import { Chip } from './components';

// 戶籍縣市橫向選單；再點一次已選的縣市就清除（可以不填）。
export function CountyPick({ value, onChange }: { value?: string | null; onChange: (v: string | undefined) => void }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
      {COUNTIES.map((c) => <Chip key={c} sm label={c} on={value === c} onPress={() => onChange(value === c ? undefined : c)} a11yLabel={`戶籍縣市 ${c}`} />)}
    </ScrollView>
  );
}
