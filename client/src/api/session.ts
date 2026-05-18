import { apiClient } from './client';
import type { SessionInfo } from '../types/api';

export async function getSession(): Promise<SessionInfo> {
  const res = await apiClient.get<SessionInfo>('/api/session');
  return res.data;
}
