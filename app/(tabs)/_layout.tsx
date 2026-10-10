import { Tabs } from 'expo-router';
import type { ColorValue } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '../../src/ui/useTheme';

const icon = (name: keyof typeof Feather.glyphMap) => function TabIcon({ color, size }: { color: ColorValue; size: number }) { return <Feather name={name} size={size} color={color} />; };

// 底部五分頁：今天、內容、育村、時程、設定（設計稿第 3 區；育村見規劃 v1.0 第 4 章）。
export default function TabLayout() {
  const { palette } = useTheme();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.accent,
        tabBarInactiveTintColor: palette.ink3,
        tabBarStyle: { backgroundColor: palette.surface, borderTopColor: palette.line },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        sceneStyle: { backgroundColor: palette.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: '今天', tabBarIcon: icon('home') }} />
      <Tabs.Screen name="cards" options={{ title: '內容', tabBarIcon: icon('book-open') }} />
      <Tabs.Screen name="village" options={{ title: '育村', tabBarIcon: icon('users') }} />
      <Tabs.Screen name="schedule" options={{ title: '時程', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="settings" options={{ title: '設定', tabBarIcon: icon('sliders') }} />
    </Tabs>
  );
}
