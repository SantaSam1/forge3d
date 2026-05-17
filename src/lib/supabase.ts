import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type ModelStatus = 'pending' | 'processing' | 'ready' | 'failed';
export type SourceType = 'ai_generated' | 'uploaded' | 'library';
export type ExportFormat = 'glb' | 'obj' | 'gltf' | 'usdz' | 'stl' | 'fbx';

export interface Model {
  id: string;
  user_id: string | null;
  name: string;
  prompt: string;
  status: ModelStatus;
  source_type: SourceType;
  file_url: string;
  thumbnail_url: string;
  format: ExportFormat;
  file_size: number;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface LibraryModel {
  id: string;
  name: string;
  category: string;
  file_url: string;
  thumbnail_url: string;
  tags: string[];
  downloads: number;
  created_at: string;
}
