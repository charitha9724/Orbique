import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, ChoiceList, ErrorText, TextField } from '@/components/form';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { fileReport, REPORT_REASONS, type ReportReason, type ReportTarget } from '@/lib/safety';

type Props = {
  /** What is being reported; null hides the dialog. */
  target: ReportTarget | null;
  /** Shown in the title, e.g. "this item". */
  label: string;
  onClose: () => void;
};

// A pop-up to report an item, a message or a person.
export function ReportDialog({ target, label, onClose }: Props) {
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const close = () => {
    setReason(null);
    setDetails('');
    setError(null);
    setDone(false);
    onClose();
  };

  const submit = async () => {
    if (!target) return;
    if (!reason) {
      setError('Pick a reason');
      return;
    }
    setSending(true);
    setError(null);
    try {
      await fileReport(target, reason, details);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    }
    setSending(false);
  };

  return (
    <Modal visible={!!target} transparent animationType="fade" onRequestClose={close}>
      <Pressable style={styles.backdrop} onPress={close}>
        <Pressable onPress={() => {}} style={styles.cardWrap}>
          <ThemedView type="backgroundElement" style={styles.card}>
            {done ? (
              <>
                <ThemedText type="smallBold">Thanks for reporting</ThemedText>
                <ThemedText themeColor="textSecondary">
                  We&apos;ll review it. If someone is bothering you, you can also block them.
                </ThemedText>
                <Button title="Close" onPress={close} />
              </>
            ) : (
              <>
                <ThemedText type="smallBold">Report {label}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  What&apos;s wrong?
                </ThemedText>
                <ChoiceList options={REPORT_REASONS} value={reason} onChange={(r) => setReason(r as ReportReason)} />
                <TextField
                  label="More details (optional)"
                  value={details}
                  onChangeText={setDetails}
                  multiline
                  maxLength={1000}
                  style={styles.details}
                />
                {error ? <ErrorText>{error}</ErrorText> : null}
                <View style={styles.buttons}>
                  <View style={styles.flex}>
                    <Button title="Cancel" variant="secondary" onPress={close} />
                  </View>
                  <View style={styles.flex}>
                    <Button title="Send report" onPress={submit} loading={sending} />
                  </View>
                </View>
              </>
            )}
          </ThemedView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    borderRadius: Spacing.three,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  details: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  flex: { flex: 1 },
});
