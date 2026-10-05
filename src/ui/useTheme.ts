import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import { colors, makeStyles } from './theme';
import { getSetting, setSetting } from '../db/repo';

export type ThemeMode = 'auto' | 'day' | 'night';

export function useTheme() {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  useEffect(() => {
    getSetting('themeMode').then((v) => { if (v === 'day' || v === 'night' || v === 'auto') setModeState(v); });
  }, []);
  const night = mode === 'night' || (mode === 'auto' && system === 'dark');
  const palette = night ? colors.night : colors.day;
  const styles = useMemo(() => makeStyles(palette), [palette]);
  const setMode = async (m: ThemeMode) => { setModeState(m); await setSetting('themeMode', m); };
  return { night, palette, styles, mode, setMode };
}
