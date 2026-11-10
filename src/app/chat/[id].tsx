import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BRAND_COLOR, ErrorText } from '@/components/form';
import { Icon } from '@/components/icon';
import { ReportDialog } from '@/components/report-dialog';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useAuth } from '@/lib/auth';
import {
  fetchConversations,
  fetchMessages,
  hideConversation,
  markConversationRead,
  onNewMessage,
  sendMessage,
  uploadChatPhoto,
  useChatPhotoUrl,
  type Message,
} from '@/lib/chat';
import { photoUrl } from '@/lib/listings';
import { blockUser, confirmAction, unblockUser, useBlockStatus, type ReportTarget } from '@/lib/safety';

// One conversation: the item at the top, messages, and a box to type in.
export default function ChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const theme = useTheme();
  const queryClient = useQueryClient();
  const { session } = useAuth();
  const myId = session?.user.id;

  const chats = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations });
  const chat = chats.data?.find((c) => c.id === id);
  const blockStatus = useBlockStatus(chat?.other_id);
  const blocked = blockStatus.data === 'i_blocked' || blockStatus.data === 'blocked_me';
  const [menuOpen, setMenuOpen] = useState(false);
  const [report, setReport] = useState<{ target: ReportTarget; label: string } | null>(null);

  const deleteChat = async () => {
    setMenuOpen(false);
    const ok = await confirmAction(
      'Delete this chat?',
      'It will be removed from your Chats list. The other person keeps their copy. If they message again, it comes back.',
      'Delete',
    );
    if (!ok) return;
    try {
      await hideConversation(id);
      await queryClient.invalidateQueries({ queryKey: ['conversations'] });
      if (router.canGoBack()) router.back();
      else router.replace('/chats');
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggleBlock = async () => {
    setMenuOpen(false);
    if (!chat) return;
    const blocking = blockStatus.data !== 'i_blocked';
    if (blocking) {
      const ok = await confirmAction(
        `Block ${chat.other_name || 'this person'}?`,
        "Neither of you will be able to message the other, and you won't see their items. You can unblock them later in Profile.",
        'Block',
      );
      if (!ok) return;
    }
    try {
      if (blocking) await blockUser(chat.other_id);
      else await unblockUser(chat.other_id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['block-status'] }),
        queryClient.invalidateQueries({ queryKey: ['blocked'] }),
        queryClient.invalidateQueries({ queryKey: ['feed'] }),
      ]);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const listRef = useRef<FlatList<Message>>(null);

  // Load the messages, then listen for new ones live.
  useEffect(() => {
    let active = true;
    const addMessage = (m: Message) =>
      setMessages((current) =>
        current.some((x) => x.id === m.id) ? current.map((x) => (x.id === m.id ? m : x)) : [...current, m],
      );

    const stop = onNewMessage(id, (m) => {
      addMessage(m);
      if (m.sender_id !== myId && !m.read_at) {
        markConversationRead(id)
          .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
          .catch(() => {});
      }
    });

    fetchMessages(id)
      .then((loaded) => {
        if (!active) return;
        setMessages((current) => {
          const known = new Set(loaded.map((m) => m.id));
          return [...loaded, ...current.filter((m) => !known.has(m.id))];
        });
        setLoading(false);
        return markConversationRead(id);
      })
      .then(() => queryClient.invalidateQueries({ queryKey: ['conversations'] }))
      .catch((e: Error) => {
        if (!active) return;
        setError(e.message);
        setLoading(false);
      });

    return () => {
      active = false;
      stop();
    };
  }, [id, myId, queryClient]);

  // Keep the newest message in view.
  useEffect(() => {
    if (messages.length) setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [messages.length]);

  const send = async (photo: string | null = null) => {
    const body = text.trim();
    if ((!body && !photo) || sending) return;
    setSending(true);
    setError(null);
    try {
      const sent = await sendMessage(id, body, photo);
      setText('');
      setMessages((current) => (current.some((x) => x.id === sent.id) ? current : [...current, sent]));
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    } catch (e) {
      setError((e as Error).message);
    }
    setSending(false);
  };

  // Pick a photo, shrink and upload it privately, then send it (with any typed text).
  const sendPhoto = async () => {
    if (sending) return;
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 1 });
    if (result.canceled || !result.assets[0]) return;
    setSending(true);
    setError(null);
    let path: string;
    try {
      path = await uploadChatPhoto(id, result.assets[0].uri);
    } catch (e) {
      setError((e as Error).message);
      setSending(false);
      return;
    }
    setSending(false);
    await send(path);
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/chats'));

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.page}>
            {/* Header: back, who you're talking to, and the item */}
            <View style={[styles.header, { borderColor: theme.backgroundElement }]}>
              <Pressable onPress={goBack} accessibilityRole="button">
                <ThemedText type="linkPrimary">‹ Back</ThemedText>
              </Pressable>
              {chat ? (
                <Link href={{ pathname: '/listing/[id]', params: { id: chat.listing_id } }} asChild>
                  <Pressable style={styles.item}>
                    {chat.listing_photo ? (
                      <Image source={{ uri: photoUrl(chat.listing_photo) }} style={styles.thumb} contentFit="cover" />
                    ) : null}
                    <View style={styles.flex}>
                      <ThemedText type="smallBold" numberOfLines={1}>
                        {chat.other_name || 'Someone'}
                      </ThemedText>
                      <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                        {chat.listing_title}
                        {chat.listing_status === 'sold' ? ' (sold)' : ''}
                      </ThemedText>
                    </View>
                  </Pressable>
                </Link>
              ) : null}
              {chat ? (
                <Pressable
                  onPress={() => setMenuOpen((open) => !open)}
                  accessibilityRole="button"
                  accessibilityLabel="Chat options"
                  style={styles.menuButton}>
                  <Icon name="ellipsis-horizontal" size={22} />
                </Pressable>
              ) : null}
            </View>

            {menuOpen && chat ? (
              <View style={[styles.menu, { backgroundColor: theme.backgroundElement }]}>
                <Pressable
                  style={styles.menuItem}
                  onPress={() => {
                    setMenuOpen(false);
                    setReport({ target: { type: 'user', id: chat.other_id }, label: chat.other_name || 'this person' });
                  }}>
                  <ThemedText>Report {chat.other_name || 'this person'}</ThemedText>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={toggleBlock}>
                  <ThemedText>
                    {blockStatus.data === 'i_blocked' ? 'Unblock' : 'Block'} {chat.other_name || 'this person'}
                  </ThemedText>
                </Pressable>
                <Pressable style={styles.menuItem} onPress={deleteChat}>
                  <ThemedText style={{ color: '#E5484D' }}>Delete this chat</ThemedText>
                </Pressable>
                <ThemedText type="small" themeColor="textSecondary" style={styles.menuHint}>
                  Tip: press and hold one of their messages to report just that message.
                </ThemedText>
              </View>
            ) : null}

            {loading ? (
              <ActivityIndicator style={styles.flex} />
            ) : (
              <FlatList
                ref={listRef}
                style={styles.flex}
                data={chat?.cleared_at ? messages.filter((m) => m.created_at > chat.cleared_at!) : messages}
                keyExtractor={(m) => m.id}
                contentContainerStyle={styles.messages}
                renderItem={({ item }) => (
                  <Bubble
                    message={item}
                    mine={item.sender_id === myId}
                    onReport={() => setReport({ target: { type: 'message', id: item.id }, label: 'this message' })}
                  />
                )}
                ListEmptyComponent={
                  <ThemedText themeColor="textSecondary" style={styles.center}>
                    Say hi! Ask if it&apos;s still available, or suggest where to meet.
                  </ThemedText>
                }
              />
            )}

            {error ? <ErrorText>{error}</ErrorText> : null}

            <ReportDialog target={report?.target ?? null} label={report?.label ?? ''} onClose={() => setReport(null)} />

            {/* Type and send (or why you can't) */}
            {blocked ? (
              <ThemedText themeColor="textSecondary" style={styles.blockedNote}>
                {blockStatus.data === 'i_blocked'
                  ? 'You blocked this person. Unblock them from the menu (top right) to chat again.'
                  : "You can't reply to this conversation."}
              </ThemedText>
            ) : (
            <View style={styles.composer}>
              <Pressable
                onPress={sendPhoto}
                disabled={sending}
                accessibilityRole="button"
                accessibilityLabel="Send a photo"
                style={[styles.photoButton, { backgroundColor: theme.backgroundElement }, sending && styles.disabled]}>
                <Icon name="camera-outline" size={22} />
              </Pressable>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Write a message"
                placeholderTextColor={theme.textSecondary}
                multiline
                maxLength={2000}
                onKeyPress={(e) => {
                  // On the web, Enter sends and Shift+Enter makes a new line.
                  const ev = e.nativeEvent as unknown as { key: string; shiftKey?: boolean };
                  if (Platform.OS === 'web' && ev.key === 'Enter' && !ev.shiftKey) {
                    (e as unknown as { preventDefault: () => void }).preventDefault();
                    send(null);
                  }
                }}
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <Pressable
                onPress={() => send(null)}
                disabled={sending || !text.trim()}
                accessibilityRole="button"
                style={[styles.sendButton, (sending || !text.trim()) && styles.disabled]}>
                {sending ? <ActivityIndicator color="#fff" /> : <ThemedText style={styles.sendText}>Send</ThemedText>}
              </Pressable>
            </View>
            )}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Bubble({ message, mine, onReport }: { message: Message; mine: boolean; onReport: () => void }) {
  const theme = useTheme();
  const time = new Date(message.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  return (
    <View style={[styles.bubbleRow, mine ? styles.right : styles.left]}>
      <Pressable
        onLongPress={mine ? undefined : onReport}
        delayLongPress={500}
        style={[styles.bubble, { backgroundColor: mine ? BRAND_COLOR : theme.backgroundElement }]}>
        {message.photo ? <ChatPhoto path={message.photo} /> : null}
        {message.body ? <ThemedText style={mine ? styles.mineText : undefined}>{message.body}</ThemedText> : null}
        <ThemedText type="small" style={[styles.time, mine ? styles.mineTime : { color: theme.textSecondary }]}>
          {time}
          {mine && message.read_at ? ' · Seen' : ''}
        </ThemedText>
      </Pressable>
    </View>
  );
}

// A private chat photo. Tap it to open it full size in a new tab (web).
function ChatPhoto({ path }: { path: string }) {
  const url = useChatPhotoUrl(path);
  if (url.isLoading) return <ActivityIndicator style={styles.chatPhoto} />;
  if (!url.data) return <ThemedText type="small">Photo unavailable</ThemedText>;
  return (
    <Pressable
      onPress={() => {
        if (Platform.OS === 'web') window.open(url.data, '_blank', 'noopener');
      }}>
      <Image source={{ uri: url.data }} style={styles.chatPhoto} contentFit="cover" transition={150} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  page: {
    flex: 1,
    width: '100%',
    maxWidth: 700,
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    borderBottomWidth: 1,
  },
  item: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  thumb: {
    width: 40,
    height: 40,
    borderRadius: Spacing.two,
  },
  messages: {
    padding: Spacing.three,
    gap: Spacing.two,
    flexGrow: 1,
  },
  center: {
    textAlign: 'center',
    marginTop: Spacing.five,
  },
  bubbleRow: {
    flexDirection: 'row',
  },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '80%',
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  mineText: { color: '#EAF5F4' },
  time: {
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
    alignSelf: 'flex-end',
  },
  mineTime: { color: 'rgba(234,245,244,0.8)' },
  menuButton: {
    paddingHorizontal: Spacing.two,
  },
  menu: {
    marginHorizontal: Spacing.three,
    marginTop: Spacing.two,
    borderRadius: Spacing.three,
    paddingVertical: Spacing.one,
  },
  menuItem: {
    paddingVertical: Spacing.two + 2,
    paddingHorizontal: Spacing.three,
  },
  menuHint: {
    paddingHorizontal: Spacing.three,
    paddingBottom: Spacing.two,
  },
  blockedNote: {
    textAlign: 'center',
    padding: Spacing.four,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    borderRadius: Spacing.three,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    fontSize: 16,
  },
  photoButton: {
    width: 44,
    height: 44,
    borderRadius: Spacing.three,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chatPhoto: {
    width: 220,
    height: 220,
    borderRadius: Spacing.two,
    marginBottom: Spacing.one,
  },
  sendButton: {
    height: 44,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.three,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendText: {
    color: '#fff',
    fontWeight: 600,
  },
  disabled: {
    opacity: 0.5,
  },
});
