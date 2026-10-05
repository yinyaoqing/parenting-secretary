// 主題供應：日夜模式與字級放在 context，所有畫面共用同一份狀態，切換立即生效。
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { colors, makeStyles, SCALE, type Palette, type Styles, type TextScale } from './theme';
import { getSetting, setSetting } from '../db/repo';

export type ThemeMode = 'auto' | 'day' | 'night';

type ThemeValue = {
  night: boolean;
  palette: Palette;
  styles: Styles;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => Promise<void>;
  scale: TextScale;
  setScale: (s: TextScale) => Promise<void>;
  factor: number;
};

const ThemeCtx = createContext<ThemeValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>('auto');
  const [scale, setScaleState] = useState<TextScale>('standard');

  useEffect(() => {
    getSetting('themeMode').then((v) => { if (v === 'day' || v === 'night' || v === 'auto') setModeState(v); }).catch(() => {});
    getSetting('textScale').then((v) => { if (v === 'standard' || v === 'large' || v === 'xlarge') setScaleState(v); }).catch(() => {});
  }, []);

  const night = mode === 'night' || (mode === 'auto' && system === 'dark');
  const palette = night ? colors.night : colors.day;
  const factor = SCALE[scale];
  const styles = useMemo(() => makeStyles(palette, factor), [palette, factor]);

  const value = useMemo<ThemeValue>(() => ({
    night, palette, styles, mode, scale, factor,
    setMode: async (m) => { setModeState(m); await setSetting('themeMode', m); },
    setScale: async (s) => { setScaleState(s); await setSetting('textScale', s); },
  }), [night, palette, styles, mode, scale, factor]);

  return <ThemeCtx.Provider value={value}>{children}</ThemeCtx.Provider>;
}

export function useThemeCtx(): ThemeValue {
  const v = useContext(ThemeCtx);
  if (!v) throw new Error('useTheme 需要在 ThemeProvider 內使用');
  return v;
}
