/**
 * Geocoding utility using OpenStreetMap's Nominatim API (free, no API key required)
 * Rate limit: 1 request per second (we add delays when batch processing)
 */

export interface GeocodingResult {
  latitude: number;
  longitude: number;
  displayName: string;
}

interface NominatimResult {
  lat: string;
  lon: string;
  display_name: string;
}

/**
 * Geocode an address string to coordinates
 * Biased towards Israel for better results with Hebrew addresses
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!address || address.trim().length < 3) {
    return null;
  }

  try {
    // Clean and prepare the address
    const cleanedAddress = address
      .replace(/,\s*,/g, ',')  // Remove empty commas
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();

    // Add Israel bias for better results
    const searchAddress = cleanedAddress.includes('ישראל') || cleanedAddress.includes('Israel')
      ? cleanedAddress
      : `${cleanedAddress}, Israel`;

    const params = new URLSearchParams({
      q: searchAddress,
      format: 'json',
      limit: '1',
      countrycodes: 'il',  // Bias towards Israel
      addressdetails: '1',
    });

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?${params.toString()}`,
      {
        headers: {
          'User-Agent': 'ApartmentTracker/1.0 (apartment search app)',
          'Accept-Language': 'he,en',
        },
      }
    );

    if (!response.ok) {
      console.warn(`[geocode] Nominatim returned ${response.status}`);
      return null;
    }

    const results: NominatimResult[] = await response.json();

    if (results.length === 0) {
      console.log(`[geocode] No results for: "${cleanedAddress}"`);
      return null;
    }

    const result = results[0];
    return {
      latitude: parseFloat(result.lat),
      longitude: parseFloat(result.lon),
      displayName: result.display_name,
    };
  } catch (error) {
    console.error('[geocode] Error:', error);
    return null;
  }
}

/**
 * Batch geocode multiple addresses with rate limiting
 * Returns a map of address -> coordinates
 */
export async function batchGeocodeAddresses(
  addresses: string[]
): Promise<Map<string, GeocodingResult>> {
  const results = new Map<string, GeocodingResult>();
  
  for (const address of addresses) {
    const result = await geocodeAddress(address);
    if (result) {
      results.set(address, result);
    }
    // Rate limit: wait 1 second between requests
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }

  return results;
}

/**
 * Extract a geocodable address from an apartment title
 * Yad2 titles usually contain: street, number, neighborhood, city
 */
export function extractAddressFromTitle(title: string): string {
  // The title is usually already in a good format for geocoding
  // Just clean it up a bit
  return title
    .replace(/\d+\s*חדרים?/g, '')  // Remove "X rooms" in Hebrew
    .replace(/\d+\s*rooms?/gi, '')  // Remove "X rooms" in English
    .replace(/קומה\s*\d+/g, '')     // Remove "floor X" in Hebrew
    .replace(/floor\s*\d+/gi, '')   // Remove "floor X" in English
    .replace(/,\s*,/g, ',')
    .replace(/\s+/g, ' ')
    .trim();
}
