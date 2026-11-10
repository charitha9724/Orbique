import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BRAND_COLOR } from '@/components/form';
import { GlowOrb } from '@/components/help-orb';
import { Icon } from '@/components/icon';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { findHelpTopic, HELP_TOPICS, STARTER_QUESTIONS, type HelpTopic } from '@/constants/help';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

type Line =
  | { id: number; kind: 'welcome' }
  | { id: number; kind: 'me'; text: string }
  | { id: number; kind: 'bot'; text: string; suggestions?: HelpTopic[] }
  | { id: number; kind: 'typing' };

const TINT = 'rgba(6, 106, 103, 0.18)';

const starters = STARTER_QUESTIONS.map((id) => HELP_TOPICS.find((t) => t.id === id)).filter(
  (t): t is HelpTopic => !!t,
);

// Help: a small built-in helper that answers common questions (no internet AI needed).
export default function HelpScreen() {
  const router = useRouter();
  const theme = useTheme();
  const [lines, setLines] = useState<Line[]>([{ id: 0, kind: 'welcome' }]);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const nextId = useRef(1);
  const listRef = useRef<FlatList<Line>>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 50);
  }, [lines.length]);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  // Show the question, a short "typing..." moment, then the answer.
  const reply = (question: string, answer: string, suggestions?: HelpTopic[]) => {
    if (busy) return;
    setBusy(true);
    const typingId = nextId.current + 1;
    setLines((current) => [
      ...current,
      { id: nextId.current, kind: 'me', text: question },
      { id: typingId, kind: 'typing' },
    ]);
    nextId.current += 2;
    timer.current = setTimeout(() => {
      setLines((current) => [
        ...current.filter((l) => l.id !== typingId),
        { id: nextId.current++, kind: 'bot', text: answer, suggestions },
      ]);
      setBusy(false);
    }, 650);
  };

  const askTopic = (topic: HelpTopic) => reply(topic.question, topic.answer, related(topic));

  const ask = () => {
    const question = text.trim();
    if (!question || busy) return;
    setText('');
    const topic = findHelpTopic(question);
    if (topic) {
      reply(question, topic.answer, related(topic));
    } else if (/^(hi+|hello|hey|namaste|good (morning|evening|afternoon))\b/i.test(question)) {
      reply(question, 'Hello! What can I help you with?', starters);
    } else {
      reply(
        question,
        "Sorry, I'm not sure about that one. Try asking in a different way, or pick one of these:",
        HELP_TOPICS.slice(0, 8),
      );
    }
  };

  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

  const renderLine = ({ item }: { item: Line }) => {
    if (item.kind === 'welcome') {
      return (
        <View style={styles.welcome}>
          <GlowOrb size={84} icon="sparkles" />
          <ThemedText type="subtitle" style={styles.center}>
            Hi! How can I help?
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.center}>
            Ask me anything about buying, selling or staying safe on Orbique, or tap a question.
          </ThemedText>
          <Chips topics={starters} onPick={askTopic} disabled={busy} centered />
        </View>
      );
    }
    if (item.kind === 'me') {
      return (
        <View style={[styles.row, styles.right]}>
          <View style={[styles.bubble, styles.mine]}>
            <ThemedText style={styles.mineText}>{item.text}</ThemedText>
          </View>
        </View>
      );
    }
    return (
      <View style={styles.botBlock}>
        <View style={[styles.row, styles.left]}>
          <GlowOrb size={30} pulse={false} icon="sparkles" />
          <View style={[styles.bubble, styles.theirs, { backgroundColor: theme.backgroundElement }]}>
            {item.kind === 'typing' ? (
              <ThemedText themeColor="textSecondary" style={styles.typing}>
                • • •
              </ThemedText>
            ) : (
              <ThemedText>{item.text}</ThemedText>
            )}
          </View>
        </View>
        {item.kind === 'bot' && item.suggestions?.length ? (
          <View style={styles.indent}>
            <ThemedText type="small" themeColor="textSecondary">
              You might also ask:
            </ThemedText>
            <Chips topics={item.suggestions} onPick={askTopic} disabled={busy} />
          </View>
        ) : null}
      </View>
    );
  };

  return (
    <ThemedView style={styles.flex}>
      <SafeAreaView style={styles.flex}>
        <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.page}>
            <View style={[styles.header, { borderColor: theme.backgroundElement }]}>
              <Pressable onPress={goBack} accessibilityRole="button">
                <ThemedText type="linkPrimary">‹ Back</ThemedText>
              </Pressable>
              <GlowOrb size={36} pulse={false} icon="sparkles" />
              <View style={styles.flex}>
                <ThemedText type="smallBold">Orbique helper</ThemedText>
                <View style={styles.online}>
                  <View style={styles.dot} />
                  <ThemedText type="small" themeColor="textSecondary">
                    Always here, answers instantly
                  </ThemedText>
                </View>
              </View>
            </View>

            <FlatList
              ref={listRef}
              style={styles.flex}
              data={lines}
              keyExtractor={(l) => String(l.id)}
              contentContainerStyle={styles.messages}
              renderItem={renderLine}
            />

            <View style={styles.composer}>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Ask a question..."
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={ask}
                returnKeyType="send"
                style={[styles.input, { color: theme.text, backgroundColor: theme.backgroundElement }]}
              />
              <Pressable
                onPress={ask}
                disabled={!text.trim() || busy}
                accessibilityRole="button"
                accessibilityLabel="Ask"
                style={[styles.sendButton, (!text.trim() || busy) && styles.disabled]}>
                <Icon name="arrow-up" size={22} color="#fff" />
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </ThemedView>
  );
}

function Chips({
  topics,
  onPick,
  disabled,
  centered,
}: {
  topics: HelpTopic[];
  onPick: (topic: HelpTopic) => void;
  disabled: boolean;
  centered?: boolean;
}) {
  return (
    <View style={[styles.chips, centered && styles.chipsCentered]}>
      {topics.map((t) => (
        <Pressable
          key={t.id}
          onPress={() => onPick(t)}
          disabled={disabled}
          style={({ pressed }) => [styles.chip, { backgroundColor: TINT }, pressed && styles.pressed]}>
          <ThemedText type="small" style={styles.chipText}>
            {t.question}
          </ThemedText>
        </Pressable>
      ))}
    </View>
  );
}

/** A few other questions to suggest after an answer. */
function related(topic: HelpTopic): HelpTopic[] {
  const i = HELP_TOPICS.indexOf(topic);
  return [1, 2, 3].map((k) => HELP_TOPICS[(i + k) % HELP_TOPICS.length]);
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  center: { textAlign: 'center' },
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
    paddingVertical: Spacing.two + 2,
    borderBottomWidth: 1,
  },
  online: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#30A46C',
  },
  messages: {
    padding: Spacing.three,
    gap: Spacing.three,
  },
  welcome: {
    alignItems: 'center',
    gap: Spacing.three,
    paddingVertical: Spacing.five,
    paddingHorizontal: Spacing.two,
  },
  botBlock: {
    gap: Spacing.two,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: Spacing.two,
  },
  left: { justifyContent: 'flex-start' },
  right: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two + 2,
    borderRadius: 20,
  },
  mine: {
    backgroundColor: BRAND_COLOR,
    borderBottomRightRadius: 6,
  },
  theirs: {
    borderBottomLeftRadius: 6,
  },
  mineText: { color: '#EAF5F4' },
  typing: {
    letterSpacing: 2,
  },
  indent: {
    marginLeft: 38,
    gap: Spacing.one + 2,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
    gap: Spacing.two,
  },
  chipsCentered: {
    justifyContent: 'center',
  },
  chip: {
    borderRadius: Spacing.five,
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
  },
  chipText: {
    color: BRAND_COLOR,
    fontWeight: 600,
  },
  pressed: {
    opacity: 0.7,
  },
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    padding: Spacing.three,
  },
  input: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    paddingHorizontal: Spacing.four,
    fontSize: 16,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: BRAND_COLOR,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: {
    opacity: 0.4,
  },
});
