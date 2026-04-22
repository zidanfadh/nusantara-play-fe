export type NftCatalogStatus = 'DRAFT' | 'PUBLISHED';

export interface NftCatalog {
  id: string;
  nama: string;
  slug: string;
  deskripsi: string | null;
  about: string | null;
  image_url: string | null;
  gallery_urls: string[] | null;
  blockchain_network: string;
  contract_address: string;
  token_id: string;
  token_standard: string | null;
  metadata_uri: string | null;
  marketplace_name: string | null;
  marketplace_url: string | null;
  external_url: string | null;
  prot_id: string | null;
  status: NftCatalogStatus;
  is_active: boolean;
  created_by: string;
  updated_by: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  prot?: any | null; // You can type this better using Prot type if needed
}

export interface NftPagination {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

export interface NftListResponse {
  data: NftCatalog[];
  pagination: NftPagination;
}

export interface CreateNftPayload {
  nama: string;
  slug: string;
  deskripsi?: string;
  about?: string;
  image_url?: string;
  gallery_urls?: string[];
  blockchain_network: string;
  contract_address: string;
  token_id: string;
  token_standard?: string;
  metadata_uri?: string;
  marketplace_name?: string;
  marketplace_url?: string;
  external_url?: string;
  prot_id?: string;
}

export type UpdateNftPayload = Partial<CreateNftPayload>;
