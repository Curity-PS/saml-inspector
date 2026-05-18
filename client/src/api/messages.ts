import { apiClient } from './client';
import type { DecodedMessage, MessageStore } from '../types/api';

export async function getMessages(): Promise<MessageStore> {
  const res = await apiClient.get<MessageStore>('/api/messages');
  return res.data;
}

export async function clearMessages(): Promise<void> {
  await apiClient.delete('/api/messages');
}

export async function decodeMessage(
  message: string,
  isEncoded: boolean = true
): Promise<DecodedMessage> {
  const res = await apiClient.post<DecodedMessage>('/api/decode', { message, isEncoded });
  return res.data;
}
