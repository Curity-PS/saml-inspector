import { apiClient } from './client';
import type {
  UnsolicitedDefaults,
  UnsolicitedInput,
  UnsolicitedResult
} from '../types/api';

export async function getUnsolicitedDefaults(): Promise<UnsolicitedDefaults> {
  const res = await apiClient.get<UnsolicitedDefaults>('/api/unsolicited/defaults');
  return res.data;
}

export async function getUnsolicitedCert(): Promise<string> {
  const res = await apiClient.get<string>('/api/unsolicited/cert', {
    responseType: 'text'
  });
  return res.data;
}

export async function sendUnsolicited(input: UnsolicitedInput): Promise<UnsolicitedResult> {
  const res = await apiClient.post<UnsolicitedResult>('/api/unsolicited/send', input);
  return res.data;
}
