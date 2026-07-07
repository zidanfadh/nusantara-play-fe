import { getBackendApiUrl } from './base-url';

export interface LandingStats {
  totalProt: number;
  totalProvinsi: number;
  totalEvents: number;
  totalUsers: number;
}

export async function getLandingStats(accessToken?: string): Promise<LandingStats> {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  try {
    const response = await fetch(`${getBackendApiUrl()}/stats/landing`, {
      headers,
      next: {
        revalidate: 60,
      },
    });

    if (!response.ok) {
      console.error('Failed to fetch landing stats:', response.statusText);
      return { totalProt: 0, totalProvinsi: 0, totalEvents: 0, totalUsers: 0 };
    }

    return response.json();
  } catch (error) {
    console.error('Error fetching landing stats:', error);
    return { totalProt: 0, totalProvinsi: 0, totalEvents: 0, totalUsers: 0 };
  }
}
