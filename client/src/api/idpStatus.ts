import { apiClient } from './client';
import type { IdpReachability } from '../types/api';

export async function getIdpStatus(): Promise<IdpReachability> {
  const res = await apiClient.get<IdpReachability>('/api/idp-status');
  return res.data;
}
