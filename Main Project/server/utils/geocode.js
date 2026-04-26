/**
 * Geocode an area name to lat/lng using OpenStreetMap Nominatim.
 * Free, rate-limited (1 req/sec), no API key needed.
 */
export const geocodeArea = async (areaName) => {
    const encoded = encodeURIComponent(areaName);
    const url = `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1`;

    const response = await fetch(url, {
        headers: {
            'User-Agent': 'AccidentDetectionApp/1.0',
        },
    });

    if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.statusText}`);
    }

    const data = await response.json();
    if (!data || data.length === 0) {
        throw new Error(`Could not geocode area: "${areaName}". Try a more specific location.`);
    }

    return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        displayName: data[0].display_name,
    };
};
