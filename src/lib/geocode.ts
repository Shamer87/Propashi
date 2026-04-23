/**
 * Geocoding utility: extracts location from text and returns approximate coordinates.
 * Uses a built-in dictionary of Ukrainian cities/towns + Nominatim API fallback.
 */

// Dictionary of common Ukrainian locations relevant to the conflict
const LOCATIONS: Record<string, { lat: number; lng: number }> = {
  // Донецька область
  'авдіївка': { lat: 48.1386, lng: 37.7483 },
  'авдеевка': { lat: 48.1386, lng: 37.7483 },
  'бахмут': { lat: 48.5954, lng: 37.9997 },
  'артемівськ': { lat: 48.5954, lng: 37.9997 },
  'маріуполь': { lat: 47.0958, lng: 37.5494 },
  'мариуполь': { lat: 47.0958, lng: 37.5494 },
  'донецьк': { lat: 48.0159, lng: 37.8029 },
  'донецк': { lat: 48.0159, lng: 37.8029 },
  'горлівка': { lat: 48.3069, lng: 38.0261 },
  'горловка': { lat: 48.3069, lng: 38.0261 },
  'волноваха': { lat: 47.6008, lng: 37.4983 },
  'вугледар': { lat: 47.7797, lng: 37.2536 },
  'угледар': { lat: 47.7797, lng: 37.2536 },
  'покровськ': { lat: 48.2831, lng: 37.1778 },
  'покровск': { lat: 48.2831, lng: 37.1778 },
  'красноармійськ': { lat: 48.2831, lng: 37.1778 },
  'селидове': { lat: 48.1500, lng: 37.3000 },
  'селидово': { lat: 48.1500, lng: 37.3000 },
  'курахове': { lat: 47.9833, lng: 37.2833 },
  'курахово': { lat: 47.9833, lng: 37.2833 },
  'торецьк': { lat: 48.3903, lng: 37.8472 },
  'торецк': { lat: 48.3903, lng: 37.8472 },
  'дзержинськ': { lat: 48.3903, lng: 37.8472 },
  'мар\'їнка': { lat: 47.9422, lng: 37.5042 },
  'марьинка': { lat: 47.9422, lng: 37.5042 },
  'соледар': { lat: 48.6786, lng: 38.0861 },
  'часів яр': { lat: 48.5917, lng: 37.8472 },
  'часов яр': { lat: 48.5917, lng: 37.8472 },
  'костянтинівка': { lat: 48.5267, lng: 37.7089 },
  'константиновка': { lat: 48.5267, lng: 37.7089 },
  'краматорськ': { lat: 48.7375, lng: 37.5567 },
  'краматорск': { lat: 48.7375, lng: 37.5567 },
  'слов\'янськ': { lat: 48.8636, lng: 37.6125 },
  'славянск': { lat: 48.8636, lng: 37.6125 },
  'лиман': { lat: 48.9844, lng: 37.8172 },

  // Луганська область
  'луганськ': { lat: 48.5740, lng: 39.3078 },
  'луганск': { lat: 48.5740, lng: 39.3078 },
  'сєвєродонецьк': { lat: 48.9486, lng: 38.4900 },
  'северодонецк': { lat: 48.9486, lng: 38.4900 },
  'лисичанськ': { lat: 48.9044, lng: 38.4264 },
  'лисичанск': { lat: 48.9044, lng: 38.4264 },
  'попасна': { lat: 48.6333, lng: 38.3833 },
  'рубіжне': { lat: 49.0122, lng: 38.3775 },
  'рубежное': { lat: 49.0122, lng: 38.3775 },
  'кремінна': { lat: 49.0556, lng: 38.2167 },
  'кременная': { lat: 49.0556, lng: 38.2167 },
  'старобільськ': { lat: 49.2789, lng: 38.9069 },

  // Запорізька область
  'запоріжжя': { lat: 47.8388, lng: 35.1396 },
  'запорожье': { lat: 47.8388, lng: 35.1396 },
  'мелітополь': { lat: 46.8497, lng: 35.3676 },
  'мелитополь': { lat: 46.8497, lng: 35.3676 },
  'токмак': { lat: 47.2533, lng: 35.7075 },
  'оріхів': { lat: 47.5667, lng: 35.7833 },
  'орехов': { lat: 47.5667, lng: 35.7833 },
  'енергодар': { lat: 47.4989, lng: 34.6567 },
  'энергодар': { lat: 47.4989, lng: 34.6567 },
  'пологи': { lat: 47.4833, lng: 36.2500 },
  'василівка': { lat: 47.4333, lng: 35.2333 },
  'васильевка': { lat: 47.4333, lng: 35.2333 },
  'роботине': { lat: 47.4500, lng: 35.8333 },

  // Херсонська область
  'херсон': { lat: 46.6354, lng: 32.6169 },
  'каховка': { lat: 46.8167, lng: 33.4833 },
  'нова каховка': { lat: 46.7533, lng: 33.3478 },
  'новая каховка': { lat: 46.7533, lng: 33.3478 },
  'олешки': { lat: 46.6333, lng: 32.7667 },
  'алёшки': { lat: 46.6333, lng: 32.7667 },
  'скадовськ': { lat: 46.1072, lng: 32.9125 },

  // Харківська область
  'харків': { lat: 49.9935, lng: 36.2304 },
  'харьков': { lat: 49.9935, lng: 36.2304 },
  'ізюм': { lat: 49.2108, lng: 37.2617 },
  'изюм': { lat: 49.2108, lng: 37.2617 },
  'куп\'янськ': { lat: 49.7133, lng: 37.6175 },
  'купянск': { lat: 49.7133, lng: 37.6175 },
  'балаклія': { lat: 49.4628, lng: 36.8572 },
  'балаклея': { lat: 49.4628, lng: 36.8572 },
  'вовчанськ': { lat: 50.2894, lng: 36.9428 },
  'волчанск': { lat: 50.2894, lng: 36.9428 },
  'оскіл': { lat: 49.6167, lng: 37.3500 },

  // Миколаївська область
  'миколаїв': { lat: 46.9750, lng: 31.9946 },
  'николаев': { lat: 46.9750, lng: 31.9946 },

  // Сумська область
  'суми': { lat: 50.9077, lng: 34.7981 },
  'сумы': { lat: 50.9077, lng: 34.7981 },

  // Чернігівська область
  'чернігів': { lat: 51.4982, lng: 31.2893 },
  'чернигов': { lat: 51.4982, lng: 31.2893 },

  // Київська область
  'київ': { lat: 50.4501, lng: 30.5234 },
  'киев': { lat: 50.4501, lng: 30.5234 },
  'буча': { lat: 50.5469, lng: 30.2206 },
  'ірпінь': { lat: 50.5216, lng: 30.2523 },
  'ирпень': { lat: 50.5216, lng: 30.2523 },
  'гостомель': { lat: 50.5678, lng: 30.2131 },

  // Крим
  'сімферополь': { lat: 44.9521, lng: 34.1024 },
  'симферополь': { lat: 44.9521, lng: 34.1024 },
  'севастополь': { lat: 44.6167, lng: 33.5254 },
  'керч': { lat: 45.3531, lng: 36.4747 },
  'керчь': { lat: 45.3531, lng: 36.4747 },
  'джанкой': { lat: 45.7117, lng: 34.3933 },

  // Курська область (РФ) - прикордонні операції
  'суджа': { lat: 51.1942, lng: 35.2711 },
  'курськ': { lat: 51.7303, lng: 36.1926 },
  'курск': { lat: 51.7303, lng: 36.1926 },
};

/**
 * Try to extract a known location from text and return coordinates.
 * Searches for city/town names in the text (case-insensitive).
 */
export function geocodeFromText(text: string): { lat: number; lng: number } | null {
  if (!text) return null;
  
  const lowerText = text.toLowerCase();
  
  // Sort locations by name length (longest first) to match "часів яр" before "яр"
  const sortedEntries = Object.entries(LOCATIONS).sort((a, b) => b[0].length - a[0].length);
  
  for (const [name, coords] of sortedEntries) {
    if (lowerText.includes(name)) {
      // Add slight random offset (±0.01 degrees ≈ ±1km) for privacy
      return {
        lat: coords.lat + (Math.random() - 0.5) * 0.02,
        lng: coords.lng + (Math.random() - 0.5) * 0.02,
      };
    }
  }
  
  return null;
}

/**
 * Try to geocode using Nominatim API (OpenStreetMap) as a fallback.
 * Rate limited: max 1 request per second.
 */
export async function geocodeWithNominatim(query: string): Promise<{ lat: number; lng: number } | null> {
  if (!query || query.length < 3) return null;
  
  try {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=1&countrycodes=ua,ru`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Propashi-App/1.0' },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }
  } catch (err) {
    console.error('Nominatim geocoding error:', err);
  }
  
  return null;
}

/**
 * Main geocoding function: tries dictionary first, then Nominatim.
 * Analyzes locationOfEvent and extraInfo fields.
 */
export async function autoGeocode(locationOfEvent?: string, extraInfo?: string): Promise<{ lat: number; lng: number } | null> {
  // First try dictionary match on locationOfEvent
  if (locationOfEvent) {
    const result = geocodeFromText(locationOfEvent);
    if (result) return result;
  }
  
  // Then try dictionary match on extraInfo
  if (extraInfo) {
    const result = geocodeFromText(extraInfo);
    if (result) return result;
  }
  
  // Fallback: try Nominatim with locationOfEvent
  if (locationOfEvent) {
    const result = await geocodeWithNominatim(locationOfEvent);
    if (result) return result;
  }
  
  return null;
}
