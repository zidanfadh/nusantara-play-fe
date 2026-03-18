import { apiClient } from './client';
import { createClient } from '@/lib/supabase/client';
import {
  PROTEntity,
  PROTFilters,
  PaginatedResponse,
  VerifikasiEntity,
  VerifikasiQueue,
  BlockchainProof,
} from '@/types/prot';

const BASE_URL = '/prot';
const VERIFIKASI_URL = '/verifikasi';

async function getAuthToken(): Promise<string | null> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session?.access_token || null;
}

export const protApi = {
  // PROT CRUD
  create: (data: Partial<PROTEntity>) =>
    apiClient.post<PROTEntity>(BASE_URL, data),

  getAll: (filters?: PROTFilters) => {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '' && value !== 'all') {
          params.append(key, String(value));
        }
      });
    }
    return apiClient.get<PaginatedResponse<PROTEntity>>(`${BASE_URL}?${params.toString()}`);
  },

  getById: (id: string) =>
    apiClient.get<PROTEntity>(`${BASE_URL}/${id}`),

  update: (id: string, data: Partial<PROTEntity>) =>
    apiClient.patch<PROTEntity>(`${BASE_URL}/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<{ success: boolean }>(`${BASE_URL}/${id}`),

  // Media Uploads
  uploadFoto: async (id: string, formData: FormData) => {
    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${BASE_URL}/${id}/foto-kegiatan`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  uploadVideo: async (id: string, formData: FormData) => {
    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${BASE_URL}/${id}/video-kegiatan`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  deleteFoto: (id: string, index: number) =>
    apiClient.delete(`${BASE_URL}/${id}/foto-kegiatan/${index}`),

  deleteVideo: (id: string, index: number) =>
    apiClient.delete(`${BASE_URL}/${id}/video-kegiatan/${index}`),

  uploadDokumenKurikulum: async (id: string, formData: FormData) => {
    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${BASE_URL}/${id}/dokumen-kurikulum`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  deleteDokumenKurikulum: (id: string, index: number) =>
    apiClient.delete(`${BASE_URL}/${id}/dokumen-kurikulum/${index}`),

  uploadFotoAlat: async (id: string, peralatanIndex: number, formData: FormData) => {
    const token = await getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${BASE_URL}/${id}/peralatan/${peralatanIndex}/foto-alat`, {
      method: 'POST',
      body: formData,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Upload failed' }));
      throw new Error(error.message || `HTTP error! status: ${response.status}`);
    }

    return response.json();
  },

  deleteFotoAlat: (id: string, peralatanIndex: number, fotoIndex: number) =>
    apiClient.delete(`${BASE_URL}/${id}/peralatan/${peralatanIndex}/foto-alat/${fotoIndex}`),

  // Verification Workflow
  submitKurasi: (id: string, catatan: string) =>
    apiClient.post(`${BASE_URL}/${id}/submit-kurasi`, { catatan }),

  resubmit: (id: string) =>
    apiClient.post(`${BASE_URL}/${id}/resubmit`),

  // Verification Queue (Pakar/Admin)
  getQueue: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<VerifikasiQueue>>(`${VERIFIKASI_URL}/queue?page=${page}&limit=${limit}`),

  getMyQueue: (page = 1, limit = 20) =>
    apiClient.get<PaginatedResponse<VerifikasiQueue>>(`${VERIFIKASI_URL}/my-queue?page=${page}&limit=${limit}`),

  pickQueue: (queueId: string) =>
    apiClient.post<VerifikasiQueue>(`${VERIFIKASI_URL}/queue/${queueId}/pick`),

  releaseQueue: (queueId: string) =>
    apiClient.post<VerifikasiQueue>(`${VERIFIKASI_URL}/queue/${queueId}/release`),

  review: (protId: string, data: { status: string; catatan?: string; saran_perbaikan?: string; dokumen_pendukung?: string[] }) =>
    apiClient.post<VerifikasiEntity>(`${VERIFIKASI_URL}/${protId}/review`, data),

  getHistory: (protId: string) =>
    apiClient.get<VerifikasiEntity[]>(`${VERIFIKASI_URL}/${protId}/history`),

  publish: (protId: string, catatan: string) =>
    apiClient.post(`${VERIFIKASI_URL}/prot/${protId}/publish`, { catatan }),

  getStats: () =>
    apiClient.get(`${VERIFIKASI_URL}/stats`),

  // Blockchain
  getBlockchainProof: (id: string) =>
    apiClient.get<BlockchainProof>(`${BASE_URL}/${id}/blockchain-proof`),

  reanchorBlockchain: (id: string) =>
    apiClient.post<{ message: string; proofId: string }>(`${BASE_URL}/${id}/blockchain-proof/reanchor`),
};
