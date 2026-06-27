import { apiClient } from './client';
import { getBackendApiUrl } from './base-url';
import { createClient } from '@/lib/supabase/client';
import { NftCatalog, NftListResponse, CreateNftPayload, UpdateNftPayload } from '@/types/nfts';

type FetchNftsParams = {
  search?: string;
  blockchain_network?: string;
  prot_id?: string;
  page?: number;
  limit?: number;
};

export const nftsApi = {
  async getAll(params?: FetchNftsParams): Promise<NftListResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      });
    }
    const qStr = query.toString();
    return apiClient.get<NftListResponse>(`/nfts${qStr ? `?${qStr}` : ''}`);
  },

  async getAdminAll(params?: FetchNftsParams): Promise<NftListResponse> {
    const query = new URLSearchParams();
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          query.set(key, String(value));
        }
      });
    }
    const qStr = query.toString();
    return apiClient.get<NftListResponse>(`/nfts/admin${qStr ? `?${qStr}` : ''}`);
  },

  async getById(id: string): Promise<NftCatalog> {
    return apiClient.get<NftCatalog>(`/nfts/${id}`);
  },

  async getBySlug(slug: string): Promise<NftCatalog> {
    return apiClient.get<NftCatalog>(`/nfts/slug/${slug}`);
  },

  async create(data: CreateNftPayload): Promise<NftCatalog> {
    return apiClient.post<NftCatalog>('/nfts', data);
  },

  async update(id: string, data: UpdateNftPayload): Promise<NftCatalog> {
    return apiClient.patch<NftCatalog>(`/nfts/${id}`, data);
  },

  async publish(id: string): Promise<NftCatalog> {
    return apiClient.post<NftCatalog>(`/nfts/${id}/publish`);
  },

  async unpublish(id: string): Promise<NftCatalog> {
    return apiClient.post<NftCatalog>(`/nfts/${id}/unpublish`);
  },

  async remove(id: string): Promise<void> {
    return apiClient.delete(`/nfts/${id}`);
  },

  async uploadImage(file: File): Promise<{ url: string; message: string }> {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    const formData = new FormData();
    formData.append('file', file);

    // Perform raw fetch because apiClient forces JSON and content-type
    const response = await fetch(`${getBackendApiUrl()}/nfts/upload/image`, {
      method: 'POST',
      headers: {
        ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      },
      body: formData,
    });

    if (!response.ok) {
      let message = 'Upload failed';
      try {
        const errorData = await response.json();
        message = errorData.message || message;
      } catch {
        // syntax error if not json
      }
      throw new Error(message);
    }

    return response.json();
  },
};
