import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Fonts, Spacing } from '../theme';
import { useSettings } from '../context/SettingsContext';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const MODAL_HEIGHT = SCREEN_HEIGHT * 0.92;

const ACCENT = '#6d8fad';
const THEMES = [
  { label: 'Deep Blue', color: '#6d8fad' },
  { label: 'Ocean Teal', color: '#48cae4' },
  { label: 'Midnight Purple', color: '#b794f4' },
];
const ALARM_SOUNDS = ['None', 'Bell', 'Chime', 'Ocean Wave', 'Digital'];
const FOCUS_SOUNDS = ['None', 'Rain', 'Ocean', 'White Noise', 'Lo-fi'];
const REMINDERS = ['None', '5 mins before', '10 mins before'];
const HOUR_FORMATS = ['12-hour', '24-hour'];

function SectionHeader({ icon, title }: { icon: string; title: string }) {
  return (
    <View style={s.sectionHeader}>
      <Text style={s.sectionIcon}>{icon}</Text>
      <Text style={s.sectionTitle}>{title}</Text>
    </View>
  );
}

function Row({ label, sub, children }: { label: string; sub?: string; children: React.ReactNode }) {
  return (
    <View style={s.row}>
      <View style={s.rowLeft}>
        <Text style={s.rowLabel}>{label}</Text>
        {sub ? <Text style={s.rowSub}>{sub}</Text> : null}
      </View>
      {children}
    </View>
  );
}

function Toggle({ value, onValueChange }: { value: boolean; onValueChange: (v: boolean) => void }) {
  return (
    <Switch
      value={value}
      onValueChange={onValueChange}
      trackColor={{ false: Colors.border, true: ACCENT }}
      thumbColor="white"
      ios_backgroundColor={Colors.border}
    />
  );
}

function NumberInput({ value, onChange, min = 1, max = 120 }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <View style={s.numInput}>
      <TouchableOpacity
        style={s.numBtn}
        onPress={() => onChange(Math.max(min, value - 1))}
      >
        <Ionicons name="remove" size={16} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={s.numValue}>{value}</Text>
      <TouchableOpacity
        style={s.numBtn}
        onPress={() => onChange(Math.min(max, value + 1))}
      >
        <Ionicons name="add" size={16} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function VolumeInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.numInput}>
      <TouchableOpacity style={s.numBtn} onPress={() => onChange(Math.max(0, value - 10))}>
        <Ionicons name="volume-low" size={14} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={s.numValue}>{value}%</Text>
      <TouchableOpacity style={s.numBtn} onPress={() => onChange(Math.min(100, value + 10))}>
        <Ionicons name="volume-high" size={14} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

function DropdownInput({ options, value, onChange }: { options: string[]; value: string; onChange: (v: string) => void }) {
  const idx = options.indexOf(value);
  return (
    <View style={s.numInput}>
      <TouchableOpacity
        style={s.numBtn}
        onPress={() => onChange(options[(idx - 1 + options.length) % options.length])}
      >
        <Ionicons name="chevron-back" size={14} color={Colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[s.numValue, { fontSize: 11, minWidth: 72, textAlign: 'center' }]}>{value}</Text>
      <TouchableOpacity
        style={s.numBtn}
        onPress={() => onChange(options[(idx + 1) % options.length])}
      >
        <Ionicons name="chevron-forward" size={14} color={Colors.textPrimary} />
      </TouchableOpacity>
    </View>
  );
}

export default function SettingsModal() {
  const { settings, updateSetting, saveSettings, settingsVisible, setSettingsVisible } = useSettings();
  const insets = useSafeAreaInsets();
  const slideAnim = useRef(new Animated.Value(MODAL_HEIGHT)).current;

  useEffect(() => {
    if (settingsVisible) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 65,
        friction: 11,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(MODAL_HEIGHT);
    }
  }, [settingsVisible]);

  const handleClose = () => setSettingsVisible(false);

  const handleSave = async () => {
    await saveSettings();
    setSettingsVisible(false);
  };

  return (
    <Modal
      visible={settingsVisible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      statusBarTranslucent
    >
      <View style={s.backdrop}>
        <TouchableOpacity style={StyleSheet.absoluteFill} onPress={handleClose} activeOpacity={1} />
        <Animated.View
          style={[
            s.sheet,
            { height: MODAL_HEIGHT, transform: [{ translateY: slideAnim }] },
          ]}
        >
          {/* Handle bar */}
          <View style={s.handle} />

          {/* Header */}
          <View style={s.header}>
            <Text style={s.headerTitle}>Settings</Text>
            <TouchableOpacity onPress={handleClose} style={s.closeBtn}>
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={[s.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
          >
            {/* ── PROFILE ── */}
            <SectionHeader icon="👤" title="PROFILE" />
            <View style={s.card}>
              <View style={s.profileRow}>
                <Text style={s.rowLabel}>Your Name</Text>
                <TextInput
                  value={settings.userName}
                  onChangeText={v => updateSetting('userName', v)}
                  style={s.nameInput}
                  placeholder="Enter your name"
                  placeholderTextColor={Colors.textMuted}
                  maxLength={30}
                  returnKeyType="done"
                  autoCorrect={false}
                />
              </View>
            </View>

            {/* ── TIMER ── */}
            <SectionHeader icon="⏱" title="TIMER" />
            <View style={s.card}>
              <Row label="Focus Session" sub="minutes">
                <NumberInput value={settings.focusDuration} onChange={v => updateSetting('focusDuration', v)} max={90} />
              </Row>
              <View style={s.divider} />
              <Row label="Short Break" sub="minutes">
                <NumberInput value={settings.shortBreakDuration} onChange={v => updateSetting('shortBreakDuration', v)} max={30} />
              </Row>
              <View style={s.divider} />
              <Row label="Long Break" sub="minutes">
                <NumberInput value={settings.longBreakDuration} onChange={v => updateSetting('longBreakDuration', v)} max={60} />
              </Row>
              <View style={s.divider} />
              <Row label="Long Break Interval" sub="sessions">
                <NumberInput value={settings.longBreakInterval} onChange={v => updateSetting('longBreakInterval', v)} min={1} max={10} />
              </Row>
              <View style={s.divider} />
              <Row label="Auto Start Breaks">
                <Toggle value={settings.autoStartBreaks} onValueChange={v => updateSetting('autoStartBreaks', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Auto Start Sessions">
                <Toggle value={settings.autoStartSessions} onValueChange={v => updateSetting('autoStartSessions', v)} />
              </Row>
            </View>

            {/* ── TASK ── */}
            <SectionHeader icon="✅" title="TASK" />
            <View style={s.card}>
              <Row label="Auto Check Tasks" sub="when session ends">
                <Toggle value={settings.autoCheckTasks} onValueChange={v => updateSetting('autoCheckTasks', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Move Completed to Bottom">
                <Toggle value={settings.moveCompletedToBottom} onValueChange={v => updateSetting('moveCompletedToBottom', v)} />
              </Row>
            </View>

            {/* ── SOUND ── */}
            <SectionHeader icon="🔊" title="SOUND" />
            <View style={s.card}>
              <Row label="Alarm Sound">
                <DropdownInput options={ALARM_SOUNDS} value={settings.alarmSound} onChange={v => updateSetting('alarmSound', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Alarm Volume">
                <VolumeInput value={settings.alarmVolume} onChange={v => updateSetting('alarmVolume', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Focus Ambient">
                <DropdownInput options={FOCUS_SOUNDS} value={settings.focusSound} onChange={v => updateSetting('focusSound', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Ambient Volume">
                <VolumeInput value={settings.focusVolume} onChange={v => updateSetting('focusVolume', v)} />
              </Row>
            </View>

            {/* ── THEME ── */}
            <SectionHeader icon="🎨" title="THEME" />
            <View style={s.card}>
              <View style={s.themeSwatchRow}>
                {THEMES.map(t => (
                  <TouchableOpacity
                    key={t.color}
                    onPress={() => updateSetting('colorTheme', t.color)}
                    style={[
                      s.swatch,
                      { backgroundColor: t.color },
                      settings.colorTheme === t.color && s.swatchSelected,
                    ]}
                  />
                ))}
              </View>
              <Text style={s.swatchLabel}>
                {THEMES.find(t => t.color === settings.colorTheme)?.label ?? 'Custom'}
              </Text>
              <View style={s.divider} />
              <Row label="Dark Mode" sub="always on">
                <Toggle value={settings.darkMode} onValueChange={v => updateSetting('darkMode', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Hour Format">
                <DropdownInput options={HOUR_FORMATS} value={settings.hourFormat} onChange={v => updateSetting('hourFormat', v)} />
              </Row>
            </View>

            {/* ── NOTIFICATIONS ── */}
            <SectionHeader icon="🔔" title="NOTIFICATIONS" />
            <View style={s.card}>
              <Row label="Session End">
                <Toggle value={settings.sessionEndNotification} onValueChange={v => updateSetting('sessionEndNotification', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Break End">
                <Toggle value={settings.breakEndNotification} onValueChange={v => updateSetting('breakEndNotification', v)} />
              </Row>
              <View style={s.divider} />
              <Row label="Reminder">
                <DropdownInput options={REMINDERS} value={settings.reminder} onChange={v => updateSetting('reminder', v)} />
              </Row>
            </View>

            {/* ── INTEGRATIONS ── */}
            <SectionHeader icon="🔗" title="INTEGRATIONS" />
            <View style={s.card}>
              {[
                { name: 'Google Calendar', icon: 'calendar-outline' as const },
                { name: 'Apple Calendar', icon: 'calendar-outline' as const },
                { name: 'Todoist', icon: 'checkmark-circle-outline' as const },
              ].map((integration, i) => (
                <React.Fragment key={integration.name}>
                  {i > 0 && <View style={s.divider} />}
                  <View style={s.row}>
                    <View style={s.rowLeft}>
                      <Ionicons name={integration.icon} size={16} color={Colors.textSecondary} style={{ marginRight: 8 }} />
                      <Text style={s.rowLabel}>{integration.name}</Text>
                    </View>
                    <TouchableOpacity style={s.connectBtn}>
                      <Ionicons name="lock-closed-outline" size={12} color={ACCENT} />
                      <Text style={s.connectText}>Connect</Text>
                    </TouchableOpacity>
                  </View>
                </React.Fragment>
              ))}
            </View>
          </ScrollView>

          {/* Save button pinned at bottom */}
          <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity style={s.saveBtn} onPress={handleSave} activeOpacity={0.85}>
              <Text style={s.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <Text style={s.saveNote}>Some changes take effect on next session</Text>
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(2,11,24,0.75)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#061828',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  handle: {
    width: 36, height: 4, borderRadius: 2,
    backgroundColor: Colors.border,
    alignSelf: 'center', marginTop: 10, marginBottom: 4,
  },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: 14,
    borderBottomWidth: 1, borderBottomColor: Colors.border,
  },
  headerTitle: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: Colors.textPrimary },
  closeBtn: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.bgCard, alignItems: 'center', justifyContent: 'center',
  },

  scrollContent: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.md },

  sectionHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginTop: Spacing.lg, marginBottom: Spacing.sm,
  },
  sectionIcon: { fontSize: 15 },
  sectionTitle: {
    fontSize: Fonts.sizes.xs, fontWeight: Fonts.weights.bold,
    color: Colors.textMuted, letterSpacing: 1.2,
  },

  card: {
    backgroundColor: '#0A2035',
    borderRadius: 16, borderWidth: 1, borderColor: Colors.border,
    overflow: 'hidden',
  },
  divider: { height: 1, backgroundColor: Colors.border, marginHorizontal: Spacing.md },

  row: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.md, paddingVertical: 14,
    minHeight: 52,
  },
  rowLeft: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
  rowLabel: { fontSize: Fonts.sizes.base, color: Colors.textPrimary, fontWeight: Fonts.weights.medium },
  rowSub: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, marginTop: 2 },

  numInput: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: Colors.bgSurface, borderRadius: 10,
    borderWidth: 1, borderColor: Colors.border, overflow: 'hidden',
  },
  numBtn: {
    width: 34, height: 36, alignItems: 'center', justifyContent: 'center',
  },
  numValue: {
    minWidth: 36, textAlign: 'center',
    fontSize: Fonts.sizes.sm, color: Colors.textPrimary, fontWeight: Fonts.weights.semibold,
  },

  themeSwatchRow: {
    flexDirection: 'row', gap: 16, padding: Spacing.md, paddingBottom: 8,
  },
  swatch: { width: 40, height: 40, borderRadius: 20 },
  swatchSelected: {
    borderWidth: 3, borderColor: 'white',
    shadowColor: 'white', shadowOpacity: 0.4, shadowRadius: 6, shadowOffset: { width: 0, height: 0 },
  },
  swatchLabel: {
    fontSize: Fonts.sizes.xs, color: Colors.textSecondary,
    paddingHorizontal: Spacing.md, paddingBottom: 10,
  },

  connectBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 7,
    borderRadius: 8, borderWidth: 1, borderColor: ACCENT,
  },
  connectText: { fontSize: Fonts.sizes.sm, color: ACCENT, fontWeight: Fonts.weights.semibold },

  footer: {
    paddingHorizontal: Spacing.lg, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: Colors.border,
    backgroundColor: '#061828',
  },
  saveBtn: {
    backgroundColor: ACCENT, borderRadius: 14,
    paddingVertical: 16, alignItems: 'center',
  },
  saveBtnText: { fontSize: Fonts.sizes.md, fontWeight: Fonts.weights.bold, color: 'white' },
  saveNote: { fontSize: Fonts.sizes.xs, color: Colors.textMuted, textAlign: 'center', marginTop: 8 },

  profileRow: { paddingHorizontal: Spacing.md, paddingVertical: 14 },
  nameInput: {
    fontSize: Fonts.sizes.base,
    color: Colors.textPrimary,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 8,
    backgroundColor: Colors.bgSurface,
  },
});
