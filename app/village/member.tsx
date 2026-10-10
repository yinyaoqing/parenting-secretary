import { useEffect, useState } from 'react';
import { View, Text } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/ui/useTheme';
import { Screen, SheetHeader, Field, Input, Opt, PrimaryButton, GhostButton, Hint } from '../../src/ui/components';
import { listMembers, saveMember, deleteMember } from '../../src/village/store';
import { ROLE_LABEL, type MemberRole } from '../../src/village/model';

const ROLES: MemberRole[] = ['primary', 'shift', 'helper', 'professional'];

// 新增或編輯村民：名字、角色、電話（可留空）、備註。隨家庭交接同步到配對過的手機。
export default function MemberEdit() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { styles } = useTheme();
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('helper');
  const [phone, setPhone] = useState('');
  const [note, setNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    listMembers().then((ms) => { const m = ms.find((x) => x.id === id); if (m) { setName(m.name); setRole(m.role); setPhone(m.phone ?? ''); setNote(m.note ?? ''); } });
  }, [id]);

  const save = async () => {
    if (!name.trim()) return setErr('請寫怎麼稱呼這位村民');
    await saveMember({ name: name.trim(), role, phone: phone.trim() || undefined, note: note.trim() || undefined }, id);
    router.back();
  };

  return (
    <View style={styles.page}>
      <SheetHeader title={id ? '編輯村民' : '新增村民'} subtitle="一起照顧孩子的人" />
      <Screen footer={
        <>
          <PrimaryButton label="儲存" onPress={save} />
          {id ? (confirmDel
            ? <GhostButton label="確定移除" tone="danger" icon="trash-2" onPress={async () => { await deleteMember(id); router.back(); }} />
            : <GhostButton label="移除這位村民" tone="danger" onPress={() => setConfirmDel(true)} />) : null}
        </>
      }>
        <Field label="稱呼">
          <Input value={name} onChangeText={setName} placeholder="例如：外婆、林老師、Ana" accessibilityLabel="村民稱呼" />
        </Field>
        <Field label="角色">
          <View style={{ gap: 8 }}>{ROLES.map((r) => <Opt key={r} label={ROLE_LABEL[r]} on={role === r} onPress={() => setRole(r)} />)}</View>
        </Field>
        <Field label="電話（可留空）" hint="只用在交班卡的聯絡人欄位。">
          <Input value={phone} onChangeText={setPhone} keyboardType="phone-pad" placeholder="0912…" accessibilityLabel="電話" />
        </Field>
        <Field label="備註（可留空）">
          <Input value={note} onChangeText={setNote} placeholder="例如：週二、週四下午接送" multiline accessibilityLabel="備註" />
        </Field>
        <Hint>村民名冊只存在你們家配對過的手機，隨交接同步，不會上傳。記錄別人的電話前，請先徵得對方同意。</Hint>
        {err ? <Text style={[styles.p, styles.danger]}>{err}</Text> : null}
      </Screen>
    </View>
  );
}
