import { initializeApp } from "firebase-admin/app";
import { onRequest } from "firebase-functions/v2/https";
import { defineSecret } from "firebase-functions/params";

initializeApp();

const googlePlacesApiKey = defineSecret("GOOGLE_PLACES_API_KEY");
const geminiApiKey = defineSecret("GEMINI_API_KEY");

const commercialWords = [
  "hotel",
  "resort",
  "hostel",
  "motel",
  "inn",
  "lodge",
  "marriott",
  "hilton",
  "steigenberger",
  "rixos",
  "jaz ",
  "jazz",
  "sentido",
];

const categoryQueries = {
  all: "independent apartment studio monthly rental compound",
  studio: "studio apartment rental",
  monthly: "monthly apartment rental",
  compound: "residential compound apartment rental",
  apartment: "apartment rental",
};

const inferCategory = (text) => {
  const value = text.toLowerCase();
  if (value.includes("studio")) return "studio";
  if (value.includes("monthly") || value.includes("month")) return "monthly";
  if (value.includes("compound") || value.includes("residence")) return "compound";
  return "apartment";
};

const isCommercial = (place) => {
  const text = `${place.displayName?.text || ""} ${place.formattedAddress || ""} ${(place.types || []).join(" ")}`.toLowerCase();
  return commercialWords.some((word) => text.includes(word)) || (place.types || []).some((type) => ["hotel", "lodging", "resort_hotel"].includes(type));
};

const classifyWithGemini = async (results) => {
  const key = geminiApiKey.value();
  if (!key || results.length === 0) return results;

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: `Classify these Hurghada accommodations as independent residential rentals only. Exclude hotels and resorts. Return JSON array with id, keep boolean, category studio|monthly|compound|apartment.\n${JSON.stringify(results.map(({ id, title, address, placeTypes }) => ({ id, title, address, placeTypes })))}`
          }]
        }],
        generationConfig: { responseMimeType: "application/json" },
      }),
    });
    if (!response.ok) return results;
    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const decisions = JSON.parse(text);
    const decisionById = new Map(decisions.map((item) => [item.id, item]));
    return results
      .filter((item) => decisionById.get(item.id)?.keep !== false)
      .map((item) => ({ ...item, category: decisionById.get(item.id)?.category || item.category }));
  } catch {
    return results;
  }
};

export const api = onRequest({ cors: true, secrets: [googlePlacesApiKey, geminiApiKey] }, async (request, response) => {
  if (request.method !== "POST") {
    response.status(405).json({ error: "POST required" });
    return;
  }

  const { country = "Egypt", area = "", city = "Hurghada", accommodationType = "all", duration = "any", radiusKm = 55 } = request.body || {};
  const type = categoryQueries[accommodationType] ? accommodationType : "all";
  const durationText = duration === "any" ? "" : `${duration} stay`;
  const query = `${categoryQueries[type]} ${durationText} in ${area || city}, ${city}, ${country} -hotel -resort`;

  try {
    const placesResponse = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googlePlacesApiKey.value(),
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.location,places.types",
      },
      body: JSON.stringify({
        textQuery: query,
        maxResultCount: 20,
        locationBias: {
          circle: {
            center: { latitude: 27.2579, longitude: 33.8116 },
            radius: Math.max(5000, Math.min(Number(radiusKm) * 1000 || 55000, 60000)),
          },
        },
      }),
    });

    if (!placesResponse.ok) {
      response.status(placesResponse.status).json({ error: "Google Places search failed" });
      return;
    }

    const data = await placesResponse.json();
    const rawResults = (data.places || [])
      .filter((place) => !isCommercial(place))
      .map((place) => {
        const title = place.displayName?.text || "Independent rental";
        const address = place.formattedAddress || `${area}, ${city}`;
        return {
          id: place.id,
          title,
          address,
          area,
          category: inferCategory(`${title} ${address}`),
          lat: place.location?.latitude,
          lng: place.location?.longitude,
          bedrooms: 1,
          priceLabel: "Advisor pricing",
          placeTypes: place.types || [],
        };
      })
      .filter((place) => typeof place.lat === "number" && typeof place.lng === "number");

    const classified = await classifyWithGemini(rawResults);
    response.json({ results: classified.filter((item) => type === "all" || item.category === type) });
  } catch (error) {
    response.status(500).json({ error: error instanceof Error ? error.message : "Search failed" });
  }
});
