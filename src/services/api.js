/**
 * 100% Pure Static Frontend API Service
 * Queries Pexels stock photos directly via Vite Proxy or Direct endpoints
 */

export async function searchPexelsImages(query, page = 1, orientation = 'portrait') {
  let url = `/pexels-api/v1/search?query=${encodeURIComponent(query)}&page=${page}&per_page=18`;
  if (orientation && orientation !== 'all') {
    url += `&orientation=${orientation}`;
  }

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`Pexels API Error (${res.status})`);
  }

  const data = await res.json();
  const photos = (data.photos || []).map(p => ({
    id: p.id,
    width: p.width,
    height: p.height,
    photographer: p.photographer,
    photographerUrl: p.photographer_url,
    alt: p.alt || query,
    thumbnail: p.src.tiny || p.src.small || p.src.medium,
    medium: p.src.medium,
    large: p.src.large,
    portrait: p.src.portrait || p.src.large,
    original: p.src.original
  }));

  return {
    success: true,
    query,
    page: data.page,
    perPage: data.per_page,
    totalResults: data.total_results,
    photos
  };
}
