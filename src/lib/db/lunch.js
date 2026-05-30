import { supabase } from '@/lib/supabase';
import { createEntity } from './_createEntity';

export const Seat = createEntity('seats');
export const RestaurantTable = createEntity('restaurant_tables');
export const Reservation = createEntity('reservations');
export const GlobalSettings = createEntity('global_settings');
export const EventHistory = createEntity('event_history');
export const UpcomingEvent = createEntity('upcoming_events');
export const User = createEntity('profiles');

// chat_messages is locked at the DB level (RLS + no grants). All access goes
// through SECURITY DEFINER RPCs that authenticate via seats.guest_token.
export const Chat = {
  async listDm(token, peerSeatId, limit = 200) {
    const { data, error } = await supabase.rpc('list_dm', {
      p_token: token,
      p_peer_seat_id: peerSeatId,
      p_limit: limit,
    });
    if (error) throw error;
    return data || [];
  },
  async sendDm(token, peerSeatId, content) {
    const { data, error } = await supabase.rpc('send_dm', {
      p_token: token,
      p_to_seat_id: peerSeatId,
      p_content: content,
    });
    if (error) throw error;
    return data;
  },
  async listTable(token, limit = 200) {
    const { data, error } = await supabase.rpc('list_table_msgs', {
      p_token: token,
      p_limit: limit,
    });
    if (error) throw error;
    return data || [];
  },
  async sendTable(token, content) {
    const { data, error } = await supabase.rpc('send_table_msg', {
      p_token: token,
      p_content: content,
    });
    if (error) throw error;
    return data;
  },
  async recent(token, since) {
    const { data, error } = await supabase.rpc('chat_recent_for', {
      p_token: token,
      p_since: since instanceof Date ? since.toISOString() : since,
    });
    if (error) throw error;
    return data || [];
  },
  async adminClearAll(secret) {
    const { error } = await supabase.rpc('admin_clear_all_chats', { p_secret: secret });
    if (error) throw error;
  },
};

// Auth helpers — utilisés majoritairement par lunch (EventPlanning, AdminControl,
// Dashboard, Index, FeedbackButton, LaunchEventWizard) + qq edge cases RSA
// (AddJurorModal, storage.js).
export async function getCurrentUser() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', user.email)
    .single();
  return profile;
}

// File upload helper — bucket 'uploads' (public legacy, à locker en V2.1).
export async function uploadFile(file) {
  const fileName = `${Date.now()}_${file.name}`;
  const { error } = await supabase.storage.from('uploads').upload(fileName, file);
  if (error) throw error;
  const { data } = supabase.storage.from('uploads').getPublicUrl(fileName);
  return { file_url: data.publicUrl };
}
