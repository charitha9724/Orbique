import { useQuery } from '@tanstack/react-query';

import { shrinkPhoto } from '@/lib/listings';
import { supabase } from '@/lib/supabase';

// Everything the app does with chats lives here.

export type ConversationSummary = {
  id: string;
  listing_id: string;
  listing_title: string;
  listing_photo: string | null;
  listing_status: 'active' | 'sold' | 'removed';
  other_id: string;
  other_name: string;
  i_am_seller: boolean;
  last_message: string | null;
  last_message_at: string;
  unread_count: number;
  /** When you last deleted this chat (older messages stay hidden for you). */
  cleared_at: string | null;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  /** Path of a photo in the private chat-photos storage, if the message has one. */
  photo: string | null;
  created_at: string;
  read_at: string | null;
};

/** Open the chat about an item (creates it the first time). Returns its id. */
export async function startConversation(listingId: string): Promise<string> {
  const { data, error } = await supabase.rpc('start_conversation', { item_id: listingId });
  if (error) throw new Error(error.message);
  return data as string;
}

/** Your conversations, newest first. */
export async function fetchConversations(): Promise<ConversationSummary[]> {
  const { data, error } = await supabase.rpc('my_conversations');
  if (error) throw new Error(error.message);
  return (data ?? []) as ConversationSummary[];
}

/** All messages in one conversation, oldest first. */
export async function fetchMessages(conversationId: string): Promise<Message[]> {
  const { data, error } = await supabase
    .from('messages')
    .select('id, conversation_id, sender_id, body, photo, created_at, read_at')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(500);
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

export async function sendMessage(conversationId: string, body: string, photo: string | null = null): Promise<Message> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ conversation_id: conversationId, body, photo })
    .select('id, conversation_id, sender_id, body, photo, created_at, read_at')
    .single();
  if (error) throw new Error(error.message);
  return data as Message;
}

/** Delete one chat, just for you. */
export async function hideConversation(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('hide_conversation', { conversation: conversationId });
  if (error) throw new Error(error.message);
}

/** Delete every chat you have with one person, just for you (not blocking). */
export async function hideConversationsWith(otherId: string): Promise<void> {
  const { error } = await supabase.rpc('hide_conversations_with', { other: otherId });
  if (error) throw new Error(error.message);
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const { error } = await supabase.rpc('mark_conversation_read', { conversation: conversationId });
  if (error) throw new Error(error.message);
}

/** Get told about every new or changed (e.g. now read) message in one conversation. Returns a function that stops listening. */
export function onNewMessage(conversationId: string, handler: (message: Message) => void): () => void {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'messages', filter: `conversation_id=eq.${conversationId}` },
      (payload) => handler(payload.new as Message),
    )
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

/** Get told whenever any of your conversations changes (new message, new chat). */
export function onConversationsChange(handler: () => void): () => void {
  const channel = supabase
    .channel('my-conversations')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, handler)
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, handler)
    .subscribe();
  return () => {
    supabase.removeChannel(channel);
  };
}

const CHAT_PHOTOS = 'chat-photos';

/** Shrink and upload a photo into a conversation's private folder. Returns its storage path. */
export async function uploadChatPhoto(conversationId: string, uri: string): Promise<string> {
  const body = await shrinkPhoto(uri);
  const path = `${conversationId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(CHAT_PHOTOS).upload(path, body, { contentType: 'image/jpeg' });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/** A temporary private link to a chat photo (chat photos are not public). */
export function useChatPhotoUrl(path: string) {
  return useQuery({
    queryKey: ['chat-photo', path],
    queryFn: async () => {
      const { data, error } = await supabase.storage.from(CHAT_PHOTOS).createSignedUrl(path, 60 * 60);
      if (error) throw new Error(error.message);
      return data.signedUrl;
    },
    staleTime: 50 * 60 * 1000, // links last an hour; get a fresh one before then
  });
}

/** Total unread messages across all your chats (for the badge on the Chats tab). */
export function useUnreadTotal(enabled: boolean): number {
  const chats = useQuery({ queryKey: ['conversations'], queryFn: fetchConversations, enabled });
  return (chats.data ?? []).reduce((sum, c) => sum + c.unread_count, 0);
}
