// 首頁「今天一句」：一天一張，可分享、可關閉；模擬卡標示來源與「模擬」。只在日間模式顯示（由首頁決定）。
import { View, Text, Share, Pressable } from 'react-native';
import { router } from 'expo-router';
import { kindLabel, shareText, type EncourageCard } from './pick';
import { useTheme } from '../ui/useTheme';
import { Card, Badge, GhostButton, Icon } from '../ui/components';
import { SpotSprout } from '../ui/art';

export function TodayCard({ card, onDismiss }: { card: EncourageCard; onDismiss: () => void }) {
  const { styles, palette } = useTheme();
  const thought = card.kind === 'thought';
  return (
    <Card style={{ gap: 8, backgroundColor: palette.accentSoft, borderColor: palette.accent }}>
      <View style={[styles.row, { gap: 8 }]}>
        <SpotSprout size={28} />
        <Badge label={kindLabel(card)} tone={card.kind === 'official' ? undefined : 'gray'} />
        <Text style={[styles.muted, styles.sp]} numberOfLines={1}>{card.voice}</Text>
        <Pressable onPress={onDismiss} accessibilityRole="button" accessibilityLabel="今天不要再顯示這張" hitSlop={8}><Icon name="x" size={18} color={palette.ink3} /></Pressable>
      </View>
      <Text style={[styles.p, { fontSize: 16, lineHeight: 25 }]}>{card.body}</Text>
      {card.quote ? <Text style={[styles.muted, { color: palette.ink2 }]}>「{card.quote.text}」{card.quote.source}</Text> : null}
      {thought ? <Text style={[styles.muted, { fontSize: 12 }]}>依{card.genre === 'literary' ? '角色' : '其思想'}改寫的模擬，不是原文。{card.source?.name}</Text> : null}
      {card.kind === 'official' && card.source ? <Text style={[styles.muted, { fontSize: 12 }]}>{card.source.name}</Text> : null}
      <View style={[styles.row, { gap: 8, flexWrap: 'wrap' }]}>
        {card.action ? <GhostButton small tone="accent" label={card.action === 'help' ? '請別人幫忙' : '記一下自己'} onPress={() => router.push('/caregiver')} /> : null}
        <GhostButton small plain icon="share" label="分享" onPress={() => { void Share.share({ message: shareText(card) }); }} />
      </View>
    </Card>
  );
}
