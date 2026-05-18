import { apiClient } from './client';
import type {
  ConfigUpdate,
  MetadataType,
  ParseMetadataResponse,
  SamlConfigSnapshot
} from '../types/api';

export async function getConfig(): Promise<SamlConfigSnapshot> {
  const res = await apiClient.get<SamlConfigSnapshot>('/api/config');
  return res.data;
}

export async function updateConfig(update: ConfigUpdate): Promise<void> {
  await apiClient.post('/api/config', update);
}

export async function parseMetadata(
  metadata: string,
  type: MetadataType
): Promise<ParseMetadataResponse> {
  const res = await apiClient.post<ParseMetadataResponse>('/api/parse-metadata', {
    metadata,
    type
  });
  return res.data;
}
