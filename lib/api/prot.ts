import { apiClient } from './client';
import {
  PROTEntity,
  PROTFilters,
  PaginatedResponse,
  VerifikasiEntity,
  VerifikasiQueue
} from '@/types/prot';

const BASE_URL = '/prot';
const VERIFIKASI_URL = '/verifikasi';

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
  uploadFoto: (id: string, formData: FormData) => {
    // Note: client.ts might need adjustment for FormData if it forces JSON
    // For now assuming standard fetch for file upload or we extend client.ts later
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${BASE_URL}/${id}/foto-kegiatan`, {
      method: 'POST',
      body: formData,
      headers: {
        // Authorization header needs to be handled manually or via a modified client
      }
    }).then(res => res.json());
  },

  uploadVideo: (id: string, formData: FormData) => {
    return fetch(`${process.env.NEXT_PUBLIC_BACKEND_API_URL}${BASE_URL}/${id}/video-kegiatan`, {
      method: 'POST',
      body: formData,
    }).then(res => res.json());
  },

  deleteFoto: (id: string, index: number) =>
    apiClient.delete(`${BASE_URL}/${id}/foto-kegiatan/${index}`),

  deleteVideo: (id: string, index: number) =>
    apiClient.delete(`${BASE_URL}/${id}/video-kegiatan/${index}`),

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
};
