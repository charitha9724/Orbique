import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { Platform, View } from 'react-native';

import AppTabs from '@/components/app-tabs';
import { HelpOrb } from '@/components/help-orb';
import { BottomTabInset } from '@/constants/theme';
import { onConversationsChange } from '@/lib/chat';

// The main app once you're logged in: Home, Sell, Chats and Profile tabs,
// plus the glowing help button in the corner.
export default function TabsLayout() {
  const queryClient = useQueryClient();

  // Whenever a message arrives or is read, refresh the chat list and the unread count.
  useEffect(
    () => onConversationsChange(() => queryClient.invalidateQueries({ queryKey: ['conversations'] })),
    [queryClient],
  );

  return (
    <View style={{ flex: 1 }}>
      <AppTabs />
      <HelpOrb bottom={Platform.OS === 'web' ? 28 : BottomTabInset + 24} />
    </View>
  );
}
