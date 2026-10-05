// 插畫與手繪裝飾（設計稿 v1「插畫與裝飾」）。插畫為本機生成的水彩繪本風 JPEG；小圖為 SVG，隨日夜主題換色。
import type { ReactNode } from 'react';
import { View, Image, type StyleProp, type ViewStyle, type ImageSourcePropType } from 'react-native';
import Svg, { Path, Circle, Rect, Ellipse, G } from 'react-native-svg';
import { useTheme } from './useTheme';

export const ART = {
  crib: require('../../assets/art/crib.jpg') as ImageSourcePropType,
  rattle: require('../../assets/art/rattle.jpg') as ImageSourcePropType,
  night: require('../../assets/art/night.jpg') as ImageSourcePropType,
  reading: require('../../assets/art/reading.jpg') as ImageSourcePropType,
  bowl: require('../../assets/art/bowl.jpg') as ImageSourcePropType,
  bag: require('../../assets/art/bag.jpg') as ImageSourcePropType,
  bear: require('../../assets/art/bear.jpg') as ImageSourcePropType,
  sprout: require('../../assets/art/sprout.jpg') as ImageSourcePropType,
};
export type ArtKey = keyof typeof ART;

// 封面圖：圓角、裁切填滿。
export function Hero({ art, height = 200, radius = 20, style, children }: { art: ArtKey; height?: number; radius?: number; style?: StyleProp<ViewStyle>; children?: ReactNode }) {
  const { palette } = useTheme();
  return (
    <View style={[{ height, borderRadius: radius, overflow: 'hidden', backgroundColor: palette.surface2, borderWidth: 1, borderColor: palette.line }, style]}>
      <Image source={ART[art]} style={{ width: '100%', height: '100%' }} resizeMode="cover" accessibilityIgnoresInvertColors />
      {children}
    </View>
  );
}

// 小縮圖：設計稿 .thumb（64）與 .thumb.lg（88）。
export function Thumb({ art, size = 64, radius = 16, style }: { art: ArtKey; size?: number; radius?: number; style?: StyleProp<ViewStyle> }) {
  const { palette } = useTheme();
  return (
    <View style={[{ width: size, height: size, borderRadius: radius, overflow: 'hidden', backgroundColor: palette.surface2, borderWidth: 1, borderColor: palette.line }, style]}>
      <Image source={ART[art]} style={{ width: size, height: size }} resizeMode="cover" accessibilityIgnoresInvertColors />
    </View>
  );
}

// 標題列天空：日間太陽雲朵，夜間月亮星星。
export function Sky({ width = 150, height = 70 }: { width?: number; height?: number }) {
  const { night, palette } = useTheme();
  if (night) {
    return (
      <Svg width={width} height={height} viewBox="0 0 150 70" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        <Path d="M118 10a20 20 0 1 0 20 28 15 15 0 0 1-20-28z" fill={palette.accent} />
        <G fill={palette.accent}>
          <Path d="M40 18l2.5 6 6 .6-4.6 4 1.4 6-5.3-3.3-5.3 3.3 1.4-6-4.6-4 6-.6z" />
          <Circle cx="75" cy="40" r="2.5" /><Circle cx="92" cy="16" r="2" /><Circle cx="60" cy="54" r="1.8" /><Circle cx="20" cy="50" r="1.5" />
        </G>
      </Svg>
    );
  }
  return (
    <Svg width={width} height={height} viewBox="0 0 150 70" accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      <Circle cx="120" cy="22" r="15" fill="#F2C778" />
      <G fill="#FFFFFF"><Circle cx="40" cy="46" r="13" /><Circle cx="58" cy="38" r="17" /><Circle cx="78" cy="46" r="12" /><Rect x="27" y="46" width="63" height="13" rx="6.5" /></G>
      <G fill="#FFFFFF"><Circle cx="112" cy="56" r="7" /><Circle cx="124" cy="52" r="9" /><Rect x="105" y="54" width="34" height="9" rx="4.5" /></G>
    </Svg>
  );
}

type SpotProps = { size?: number };

export function SpotShield({ size = 40 }: SpotProps) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Path d="M20 4l13 5v10c0 8-5.5 14-13 17-7.5-3-13-9-13-17V9z" fill="#FFFFFF" stroke={palette.accent} strokeWidth={1.8} />
      <Path d="M20 28s-7-4.5-7-9.5a3.6 3.6 0 0 1 7-1.5 3.6 3.6 0 0 1 7 1.5c0 5-7 9.5-7 9.5z" fill={palette.accent} />
    </Svg>
  );
}

export function SpotBottle({ size = 40 }: SpotProps) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Rect x="15" y="3" width="10" height="6" rx="2" fill={palette.warm} />
      <Path d="M13 9h14l2 5v19a4 4 0 0 1-4 4H15a4 4 0 0 1-4-4V14z" fill="#FFFFFF" stroke={palette.ink3} strokeWidth={1.6} />
      <Rect x="12.5" y="22" width="15" height="10" rx="2" fill={palette.warmSoft} />
      <Path d="M20 20.5l-3.2-3.2a1.9 1.9 0 0 1 3.2-2.1 1.9 1.9 0 0 1 3.2 2.1z" fill={palette.danger} />
    </Svg>
  );
}

export function SpotThermometer({ size = 40 }: SpotProps) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Rect x="16" y="4" width="8" height="22" rx="4" fill="#FFFFFF" stroke={palette.ink3} strokeWidth={1.6} />
      <Circle cx="20" cy="30" r="6.5" fill={palette.danger} />
      <Rect x="18.5" y="14" width="3" height="13" fill={palette.danger} />
      <Path d="M27 10h3M27 15h3M27 20h3" stroke={palette.ink3} strokeWidth={1.4} strokeLinecap="round" />
    </Svg>
  );
}

export function SpotSprout({ size = 40, star }: SpotProps & { star?: boolean }) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Path d="M12 24h16l-2 12H14z" fill={palette.warm} />
      <Path d="M20 24V14" stroke={palette.accent} strokeWidth={2} strokeLinecap="round" />
      <Path d="M20 16c-6 0-8-4-9-8 5 0 9 2 9 8zM20 14c6 0 8-4 9-8-5 0-9 2-9 8z" fill={palette.accent} />
      {star ? <Path d="M33 6l1 2.4 2.5.3-1.8 1.7.5 2.5-2.2-1.3-2.2 1.3.5-2.5-1.8-1.7 2.5-.3z" fill="#F2C778" /> : null}
    </Svg>
  );
}

export function SpotBear({ size = 40 }: SpotProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Circle cx="9" cy="11" r="5" fill="#C9A27A" /><Circle cx="31" cy="11" r="5" fill="#C9A27A" />
      <Circle cx="20" cy="22" r="14" fill="#E3C8A4" />
      <Ellipse cx="20" cy="26" rx="6" ry="4.5" fill="#F6ECDD" />
      <Circle cx="14.5" cy="19" r="1.6" fill="#3B2A1A" /><Circle cx="25.5" cy="19" r="1.6" fill="#3B2A1A" />
      <Ellipse cx="20" cy="24.5" rx="2" ry="1.4" fill="#3B2A1A" />
      <Circle cx="11" cy="24" r="2" fill="#F0B8A8" opacity={0.7} /><Circle cx="29" cy="24" r="2" fill="#F0B8A8" opacity={0.7} />
    </Svg>
  );
}

export function SpotMoonCloud({ size = 40 }: SpotProps) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Path d="M24 6a14 14 0 1 0 12 20 11 11 0 0 1-12-20z" fill="#F2C778" />
      <G fill="#FFFFFF"><Circle cx="12" cy="30" r="5" /><Circle cx="19" cy="27" r="6.5" /><Circle cx="26" cy="30" r="5" /><Rect x="7" y="30" width="24" height="5" rx="2.5" /></G>
      <Path d="M30 8l.8 2 2 .2-1.5 1.4.4 2-1.7-1-1.7 1 .4-2L27.2 10.2l2-.2z" fill={palette.warm} />
    </Svg>
  );
}

export function SpotBowl({ size = 40 }: SpotProps) {
  const { palette } = useTheme();
  return (
    <Svg width={size} height={size} viewBox="0 0 40 40" accessibilityElementsHidden>
      <Path d="M5 20h30a15 15 0 0 1-30 0z" fill={palette.warmSoft} stroke={palette.warm} strokeWidth={1.6} />
      <Ellipse cx="20" cy="20" rx="15" ry="3" fill={palette.warm} />
      <Path d="M14 13c0-3 2-3 2-6M20 12c0-3 2-3 2-6M26 13c0-3 2-3 2-6" stroke={palette.ink3} strokeWidth={1.5} fill="none" strokeLinecap="round" />
    </Svg>
  );
}

// 內容卡封面：依卡片 id 或主題群對應插畫；沒有對應就不顯示。
export function artForCard(id: string, topicGroup: string): ArtKey | null {
  if (id === 'safety.safe-sleep') return 'crib';
  if (topicGroup === 'milestones') return 'rattle';
  if (topicGroup === 'feeding') return 'bowl';
  return null;
}
