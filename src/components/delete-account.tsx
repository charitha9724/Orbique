import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, ErrorText, TextField } from '@/components/form';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { deleteMyAccount } from '@/lib/account';

const DANGER = '#E5484D';
const CONFIRM_WORD = 'DELETE';

// "Delete my account" on the Profile tab, with a type-to-confirm pop-up.
export function DeleteAccount({ userId }: { userId: string }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const close = () => {
    if (busy) return;
    setOpen(false);
    setTyped('');
    setError(null);
  };

  const confirm = async () => {
    if (typed.trim().toUpperCase() !== CONFIRM_WORD) {
      setError(`Type ${CONFIRM_WORD} to confirm`);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await deleteMyAccount(userId);
      // Logging out sends the app back to the Welcome screen by itself.
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        style={({ pressed }) => [styles.link, pressed && styles.pressed]}>
        <Icon name="trash-outline" size={18} color={DANGER} />
        <ThemedText style={styles.dangerText}>Delete my account</ThemedText>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={close}>
        <Pressable style={styles.backdrop} onPress={close}>
          <Pressable onPress={() => {}} style={styles.cardWrap}>
            <ThemedView type="backgroundElement" style={styles.card}>
              <View style={styles.titleRow}>
                <Icon name="warning-outline" size={22} color={DANGER} />
                <ThemedText type="smallBold" style={styles.title}>
                  Delete your account?
                </ThemedText>
              </View>
              <ThemedText themeColor="textSecondary">
                This permanently deletes your profile, all your items and their photos, and all your chats. It
                can&apos;t be undone.
              </ThemedText>
              <TextField
                label={`Type ${CONFIRM_WORD} to confirm`}
                value={typed}
                onChangeText={setTyped}
                autoCapitalize="characters"
                autoCorrect={false}
                placeholder={CONFIRM_WORD}
              />
              {error ? <ErrorText>{error}</ErrorText> : null}
              <View style={styles.buttons}>
                <View style={styles.flex}>
                  <Button title="Cancel" variant="secondary" onPress={close} />
                </View>
                <Pressable
                  onPress={confirm}
                  disabled={busy}
                  accessibilityRole="button"
                  style={({ pressed }) => [styles.deleteButton, (pressed || busy) && styles.pressed]}>
                  <ThemedText style={styles.deleteText}>{busy ? 'Deleting...' : 'Delete forever'}</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.two,
    paddingVertical: Spacing.three,
  },
  pressed: { opacity: 0.7 },
  dangerText: {
    color: DANGER,
    fontWeight: 600,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(1,31,30,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.three,
  },
  cardWrap: {
    width: '100%',
    maxWidth: 440,
  },
  card: {
    borderRadius: 22,
    padding: Spacing.four,
    gap: Spacing.three,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  title: {
    fontSize: 18,
    lineHeight: 24,
  },
  buttons: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  deleteButton: {
    flex: 1,
    minHeight: 52,
    borderRadius: 16,
    backgroundColor: DANGER,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteText: {
    color: '#fff',
    fontWeight: 700,
  },
});
