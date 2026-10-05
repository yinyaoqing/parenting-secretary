// 共用元件：對應設計稿 ui.css 的 tile、big、chip、seg、opt、primary、ghost、pickrow、lrow、badge、banner、safety、toast。
import type { ReactNode } from 'react';
import { View, Text, Pressable, ScrollView, Switch, TextInput, Platform, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from './useTheme';

export type IconName = keyof typeof Feather.glyphMap;

export function Icon({ name, size = 22, color }: { name: IconName; size?: number; color?: string }) {
  const { palette } = useTheme();
  return <Feather name={name} size={size} color={color ?? palette.ink} />;
}

// ---------- 版面 ----------
export function Screen({ children, footer, scroll = true, style }: { children: ReactNode; footer?: ReactNode; scroll?: boolean; style?: StyleProp<ViewStyle> }) {
  const { styles } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={styles.page}>
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.pad, !footer && { paddingBottom: insets.bottom + 24 }, style]} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.page, styles.pad, style]}>{children}</View>
      )}
      {footer ? <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 12) + 8 }]}>{footer}</View> : null}
    </View>
  );
}

export function TopBar({ title, subtitle, back, right, children }: { title?: ReactNode; subtitle?: string; back?: boolean | (() => void); right?: ReactNode; children?: ReactNode }) {
  const { styles } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
      {back ? (
        <Pressable style={[styles.iconBtn, styles.iconBtnPlain]} onPress={() => (typeof back === 'function' ? back() : router.back())} accessibilityRole="button" accessibilityLabel="返回">
          <Icon name="chevron-left" size={26} />
        </Pressable>
      ) : null}
      <View style={styles.sp}>
        {typeof title === 'string' ? <Text style={styles.topTitle}>{title}</Text> : title}
        {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
        {children}
      </View>
      {right}
    </View>
  );
}

// 表單用的「抽屜」標頭：把手、標題、關閉。
export function SheetHeader({ title, subtitle }: { title: string; subtitle?: string }) {
  const { styles } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View style={{ paddingTop: Platform.OS === 'ios' ? 0 : insets.top }}>
      <View style={styles.handle} />
      <View style={[styles.topbar, { paddingTop: 6 }]}>
        <View style={styles.sp}>
          <Text style={styles.topTitle}>{title}</Text>
          {subtitle ? <Text style={styles.muted}>{subtitle}</Text> : null}
        </View>
        <Pressable style={[styles.iconBtn, styles.iconBtnPlain]} onPress={() => router.back()} accessibilityRole="button" accessibilityLabel="關閉">
          <Icon name="x" size={24} />
        </Pressable>
      </View>
    </View>
  );
}

export function IconButton({ name, onPress, label, plain, color }: { name: IconName; onPress: () => void; label: string; plain?: boolean; color?: string }) {
  const { styles } = useTheme();
  return (
    <Pressable style={[styles.iconBtn, plain && styles.iconBtnPlain]} onPress={onPress} accessibilityRole="button" accessibilityLabel={label}>
      <Icon name={name} size={22} color={color} />
    </Pressable>
  );
}

export function Section({ title, action, onAction, icon }: { title: string; action?: string; onAction?: () => void; icon?: IconName }) {
  const { styles, palette } = useTheme();
  return (
    <View style={styles.section}>
      {icon ? <Icon name={icon} size={18} color={palette.accent} /> : null}
      <Text style={[styles.h2, styles.sp, { marginTop: 0 }]}>{title}</Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={8}><Text style={styles.sectionAction}>{action}</Text></Pressable>
      ) : null}
    </View>
  );
}

export function Card({ children, accent, warm, onPress, style }: { children: ReactNode; accent?: boolean; warm?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  const { styles } = useTheme();
  const s = [styles.card, accent && styles.cardAccent, warm && styles.cardWarm, style];
  if (onPress) return <Pressable style={s} onPress={onPress} accessibilityRole="button">{children}</Pressable>;
  return <View style={s}>{children}</View>;
}

// ---------- 狀態與按鈕 ----------
export function Tile({ k, icon, v, s, on, onPress }: { k: string; icon: IconName; v: string; s?: string; on?: boolean; onPress?: () => void }) {
  const { styles, palette } = useTheme();
  const tint = on ? palette.warm : palette.ink2;
  return (
    <Pressable style={[styles.tile, on && styles.tileOn]} onPress={onPress} accessibilityRole="button" accessibilityLabel={`${k} ${v}${s ? `，${s}` : ''}`}>
      <View style={[styles.row, { gap: 6 }]}>
        <Icon name={icon} size={16} color={tint} />
        <Text style={[styles.tileK, on && styles.tileOnText]}>{k}</Text>
      </View>
      <Text style={[styles.tileV, on && styles.tileOnText]} numberOfLines={2}>{v}</Text>
      {s ? <Text style={[styles.tileS, on && styles.tileOnText]} numberOfLines={1}>{s}</Text> : null}
    </Pressable>
  );
}

export function Big({ label, sub, icon, on, warm, third, onPress, disabled }: { label: string; sub?: string; icon?: IconName; on?: boolean; warm?: boolean; third?: boolean; onPress: () => void; disabled?: boolean }) {
  const { styles, palette } = useTheme();
  const textColor = on ? palette.accentInk : warm ? palette.warm : palette.ink;
  return (
    <Pressable
      style={[styles.big, third && styles.bigThird, on && styles.bigOn, warm && styles.bigWarm, disabled && { opacity: 0.4 }]}
      onPress={disabled ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: on }}
      accessibilityLabel={sub ? `${label}，${sub}` : label}
    >
      <View style={[styles.row, { gap: 8 }]}>
        {icon ? <Icon name={icon} size={22} color={textColor} /> : null}
        <Text style={[styles.bigL, { color: textColor }]}>{label}</Text>
      </View>
      {sub ? <Text style={[styles.bigS, on && styles.bigOnText, warm && styles.bigWarmText]}>{sub}</Text> : null}
    </Pressable>
  );
}

export function Chip({ label, on, off, sm, icon, onPress }: { label: string; on?: boolean; off?: boolean; sm?: boolean; icon?: IconName; onPress?: () => void }) {
  const { styles, palette } = useTheme();
  return (
    <Pressable
      style={[styles.chip, sm && styles.chipSm, on && styles.chipOn, off && styles.chipOff]}
      onPress={off ? undefined : onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: !!on, disabled: !!off }}
    >
      {icon ? <Icon name={icon} size={16} color={on ? palette.accentInk : palette.ink} /> : null}
      <Text style={[styles.chipText, sm && styles.chipTextSm, on && styles.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}

export function Seg<T extends string>({ options, value, onChange, label }: { options: { key: T; label: string }[]; value: T; onChange: (k: T) => void; label?: string }) {
  const { styles } = useTheme();
  return (
    <View style={styles.seg} accessibilityRole="radiogroup" accessibilityLabel={label}>
      {options.map((o) => (
        <Pressable key={o.key} style={[styles.segBtn, value === o.key && styles.segOn]} onPress={() => onChange(o.key)} accessibilityRole="radio" accessibilityState={{ checked: value === o.key }}>
          <Text style={[styles.segText, value === o.key && styles.segTextOn]}>{o.label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

export function Opt({ label, sub, on, onPress, radio = true }: { label: string; sub?: string; on: boolean; onPress: () => void; radio?: boolean }) {
  const { styles } = useTheme();
  return (
    <Pressable style={[styles.opt, on && styles.optOn]} onPress={onPress} accessibilityRole="radio" accessibilityState={{ checked: on }}>
      {radio ? <View style={[styles.radio, on && styles.radioOn]}>{on ? <View style={styles.radioDot} /> : null}</View> : null}
      <View style={styles.sp}>
        <Text style={[styles.optText, on && styles.optTextOn]}>{label}</Text>
        {sub ? <Text style={styles.muted}>{sub}</Text> : null}
      </View>
    </Pressable>
  );
}

export function PrimaryButton({ label, onPress, disabled, icon }: { label: string; onPress: () => void; disabled?: boolean; icon?: IconName }) {
  const { styles, palette } = useTheme();
  return (
    <Pressable style={[styles.primary, disabled && styles.primaryDim]} onPress={disabled ? undefined : onPress} accessibilityRole="button" accessibilityState={{ disabled }}>
      {icon ? <Icon name={icon} size={20} color={palette.accentInk} /> : null}
      <Text style={styles.primaryText}>{label}</Text>
    </Pressable>
  );
}

export function GhostButton({ label, onPress, tone, icon, plain, small }: { label: string; onPress: () => void; tone?: 'accent' | 'danger'; icon?: IconName; plain?: boolean; small?: boolean }) {
  const { styles, palette } = useTheme();
  const color = tone === 'accent' ? palette.accent : tone === 'danger' ? palette.danger : palette.ink;
  return (
    <Pressable style={[styles.ghost, tone === 'accent' && styles.ghostAc, plain && styles.ghostPlain, small && { minHeight: 44 }]} onPress={onPress} accessibilityRole="button">
      {icon ? <Icon name={icon} size={18} color={color} /> : null}
      <Text style={[styles.ghostText, { color }, small && { fontSize: 15 }]}>{label}</Text>
    </Pressable>
  );
}

// ---------- 表單 ----------
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  const { styles } = useTheme();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {hint ? <Text style={styles.muted}>{hint}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps) {
  const { styles, palette } = useTheme();
  return <TextInput placeholderTextColor={palette.ink3} {...props} style={[styles.input, props.style]} />;
}

// 大數字輸入（奶量、度數、分鐘）
export function NumInput({ value, onChangeText, unit, label, decimal, placeholder }: { value: string; onChangeText: (s: string) => void; unit: string; label: string; decimal?: boolean; placeholder?: string }) {
  const { styles, palette } = useTheme();
  return (
    <View style={[styles.card, styles.numCard]}>
      <TextInput
        style={styles.num}
        value={value}
        onChangeText={onChangeText}
        keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
        placeholder={placeholder ?? '0'}
        placeholderTextColor={palette.ink3}
        accessibilityLabel={label}
        maxLength={6}
      />
      <Text style={styles.numUnit}>{unit}</Text>
    </View>
  );
}

export function PickRow({ icon, value, placeholder, onPress, accessibilityLabel, flex }: { icon: IconName; value?: string; placeholder?: string; onPress: () => void; accessibilityLabel?: string; flex?: number }) {
  const { styles, palette } = useTheme();
  return (
    <Pressable style={[styles.pickrow, flex !== undefined && { flex }]} onPress={onPress} accessibilityRole="button" accessibilityLabel={accessibilityLabel}>
      <Icon name={icon} size={20} color={palette.accent} />
      <Text style={[styles.pickText, !value && styles.pickPh]} numberOfLines={1}>{value ?? placeholder ?? ''}</Text>
      <Icon name="chevron-right" size={18} color={palette.ink3} />
    </Pressable>
  );
}

export function SwitchRow({ title, sub, value, onChange }: { title: string; sub?: string; value: boolean; onChange: (v: boolean) => void }) {
  const { styles, palette } = useTheme();
  return (
    <View style={styles.row}>
      <View style={styles.sp}>
        <Text style={[styles.p, { fontWeight: '700' }]}>{title}</Text>
        {sub ? <Text style={styles.muted}>{sub}</Text> : null}
      </View>
      <Switch value={value} onValueChange={onChange} trackColor={{ true: palette.accent, false: palette.line }} thumbColor="#fff" accessibilityLabel={title} />
    </View>
  );
}

export function Progress({ pct }: { pct: number }) {
  const { styles } = useTheme();
  return <View style={styles.prog} accessibilityRole="progressbar" accessibilityValue={{ now: pct, min: 0, max: 100 }}><View style={[styles.progFill, { width: `${Math.max(0, Math.min(100, pct))}%` }]} /></View>;
}

// ---------- 列表與標籤 ----------
export function ListCard({ children }: { children: ReactNode }) {
  const { styles } = useTheme();
  return <View style={styles.listCard}>{children}</View>;
}

export function ListRow({ time, main, sub, right, onPress, first, chevron, selected, icon, children, mainColor }: {
  time?: string; main: string; sub?: string; right?: ReactNode; onPress?: () => void; first?: boolean; chevron?: boolean; selected?: boolean; icon?: IconName; children?: ReactNode; mainColor?: string;
}) {
  const { styles, palette } = useTheme();
  const inner = (
    <>
      <View style={[styles.row, { width: '100%' }]}>
        {icon ? <Icon name={icon} size={20} color={palette.accent} /> : null}
        {time ? <Text style={styles.lrowTime}>{time}</Text> : null}
        <View style={styles.sp}>
          <Text style={[styles.lrowMain, mainColor ? { color: mainColor } : null]}>{main}</Text>
          {sub ? <Text style={styles.lrowSub}>{sub}</Text> : null}
        </View>
        {right}
        {chevron ? <Icon name="chevron-right" size={18} color={palette.ink3} /> : null}
      </View>
      {children}
    </>
  );
  const s = [styles.lrow, first && styles.lrowFirst, selected && styles.lrowSelected, { flexDirection: 'column' as const, alignItems: 'stretch' as const, gap: 8 }];
  if (onPress) return <Pressable style={s} onPress={onPress} accessibilityRole="button">{inner}</Pressable>;
  return <View style={s}>{inner}</View>;
}

export function Badge({ label, tone, icon }: { label: string; tone?: 'warm' | 'gray'; icon?: IconName }) {
  const { styles, palette } = useTheme();
  const color = tone === 'warm' ? palette.warm : tone === 'gray' ? palette.ink2 : palette.accent;
  return (
    <View style={[styles.badge, tone === 'warm' && styles.badgeWarm, tone === 'gray' && styles.badgeGray]}>
      {icon ? <Icon name={icon} size={12} color={color} /> : null}
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

export function Banner({ title, icon = 'bell', children }: { title: string; icon?: IconName; children?: ReactNode }) {
  const { styles, palette } = useTheme();
  return (
    <View style={styles.banner} accessibilityRole="alert">
      <View style={styles.bannerTitle}>
        <Icon name={icon} size={20} color={palette.warm} />
        <Text style={styles.bannerTitleText}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function SafetyBox({ title, sub, onPress, children }: { title?: string; sub?: string; onPress?: () => void; children?: ReactNode }) {
  const { styles, palette } = useTheme();
  const inner = (
    <>
      <Icon name="shield" size={24} color={palette.accent} />
      <View style={styles.sp}>
        {title ? <Text style={[styles.p, { fontWeight: '700' }]}>{title}</Text> : null}
        {sub ? <Text style={[styles.muted, { color: palette.ink }]}>{sub}</Text> : null}
        {children}
      </View>
      {onPress ? <Icon name="chevron-right" size={18} color={palette.ink3} /> : null}
    </>
  );
  if (onPress) return <Pressable style={styles.safety} onPress={onPress} accessibilityRole="button">{inner}</Pressable>;
  return <View style={styles.safety}>{inner}</View>;
}

export function Toast({ text, onUndo }: { text: string; onUndo?: () => void }) {
  const { styles, palette } = useTheme();
  return (
    <View style={styles.toast} accessibilityRole="alert" accessibilityLiveRegion="polite">
      <Icon name="check" size={18} color={palette.bg} />
      <Text style={styles.toastText}>{text}</Text>
      {onUndo ? (
        <Pressable onPress={onUndo} accessibilityRole="button" hitSlop={8} style={[styles.row, { gap: 4, minHeight: 44 }]}>
          <Icon name="rotate-ccw" size={16} color={palette.bg} />
          <Text style={styles.toastUndo}>復原</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export function Hint({ children }: { children: ReactNode }) {
  const { styles } = useTheme();
  return <Text style={styles.muted}>{children}</Text>;
}
