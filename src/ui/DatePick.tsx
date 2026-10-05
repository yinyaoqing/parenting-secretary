// 原生日期／時間選擇：Android 用對話框 API，iOS 在列下方展開滾輪。
import { useState } from 'react';
import { Platform, View } from 'react-native';
import DateTimePicker, { DateTimePickerAndroid } from '@react-native-community/datetimepicker';
import { PickRow, GhostButton } from './components';
import { useTheme } from './useTheme';
import { fmtDateZh, fmtHm } from '../util/datetime';

export function DatePick({ value, onChange, mode, placeholder, label, format, maximumDate, minimumDate, flex }: {
  value: Date | null;
  onChange: (d: Date) => void;
  mode: 'date' | 'time';
  placeholder?: string;
  label?: string;
  format?: (d: Date) => string;
  maximumDate?: Date;
  minimumDate?: Date;
  flex?: number;
}) {
  const { night } = useTheme();
  const [open, setOpen] = useState(false);
  const fmt = format ?? (mode === 'date' ? fmtDateZh : fmtHm);
  const text = value ? fmt(value) : (placeholder ?? (mode === 'date' ? '選擇日期' : '選擇時間'));

  const press = () => {
    if (Platform.OS === 'android') {
      DateTimePickerAndroid.open({
        value: value ?? new Date(),
        mode,
        is24Hour: true,
        maximumDate,
        minimumDate,
        onValueChange: (_e, d) => onChange(d),
      });
    } else {
      setOpen((o) => !o);
    }
  };

  return (
    <View style={[{ gap: 8 }, flex !== undefined && { flex }]}>
      <PickRow
        icon={mode === 'date' ? 'calendar' : 'clock'}
        value={value ? text : undefined}
        placeholder={text}
        onPress={press}
        accessibilityLabel={`${label ?? (mode === 'date' ? '日期' : '時間')}，${value ? text : '尚未選擇'}，點擊選擇`}
      />
      {open && Platform.OS !== 'android' ? (
        <View style={{ gap: 6 }}>
          <DateTimePicker
            value={value ?? new Date()}
            mode={mode}
            display="spinner"
            locale="zh-TW"
            themeVariant={night ? 'dark' : 'light'}
            maximumDate={maximumDate}
            minimumDate={minimumDate}
            onChange={(_e, d) => { if (d) onChange(d); }}
          />
          <GhostButton label="完成" onPress={() => setOpen(false)} small />
        </View>
      ) : null}
    </View>
  );
}
