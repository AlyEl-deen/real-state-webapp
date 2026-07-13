export type Property = {
  slug: string;
  name: string;
  location: string;
  destination: string;
  image: string;
  images?: string[];
  priceUsd: number;
  priceLabel: string;
  tags: string[];
  privacy: "A+" | "A" | string;
  specs: string;
  bedrooms: number;
  interior: string;
  security: string;
  payment: string;
  yield: string;
  occupancy: string;
  coordinates: { left: string; top: string };
  metrics: string[];
  explanation: string;
  illustrationSet: string[];
  neighborhood: string[];
  rooms: string[];
};

export type SiteSettings = {
  brandName: string;
  whatsappUrl: string;
  defaultCurrency: "USD" | "EUR" | "AED" | "GBP";
  cryptoPayments: string;
  pendingRequests: number;
};

export type Profile = {
  uid: string;
  email: string;
  name: string;
  intent?: string;
  photoURL?: string;
  emailVerified: boolean;
  isAdmin: boolean;
};

export type GeographicArea = {
  centerLatitude: number;
  centerLongitude: number;
  radiusKm: number;
  bounds: {
    north: number;
    south: number;
    east: number;
    west: number;
  };
};

export type RentalRequest = {
  source: string;
  name?: string;
  email?: string;
  phone?: string;
  request?: string;
  purpose?: string;
  desiredResidence?: string;
  budgetRange?: string;
  privacyLevel?: string;
  preferredDate?: string;
  channel?: string;
  preferences?: string;
  geographicArea?: GeographicArea;
  createdAt?: string;
  status?: string;
};

export type AdvisorRequest = RentalRequest & {
  id?: string;
  userId?: string;
  userEmail?: string;
  firebaseCollection?: "advisorRequests";
};

export type ManagedRequest = (RentalRequest | AdvisorRequest) & {
  id: string;
  collection: "advisorRequests" | "rentalRequests";
  userId?: string;
  userEmail?: string;
};

export type ExploreLead = {
  source: "explore-map";
  userId?: string;
  userEmail?: string;
  searchedArea: string;
  accommodationType: string;
  resultCount: number;
  excludedCommercial: true;
  geographicArea?: GeographicArea;
  createdAt?: string;
  status?: string;
};
