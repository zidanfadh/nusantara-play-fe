import { useState, useEffect, useCallback } from 'react';
import type {
  KategoriProduk,
  Toko,
  Produk,
  ProdukQueryParams,
  Order,
} from '@/types/marketplace';
import * as marketplaceApi from '@/lib/api/marketplace';

// --- KategoriProduk ---

export function useKategoriList() {
  const [data, setData] = useState<KategoriProduk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetch = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await marketplaceApi.listKategori();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch categories'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error, refetch: fetch };
}

// --- Toko ---

export function useMyToko() {
  const [data, setData] = useState<Toko | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let isMounted = true;
    async function fetchToko() {
      try {
        setLoading(true);
        setError(null);
        setNotFound(false);
        const result = await marketplaceApi.getMyToko();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) {
          const message = err instanceof Error ? err.message : '';
          if (message.includes('belum memiliki toko') || message.includes('404')) {
            setNotFound(true);
          } else {
            setError(err instanceof Error ? err : new Error('Failed to fetch toko'));
          }
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchToko();
    return () => { isMounted = false; };
  }, []);

  return { data, loading, error, notFound };
}

export function useToko(id: string | null) {
  const [data, setData] = useState<Toko | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    let isMounted = true;
    async function fetchToko() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getToko(id!);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch toko'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchToko();
    return () => { isMounted = false; };
  }, [id]);

  return { data, loading, error };
}

// --- Produk ---

export function useProdukList(params?: ProdukQueryParams) {
  const [data, setData] = useState<Produk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function fetchProduk() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.listProduk(params);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch products'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProduk();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(params)]);

  return { data, loading, error };
}

export function useProduk(id: string | null) {
  const [data, setData] = useState<Produk | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    let isMounted = true;
    async function fetchProduk() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getProduk(id!);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch product'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchProduk();
    return () => { isMounted = false; };
  }, [id]);

  return { data, loading, error };
}

// --- Order ---

export function useMyOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getMyOrders();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrders();
    return () => { isMounted = false; };
  }, [refresh]);

  return { data, loading, error, refetch: () => setRefresh((p) => p + 1) };
}

export function useSellerOrders() {
  const [data, setData] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let isMounted = true;
    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getSellerOrders();
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch orders'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrders();
    return () => { isMounted = false; };
  }, [refresh]);

  return { data, loading, error, refetch: () => setRefresh((p) => p + 1) };
}

export function useOrder(id: string | null) {
  const [data, setData] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    if (!id) { setData(null); setLoading(false); return; }
    let isMounted = true;
    async function fetchOrder() {
      try {
        setLoading(true);
        setError(null);
        const result = await marketplaceApi.getOrder(id!);
        if (isMounted) setData(result);
      } catch (err) {
        if (isMounted) setError(err instanceof Error ? err : new Error('Failed to fetch order'));
      } finally {
        if (isMounted) setLoading(false);
      }
    }
    fetchOrder();
    return () => { isMounted = false; };
  }, [id, refresh]);

  return { data, loading, error, refetch: () => setRefresh((p) => p + 1) };
}
