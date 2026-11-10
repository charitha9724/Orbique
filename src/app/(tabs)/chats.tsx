import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { Link } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BRAND_COLOR, ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { timeAgo } from '@/constants/listings';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { fetchConversations, hideConversation, hideConversationsWith, type ConversationSummary } from '@/lib/chat';
import { photoUrl } from '@/lib/listings';
import { confirmAction } from '@/lib/safety';

// Chats: all your conversations, newest first.
export default function ChatsScreen() {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const chats = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations });
  const [menuFor, setMenuFor] = useState<ConversationSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  const name = menuFor?.other_name || 'this person';

  const deleteOne = async () => {
    const chat = menuFor;
    setMenuFor(null);
    if (!chat) return;
    const ok = await confirmAction(
      'Delete this chat?',
      `The chat with ${chat.other_name || 'this person'} about "${chat.listing_title}" will be removed from your list. They keep their copy. If they message again, it comes back.`,
      'Delete',
    );
    if (!ok) return;
    try {
      await hideConversation(chat.id);
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const deleteAllWithPerson = async () => {
    const chat = menuFor;
    setMenuFor(null);
    if (!chat) return;
    const who = chat.other_name || 'this person';
    const ok = await confirmAction(
      `Delete all chats with ${who}?`,
      `Every chat with ${who} will be removed from your list. This is not blocking: they can still message you, and the chat will come back if they do.`,
      'Delete all',
    );
    if (!ok) return;
    try {
      await hideConversationsWith(chat.other_id);
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setError((e as Error).message);
    }
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex} edges={['top']}>
        <FlatList
          data={chats.data ?? []}
          keyExtractor={(c) => c.id}
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View style={styles.header}>
              <ThemedText type="subtitle">Chats</ThemedText>
              {chats.error ? <ErrorText>{(chats.error as Error).message}</ErrorText> : null}
              {error ? <ErrorText>{error}</ErrorText> : null}
            </View>
          }
          renderItem={({ item, index }) => (
            <ChatRow chat={item} index={index} onMore={() => setMenuFor(item)} />
          )}
          ListEmptyComponent={
            chats.isLoading ? (
              <ActivityIndicator />
            ) : chats.error ? undefined : (
              <View style={[styles.empty, { backgroundColor: theme.backgroundElement }]}>
                <Icon name="chatbubbles-outline" size={40} color={theme.textSecondary} />
                <ThemedText type="smallBold">No chats yet</ThemedText>
                <ThemedText type="small" themeColor="textSecondary" style={styles.centerText}>
                  Open an item and tap &quot;Message seller&quot; to start one.
                </ThemedText>
              </View>
            )
          }
        />
      </SafeAreaView>

      {/* Options for one chat */}
      <Modal visible={!!menuFor} transparent animationType="fade" onRequestClose={() => setMenuFor(null)}>
        <Pressable style={styles.backdrop} onPress={() => setMenuFor(null)}>
          <Pressable onPress={() => {}} style={styles.sheetWrap}>
            <ThemedView type="backgroundElement" style={styles.sheet}>
              <ThemedText type="smallBold" style={styles.sheetTitle} numberOfLines={1}>
                {name} · {menuFor?.listing_title}
              </ThemedText>
              <Pressable style={styles.sheetItem} onPress={deleteOne}>
                <Icon name="trash-outline" size={18} color="#E5484D" />
                <ThemedText style={styles.danger}>Delete this chat</ThemedText>
              </Pressable>
              <Pressable style={styles.sheetItem} onPress={deleteAllWithPerson}>
                <Icon name="person-remove-outline" size={18} color="#E5484D" />
                <ThemedText style={styles.danger}>Delete all chats with {name}</ThemedText>
              </Pressable>
              <Pressable style={styles.sheetItem} onPress={() => setMenuFor(null)}>
                <ThemedText themeColor="textSecondary">Cancel</ThemedText>
              </Pressable>
            </ThemedView>
          </Pressable>
        </Pressable>
      </Modal>
    </ThemedView>
  );
}

function ChatRow({ chat, index, onMore }: { chat: ConversationSummary; index: number; onMore: () => void }) {
  const theme = useTheme();
  const unread = chat.unread_count > 0;
  return (
    <Animated.View
      entering={FadeInDown.delay(Math.min(index, 8) * 50).duration(400)}
      style={[styles.row, { backgroundColor: theme.backgroundElement }]}>
      <Link href={{ pathname: '/chat/[id]', params: { id: chat.id } }} asChild>
        <Pressable style={styles.rowMain}>
          {chat.listing_photo ? (
            <Image source={{ uri: photoUrl(chat.listing_photo) }} style={styles.thumb} contentFit="cover" />
          ) : (
            <View style={[styles.thumb, { backgroundColor: theme.backgroundSelected }]} />
          )}
          <View style={styles.text}>
            <View style={styles.topLine}>
              <ThemedText type="smallBold" numberOfLines={1} style={styles.flex}>
                {chat.other_name || 'Someone'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {timeAgo(chat.last_message_at)}
              </ThemedText>
            </View>
            <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
              {chat.i_am_seller ? 'Your item: ' : ''}
              {chat.listing_title}
              {chat.listing_status === 'sold' ? ' (sold)' : ''}
            </ThemedText>
            <View style={styles.topLine}>
              {chat.last_message === '📷 Photo' ? (
                <Icon name="camera-outline" size={14} color={theme.textSecondary} />
              ) : null}
              <ThemedText
                type="small"
                numberOfLines={1}
                style={[styles.flex, unread && styles.unreadText]}
                themeColor={unread ? 'text' : 'textSecondary'}>
                {chat.last_message === '📷 Photo' ? 'Photo' : (chat.last_message ?? 'No messages yet')}
              </ThemedText>
              {unread ? (
                <View style={styles.badge}>
                  <ThemedText type="smallBold" style={styles.badgeText}>
                    {chat.unread_count}
                  </ThemedText>
                </View>
              ) : null}
            </View>
          </View>
        </Pressable>
      </Link>
      <Pressable
        onPress={onMore}
        accessibilityRole="button"
        accessibilityLabel={`Options for chat with ${chat.other_name || 'this person'}`}
        hitSlop={8}
        style={styles.more}>
        <Icon name="ellipsis-horizontal" size={20} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  centerText: { textAlign: 'center' },
  list: {
    width: '100%',
    maxWidth: 800,
    alignSelf: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.six + Spacing.three,
    paddingBottom: BottomTabInset + Spacing.six,
    gap: Spacing.two,
  },
  header: {
    gap: Spacing.two,
    marginBottom: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingLeft: Spacing.two + 4,
    paddingVertical: Spacing.two + 4,
  },
  rowMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: 14,
  },
  text: {
    flex: 1,
    gap: 2,
  },
  topLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  unreadText: {
    fontWeight: 700,
  },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    paddingHorizontal: 6,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: '#fff',
    fontSize: 12,
    lineHeight: 16,
  },
  more: {
    paddingHorizontal: Spacing.three,
    alignSelf: 'stretch',
    justifyContent: 'center',
  },
  empty: {
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.five,
    borderRadius: 24,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
    alignItems: 'center',
    padding: Spacing.three,
  },
  sheetWrap: {
    width: '100%',
    maxWidth: 480,
    marginBottom: Spacing.four,
  },
  sheet: {
    borderRadius: 22,
    paddingVertical: Spacing.two,
  },
  sheetTitle: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  sheetItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  danger: {
    color: '#E5484D',
    fontWeight: 600,
  },
});
