import { createContext, FormEvent, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import * as L from "leaflet";
import type { AdvisorRequest, GeographicArea, ManagedRequest, Profile, Property, SiteSettings } from "./types";
import { defaultProperties, defaultSiteSettings, rates } from "./data";
import heroVillaImage from "../assets/hero-villa.png";
import islandVillaImage from "../assets/island-villa.png";
import penthouseImage from "../assets/penthouse.png";
import {
  deleteProperty,
  deleteManagedRequest,
  getCachedSiteSettings,
  getManagedRequests,
  getProperties,
  getSiteSettings,
  hasPrivateAccess,
  isAdmin,
  logout,
  saveProperty,
  saveSiteSettings,
  seedDefaults,
  sendCurrentUserVerificationEmail,
  signIn,
  signUp,
  submitAdvisorRequest,
  submitExploreLead,
  submitRentalRequest,
  updateManagedRequestStatus,
  updateProfileData,
  uploadProfileImage,
  uploadPropertyImage,
  waitForAuth,
} from "./firebase";

type Page = "home" | "about" | "auth" | "detail" | "profile" | "admin" | "admin-unit" | "explore-map";
type AdvisorContext = {
  source: string;
  property?: string;
};
type SelectOption = {
  value: string;
  label: string;
};
type ConfirmationOptions = {
  eyebrow: string;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: "default" | "danger" | "save";
  icon?: IconName;
};
type ConfirmationRequest = ConfirmationOptions & {
  resolve: (confirmed: boolean) => void;
};
type ConfirmAction = (options: ConfirmationOptions) => Promise<boolean>;
type AccommodationType = "all" | "studio" | "monthly" | "compound" | "apartment";
type DurationType = "any" | "nightly" | "weekly" | "monthly" | "seasonal";
type MapRental = {
  id: string;
  title: string;
  address: string;
  area: string;
  category: AccommodationType;
  image: string;
  summary: string;
  durations?: DurationType[];
  lat: number;
  lng: number;
  bedrooms: number;
  priceLabel: string;
  source?: "proxy" | "curated";
  placeTypes?: string[];
};
type MapAreaCenter = { lat: number; lng: number };
type Language = "en" | "de" | "it";
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};
type IconName =
  | "arrowLeft"
  | "arrowRight"
  | "building"
  | "calendar"
  | "check"
  | "compass"
  | "compare"
  | "edit"
  | "external"
  | "eye"
  | "globe"
  | "image"
  | "inbox"
  | "key"
  | "layers"
  | "lock"
  | "map"
  | "message"
  | "plus"
  | "refresh"
  | "save"
  | "search"
  | "settings"
  | "shield"
  | "spark"
  | "trash"
  | "upload"
  | "user"
  | "wallet"
  | "x";

const languages: { code: Language; label: string }[] = [
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "it", label: "Italiano" },
];

const translations = {
  en: {
    primaryNavigation: "Primary navigation",
    mobileNavigation: "Mobile navigation",
    language: "Language",
    residences: "Residences",
    collections: "Collections",
    about: "About",
    contact: "Contact",
    concierge: "Concierge",
    exploreMap: "Explore Map",
    mapSearchHeadline: "Find Your Next Vacation Home on the Map",
    mapSearchCopy: "Browse the map, choose a country and city, then send a filtered search request for our team to find the best independent offer.",
    areaNeighborhood: "Area or neighborhood",
    searchAreaPlaceholder: "El Gouna, Sahl Hasheesh, Al Ahyaa...",
    country: "Country",
    city: "City",
    countryPlaceholder: "Egypt",
    cityPlaceholder: "Hurghada",
    searchRange: "Range",
    duration: "Duration",
    anyDuration: "Any duration",
    nightly: "Nightly",
    weekly: "Weekly",
    monthlyDuration: "Monthly",
    seasonal: "Seasonal",
    accommodationType: "Accommodation type",
    allResidential: "All residential rentals",
    studios: "Studios",
    monthlyRentals: "Monthly rentals",
    compounds: "Compounds",
    apartments: "Apartments",
    searchMap: "Search Map",
    sendSearchRequest: "Send Search Request",
    searchRequestSent: "Search request sent to our advisory team.",
    searchRequestFailed: "Could not send this search request.",
    openMapSearch: "Open Map Search",
    searchingMap: "Searching map...",
    independentOnly: "Independent rentals only",
    sidePanelTitle: "Available independent homes",
    mapPanelTitle: "Residential rental map",
    excludedCommercial: "Hotels and resorts excluded",
    exactAddress: "Exact address",
    noMapResults: "No independent rentals found for this area yet.",
    crmLeadLogged: "Search logged for advisor follow-up.",
    crmLeadFailed: "Search completed. Lead was saved locally and will sync when available.",
    apiFallbackNotice: "Showing curated independent rentals while live Places/Gemini search is unavailable.",
    showingBestMatches: "Showing the best independent matches for your selected filter.",
    interestedDeal: "Interested - Make a Deal",
    dealRequestSent: "Deal request sent to our advisory team.",
    dealRequestFailed: "Could not send this deal request.",
    chooseMapArea: "Choose preferred area",
    chooseMapAreaHint: "Click the map to place the center, then drag the gold edge handle to resize the range.",
    selectedArea: "Selected area",
    selectedRangeReady: "Your preferred area is ready",
    selectedRangeCopy: "This exact center, radius, and boundary will be attached to your request.",
    centerPoint: "Center point",
    rangeRadius: "Range radius",
    boundaryBox: "Boundary",
    sendSelectedRange: "Send selected area",
    signInToSendRange: "Sign in to send this area",
    searchMapDetail: "Refresh matching residences",
    sendRequestDetail: "Send area and filters to our team",
    profile: "Profile",
    signIn: "Sign In",
    admin: "Admin",
    privateAdvisor: "Private Advisor",
    privateGlobalResidences: "Private global residences",
    footerSiteCopy: "Private residences, curated rentals, interactive geographic search, and discreet advisor access across the Red Sea.",
    footerExplore: "Explore",
    footerPlatform: "Platform",
    systemActive: "System Active",
    whyHurghada: "Why Hurghada?",
    hurghadaHomeTitle: "Invest where the world comes to live.",
    hurghadaHomeCopy: "Forty kilometers of Red Sea coastline, year-round tourism, international connectivity, and exceptional value make Hurghada more than a destination—it is a high-performance property market.",
    yearRoundDemand: "Year-round demand",
    yearRoundDemandCopy: "Twelve active tourism months support stronger occupancy and rental continuity.",
    investorValue: "Investor advantage",
    investorValueCopy: "Favorable currency dynamics and growing coastal communities create compelling entry value.",
    coastalLifestyle: "Coastal lifestyle",
    coastalLifestyleCopy: "365 days of sunshine, modern infrastructure, and an established international community.",
    discoverHurghada: "Discover the Hurghada opportunity",
    exploreResidences: "Explore Residences",
    speakToAdvisor: "Speak to an Advisor",
    destination: "Destination",
    global: "Global",
    frenchRiviera: "French Riviera",
    dubai: "Dubai",
    maldives: "Maldives",
    desertReserve: "Desert Reserve",
    lifestyle: "Lifestyle",
    anyLifestyle: "Any lifestyle",
    beachfront: "Beachfront",
    penthouse: "Penthouse",
    privateIsland: "Private Island",
    wellness: "Wellness",
    investment: "Investment",
    privacy: "Privacy",
    anyGrade: "Any grade",
    privateGrade: "A+ private",
    discreetGrade: "A discreet",
    curate: "Curate",
    curatedByLife: "Curated by life, not inventory",
    featuredCollections: "Featured Collections",
    waterfrontVillas: "Waterfront Villas",
    skylinePenthouses: "Penthouses Above the Skyline",
    investmentResidences: "Investment Residences",
    curatedMatch: "Curated Match",
    residencesFound: "residences found",
    advancedSearch: "Advanced Search",
    all: "All",
    iWant: "I want...",
    absolutePrivacy: "Absolute privacy",
    iconicViews: "Iconic views",
    staffReadyLiving: "Staff-ready living",
    cryptoSupport: "Crypto support",
    priceOnApplication: "Price on Application",
    privacyLower: "privacy",
    viewExplanation: "View Explanation",
    inComparison: "In Comparison",
    compare: "Compare",
    privateViewing: "Private Viewing",
    privateMap: "Private Map",
    investmentSnapshot: "Investment Snapshot",
    decisionBrief: "Live decision brief",
    selectResidence: "Select a residence",
    noMatchingResidences: "No residences match the current filters.",
    assets: "assets",
    openExplanation: "Open Explanation",
    illustratedDrawingsGuide: "Illustrated Drawings + Unit Guide",
    illustratedExplanation: "Illustrated Explanation",
    seeUnitBeforeArrival: "See the unit before you arrive.",
    unitExplanationCopy:
      "Our team prepares private visual explanations for selected rentals, including illustrative drawings, floor-plan notes, arrival flows, amenity maps, and room-by-room usage guidance.",
    openUnitExplanation: "Open Unit Explanation",
    vipConcierge: "VIP Concierge",
    privateAccessSteps: "Private access in three quiet steps.",
    purpose: "Purpose",
    rentalReservation: "Rental reservation",
    unitExplanationRequest: "Unit explanation request",
    preferredDate: "Preferred date",
    channel: "Channel",
    whatsappBusiness: "WhatsApp Business",
    premiumVideoCall: "Premium video call",
    privateEmail: "Private email",
    preferences: "Preferences",
    preferencesPlaceholder: "Lifestyle, privacy requirements, guest profile, currency, and special requests",
    assignPrivateAdvisor: "Assign Private Advisor",
    conciergeSent: "Concierge request sent successfully.",
    conciergeError: "Could not send the concierge request.",
    confirmRequest: "Confirm Request",
    sendPrivateRequest: "Send this private request?",
    confirmationCopy:
      "You are about to send a private request. Your account details and brief will be stored securely for advisor follow-up.",
    cancel: "Cancel",
    sendRequest: "Send Request",
    confirmAction: "Confirm Action",
    saveSettingsConfirmation: "Save these site settings and publish them to the live experience?",
    deleteRequestConfirmation: "Permanently delete this request from the admin inbox? This cannot be undone.",
    statusConfirmation: "Apply this status change to the selected client request?",
    saveUnitConfirmation: "Save and publish all changes made to this residence?",
    deleteUnitConfirmation: "Permanently remove this residence from the catalogue? This cannot be undone.",
    restoreDefaultsConfirmation: "Replace the current residence catalogue with the default units?",
    confirmSave: "Yes, Save Changes",
    confirmDelete: "Yes, Delete",
    confirmUpdate: "Yes, Update",
    closeAdvisorForm: "Close advisor form",
    describeResidence: "Describe the residence you need.",
    advisorNote:
      "The most secure path is a short private brief: no payment data, no passport data, and no public messages. Your request is saved to the platform for advisor follow-up.",
    name: "Name",
    email: "Email",
    privatePhone: "Private phone",
    buyOrInvest: "Buy or invest",
    listMyProperty: "List my property",
    residence: "Residence",
    advisorRecommendation: "Advisor recommendation",
    budgetRange: "Budget range",
    confidential: "Confidential",
    privacyLevel: "Privacy level",
    discreet: "Discreet",
    highPrivacy: "High privacy",
    ultraPrivate: "Ultra private",
    familyOfficeOnly: "Family office only",
    contactChannel: "Contact channel",
    describeUnitWanted: "Describe the unit or residency you want",
    requestPlaceholder: "Location, view, number of guests, staff needs, security, amenities, arrival timing...",
    additionalPreferences: "Additional preferences",
    additionalPreferencesPlaceholder: "Architecture, lifestyle, dietary needs, yacht dock, helipad, pets, payment currency...",
    sending: "Sending...",
    sendPrivateBrief: "Send Private Brief",
    advisorSignInRequired: "Sign in with a verified account before sending a private advisor request.",
    privateBriefSent: "Private brief sent successfully. A private advisor will review it and contact you through your selected channel.",
    privateBriefLocal: "Private brief saved locally, but Firebase did not confirm the sync. Please try again or check Firestore rules.",
    advisorError: "Could not send the advisor request.",
    illustratedUnitExplanation: "Illustrated Unit Explanation",
    drawings: "Drawings",
    included: "Included",
    floorNotes: "Floor Notes",
    zones: "zones",
    access: "Access",
    private: "Private",
    whatYouReceive: "What You Receive",
    privateVisualClarity: "Private visual clarity.",
    privateAccess: "Private Access",
    signupHeadline: "Sign up and get your property.",
    usernameOrEmail: "Username or email",
    password: "Password",
    confirmPassword: "Confirm password",
    passwordsDoNotMatch: "Passwords do not match. Please enter the same password twice.",
    showPassword: "Show password",
    hidePassword: "Hide password",
    enterPrivatePortal: "Enter Private Portal",
    dontHaveAccount: "Don't have an account? Sign up",
    fullName: "Full name",
    intent: "Intent",
    buy: "Buy",
    rent: "Rent",
    invest: "Invest",
    listAProperty: "List a property",
    createPrivateAccount: "Create Private Account",
    alreadyHaveAccount: "Already have an account? Sign in",
    verifyAccount: "Verify Account",
    confirmAccess: "Confirm your access.",
    verificationSent: "Verification email sent. Confirm it in your inbox, then sign in.",
    verificationSendFailed: "Account created, but Firebase did not send the verification email:",
    existingAccountVerify: "This email already has an account. Sign in with that email and password, then resend the verification email.",
    resendVerification: "Resend Verification Email",
    signingIn: "Signing in...",
    signedIn: "Signed in. Opening your account...",
    creatingAccount: "Creating your private account...",
    accountCreated: "Account created. Verification email sent.",
    verificationResent: "Verification email sent again. Please check inbox, spam, and promotions. Firebase may delay repeated sends.",
    verificationSentShort: "Sent - check your inbox",
    verificationResendFailed: "Could not resend the verification email.",
    verificationCopy: "We sent a verification email to",
    verifyThenSignIn: "Verify it, then sign in.",
    signInFailed: "Sign in failed.",
    createAccountError: "Could not create account.",
    privateProfile: "Private Profile",
    verifiedAccount: "Verified private account",
    verificationPending: "Email verification pending",
    profileImageUrl: "Profile image URL",
    profileImageUpload: "Upload profile image",
    profileImageHelp: "JPG, PNG or WebP · maximum 5 MB",
    uploadingProfileImage: "Uploading profile image...",
    changeProfileImage: "Choose or change profile image",
    profileImageSelected: "Ready to upload when you save your profile",
    saveProfile: "Save Profile",
    savingProfile: "Saving profile...",
    profileSaved: "Profile saved.",
    saveProfileConfirmation: "Save these profile details and apply the selected profile image to your account?",
    confirmProfileSave: "Yes, Save Profile",
    logOutConfirmation: "Sign out of this account and return to public access?",
    confirmLogOut: "Yes, Log Out",
    profileSaveFailed: "Could not save profile.",
    logOut: "Log Out",
    controlRoom: "control room.",
    totalListings: "Total Listings",
    poaAssets: "POA Assets",
    newRequests: "New Requests",
    inbox: "Inbox",
    addNewUnit: "Add New Unit",
    yield: "Yield",
    occupancy: "Occupancy",
    edit: "Edit",
    open: "Open",
    adminPassword: "Admin password",
    unlockSettings: "Unlock Settings",
    settingsUnlocked: "Settings unlocked.",
    wrongAdminPassword: "Wrong admin password.",
    brandName: "Brand name",
    whatsappUrl: "WhatsApp URL",
    defaultCurrency: "Default currency",
    cryptoNote: "Crypto note",
    pendingRequests: "Pending requests",
    saveSiteSettings: "Save Site Settings",
    siteSettingsSaved: "Site settings saved.",
    refreshInbox: "Refresh Inbox",
    noRequestsFound: "No requests found yet.",
    privateRequest: "Private request",
    noBriefProvided: "No written brief provided.",
    privateClient: "Private client",
    notProvided: "Not provided",
    status: "Status",
    reviewing: "Reviewing",
    contacted: "Contacted",
    closed: "Closed",
    delete: "Delete",
    backToControlRoom: "Back to Control Room",
    slug: "Slug",
    location: "Location",
    mainImageUrl: "Main image URL",
    mainImage: "Main image",
    useAsMain: "Use as main",
    detailImageUrls: "Details page image URLs",
    uploadGalleryImages: "Upload gallery images",
    useFirstUploadedMain: "Use first uploaded image as main image",
    priceUsd: "Price USD",
    priceLabel: "Price label",
    bedrooms: "Bedrooms",
    interior: "Interior",
    security: "Security",
    payment: "Payment",
    mapLeft: "Map left",
    mapTop: "Map top",
    specs: "Specs",
    tags: "Tags",
    luxuryMetrics: "Luxury metrics",
    rooms: "Rooms",
    neighborhood: "Neighborhood",
    illustrationSet: "Illustration set",
    explanation: "Explanation",
    saveUnit: "Save Unit",
    removeUnit: "Remove Unit",
    seedDefaults: "Seed Defaults",
    savingUnit: "Saving unit...",
    uploadedAndSaved: "Gallery images uploaded to Firebase Storage and unit saved.",
    unitSaved: "Unit saved successfully.",
    unitSaveError: "Could not save unit changes.",
    unitRemoved: "Unit removed successfully.",
    unitRemoveError: "Could not remove this unit.",
  },
  de: {
    primaryNavigation: "Hauptnavigation",
    mobileNavigation: "Mobile Navigation",
    language: "Sprache",
    residences: "Residenzen",
    collections: "Kollektionen",
    about: "Über uns",
    contact: "Kontakt",
    concierge: "Concierge",
    exploreMap: "Karte entdecken",
    mapSearchHeadline: "Finden Sie Ihr naechstes Ferienhaus auf der Karte",
    mapSearchCopy: "Durchsuchen Sie die Karte, waehlen Sie Land und Stadt und senden Sie eine gefilterte Suchanfrage fuer das beste unabhaengige Angebot.",
    areaNeighborhood: "Gebiet oder Stadtteil",
    searchAreaPlaceholder: "El Gouna, Sahl Hasheesh, Al Ahyaa...",
    country: "Land",
    city: "Stadt",
    countryPlaceholder: "Aegypten",
    cityPlaceholder: "Hurghada",
    searchRange: "Reichweite",
    duration: "Dauer",
    anyDuration: "Jede Dauer",
    nightly: "Pro Nacht",
    weekly: "Woechentlich",
    monthlyDuration: "Monatlich",
    seasonal: "Saisonal",
    accommodationType: "Unterkunftsart",
    allResidential: "Alle Wohnmieten",
    studios: "Studios",
    monthlyRentals: "Monatsmieten",
    compounds: "Compounds",
    apartments: "Apartments",
    searchMap: "Karte suchen",
    sendSearchRequest: "Suchanfrage senden",
    searchRequestSent: "Suchanfrage an unser Beratungsteam gesendet.",
    searchRequestFailed: "Diese Suchanfrage konnte nicht gesendet werden.",
    openMapSearch: "Kartensuche oeffnen",
    searchingMap: "Karte wird gesucht...",
    independentOnly: "Nur unabhaengige Mieten",
    sidePanelTitle: "Verfuegbare unabhaengige Einheiten",
    mapPanelTitle: "Karte fuer Wohnmieten",
    excludedCommercial: "Hotels und Resorts ausgeschlossen",
    exactAddress: "Exakte Adresse",
    noMapResults: "Noch keine unabhaengigen Mieten fuer dieses Gebiet gefunden.",
    crmLeadLogged: "Suche fuer Berater-Follow-up gespeichert.",
    crmLeadFailed: "Suche abgeschlossen. Lead wurde lokal gespeichert und wird synchronisiert, sobald moeglich.",
    apiFallbackNotice: "Kuratierte unabhaengige Mieten werden angezeigt, waehrend Live Places/Gemini nicht verfuegbar ist.",
    showingBestMatches: "Die besten unabhaengigen Treffer fuer den gewaehlten Filter werden angezeigt.",
    interestedDeal: "Interessiert - Deal anfragen",
    dealRequestSent: "Deal-Anfrage an unser Beratungsteam gesendet.",
    dealRequestFailed: "Diese Deal-Anfrage konnte nicht gesendet werden.",
    chooseMapArea: "Wunschgebiet auswaehlen",
    chooseMapAreaHint: "Klicken Sie fuer den Mittelpunkt auf die Karte und ziehen Sie den goldenen Randgriff, um den Radius zu aendern.",
    selectedArea: "Ausgewaehltes Gebiet",
    selectedRangeReady: "Ihr Wunschgebiet ist bereit",
    selectedRangeCopy: "Dieser Mittelpunkt, Radius und diese Begrenzung werden exakt an Ihre Anfrage angehaengt.",
    centerPoint: "Mittelpunkt",
    rangeRadius: "Suchradius",
    boundaryBox: "Begrenzung",
    sendSelectedRange: "Ausgewaehltes Gebiet senden",
    signInToSendRange: "Zum Senden dieses Gebiets anmelden",
    searchMapDetail: "Passende Residenzen aktualisieren",
    sendRequestDetail: "Gebiet und Filter an unser Team senden",
    profile: "Profil",
    signIn: "Anmelden",
    admin: "Admin",
    privateAdvisor: "Privater Berater",
    privateGlobalResidences: "Private globale Residenzen",
    footerSiteCopy: "Private Residenzen, kuratierte Mietobjekte, interaktive Kartensuche und diskrete Beratung am Roten Meer.",
    footerExplore: "Entdecken",
    footerPlatform: "Plattform",
    systemActive: "System aktiv",
    whyHurghada: "Warum Hurghada?",
    hurghadaHomeTitle: "Investieren Sie dort, wo die Welt leben möchte.",
    hurghadaHomeCopy: "Vierzig Kilometer Küste, ganzjähriger Tourismus, internationale Anbindung und außergewöhnlicher Wert machen Hurghada zu einem leistungsstarken Immobilienmarkt.",
    yearRoundDemand: "Ganzjährige Nachfrage",
    yearRoundDemandCopy: "Zwölf aktive Tourismusmonate unterstützen hohe Auslastung und kontinuierliche Mieteinnahmen.",
    investorValue: "Vorteil für Investoren",
    investorValueCopy: "Attraktive Währungsdynamik und wachsende Küstengemeinden schaffen überzeugende Einstiegschancen.",
    coastalLifestyle: "Leben an der Küste",
    coastalLifestyleCopy: "365 Sonnentage, moderne Infrastruktur und eine etablierte internationale Gemeinschaft.",
    discoverHurghada: "Die Chancen in Hurghada entdecken",
    exploreResidences: "Residenzen entdecken",
    speakToAdvisor: "Mit einem Berater sprechen",
    destination: "Destination",
    global: "Global",
    frenchRiviera: "Französische Riviera",
    dubai: "Dubai",
    maldives: "Malediven",
    desertReserve: "Wüstenresort",
    lifestyle: "Lifestyle",
    anyLifestyle: "Jeder Lifestyle",
    beachfront: "Direkt am Strand",
    penthouse: "Penthouse",
    privateIsland: "Privatinsel",
    wellness: "Wellness",
    investment: "Investment",
    privacy: "Privatsphäre",
    anyGrade: "Jede Stufe",
    privateGrade: "A+ privat",
    discreetGrade: "A diskret",
    curate: "Kuratieren",
    curatedByLife: "Nach Lebensstil kuratiert, nicht nach Bestand",
    featuredCollections: "Ausgewählte Kollektionen",
    waterfrontVillas: "Villen am Wasser",
    skylinePenthouses: "Penthouses über der Skyline",
    investmentResidences: "Investment-Residenzen",
    curatedMatch: "Kuratierte Auswahl",
    residencesFound: "Residenzen gefunden",
    advancedSearch: "Erweiterte Suche",
    all: "Alle",
    iWant: "Ich wünsche...",
    absolutePrivacy: "Absolute Privatsphäre",
    iconicViews: "Ikonische Ausblicke",
    staffReadyLiving: "Für Personal vorbereitet",
    cryptoSupport: "Krypto-Unterstützung",
    priceOnApplication: "Preis auf Anfrage",
    privacyLower: "Privatsphäre",
    viewExplanation: "Erklärung ansehen",
    inComparison: "Im Vergleich",
    compare: "Vergleichen",
    privateViewing: "Private Besichtigung",
    privateMap: "Private Karte",
    investmentSnapshot: "Investitionsübersicht",
    decisionBrief: "Aktuelle Entscheidungsübersicht",
    selectResidence: "Residenz auswählen",
    noMatchingResidences: "Keine Residenzen entsprechen den aktuellen Filtern.",
    assets: "Objekte",
    openExplanation: "Erklärung öffnen",
    illustratedDrawingsGuide: "Illustrationen + Einheitenleitfaden",
    illustratedExplanation: "Illustrierte Erklärung",
    seeUnitBeforeArrival: "Sehen Sie die Einheit, bevor Sie ankommen.",
    unitExplanationCopy:
      "Unser Team erstellt private visuelle Erklärungen für ausgewählte Mietobjekte, inklusive Illustrationen, Grundrissnotizen, Ankunftsabläufen, Ausstattungskarten und raumweiser Nutzung.",
    openUnitExplanation: "Einheitenerklärung öffnen",
    vipConcierge: "VIP-Concierge",
    privateAccessSteps: "Privater Zugang in drei ruhigen Schritten.",
    purpose: "Zweck",
    rentalReservation: "Mietreservierung",
    unitExplanationRequest: "Anfrage zur Einheitenerklärung",
    preferredDate: "Wunschtermin",
    channel: "Kanal",
    whatsappBusiness: "WhatsApp Business",
    premiumVideoCall: "Premium-Videoanruf",
    privateEmail: "Private E-Mail",
    preferences: "Präferenzen",
    preferencesPlaceholder: "Lifestyle, Privatsphäre, Gästetyp, Währung und besondere Wünsche",
    assignPrivateAdvisor: "Privaten Berater zuweisen",
    conciergeSent: "Concierge-Anfrage erfolgreich gesendet.",
    conciergeError: "Concierge-Anfrage konnte nicht gesendet werden.",
    confirmRequest: "Anfrage bestätigen",
    sendPrivateRequest: "Diese private Anfrage senden?",
    confirmationCopy:
      "Sie senden eine private Anfrage. Ihre Kontodaten und Ihr Briefing werden sicher für die Nachverfolgung durch den Berater gespeichert.",
    cancel: "Abbrechen",
    sendRequest: "Anfrage senden",
    confirmAction: "Aktion bestätigen",
    saveSettingsConfirmation: "Diese Website-Einstellungen speichern und live veröffentlichen?",
    deleteRequestConfirmation: "Diese Anfrage dauerhaft aus dem Admin-Posteingang löschen? Dies kann nicht rückgängig gemacht werden.",
    statusConfirmation: "Diese Statusänderung auf die ausgewählte Kundenanfrage anwenden?",
    saveUnitConfirmation: "Alle Änderungen an dieser Residenz speichern und veröffentlichen?",
    deleteUnitConfirmation: "Diese Residenz dauerhaft aus dem Katalog entfernen? Dies kann nicht rückgängig gemacht werden.",
    restoreDefaultsConfirmation: "Den aktuellen Residenzkatalog durch die Standardeinheiten ersetzen?",
    confirmSave: "Ja, Änderungen speichern",
    confirmDelete: "Ja, löschen",
    confirmUpdate: "Ja, aktualisieren",
    closeAdvisorForm: "Beraterformular schließen",
    describeResidence: "Beschreiben Sie die gewünschte Residenz.",
    advisorNote:
      "Der sicherste Weg ist ein kurzes privates Briefing: keine Zahlungsdaten, keine Passdaten und keine öffentlichen Nachrichten. Ihre Anfrage wird für die Beraternachverfolgung gespeichert.",
    name: "Name",
    email: "E-Mail",
    privatePhone: "Private Telefonnummer",
    buyOrInvest: "Kaufen oder investieren",
    listMyProperty: "Meine Immobilie listen",
    residence: "Residenz",
    advisorRecommendation: "Beraterempfehlung",
    budgetRange: "Budgetrahmen",
    confidential: "Vertraulich",
    privacyLevel: "Privatsphäre-Stufe",
    discreet: "Diskret",
    highPrivacy: "Hohe Privatsphäre",
    ultraPrivate: "Sehr privat",
    familyOfficeOnly: "Nur Family Office",
    contactChannel: "Kontaktkanal",
    describeUnitWanted: "Beschreiben Sie die gewünschte Einheit oder Residenz",
    requestPlaceholder: "Lage, Aussicht, Gästezahl, Personalbedarf, Sicherheit, Ausstattung, Ankunftszeit...",
    additionalPreferences: "Weitere Präferenzen",
    additionalPreferencesPlaceholder: "Architektur, Lifestyle, Ernährung, Yachtsteg, Helipad, Haustiere, Zahlungswährung...",
    sending: "Wird gesendet...",
    sendPrivateBrief: "Privates Briefing senden",
    advisorSignInRequired: "Melden Sie sich mit einem verifizierten Konto an, bevor Sie eine private Berateranfrage senden.",
    privateBriefSent: "Privates Briefing erfolgreich gesendet. Ein privater Berater prüft es und kontaktiert Sie über den gewählten Kanal.",
    privateBriefLocal: "Privates Briefing lokal gespeichert, aber Firebase hat die Synchronisierung nicht bestätigt. Bitte versuchen Sie es erneut oder prüfen Sie die Firestore-Regeln.",
    advisorError: "Berateranfrage konnte nicht gesendet werden.",
    illustratedUnitExplanation: "Illustrierte Einheitenerklärung",
    drawings: "Zeichnungen",
    included: "Inklusive",
    floorNotes: "Grundrissnotizen",
    zones: "Zonen",
    access: "Zugang",
    private: "Privat",
    whatYouReceive: "Was Sie erhalten",
    privateVisualClarity: "Private visuelle Klarheit.",
    privateAccess: "Privater Zugang",
    signupHeadline: "Registrieren Sie sich und sichern Sie Ihre Immobilie.",
    usernameOrEmail: "Benutzername oder E-Mail",
    password: "Passwort",
    confirmPassword: "Passwort bestätigen",
    passwordsDoNotMatch: "Die Passwörter stimmen nicht überein. Bitte geben Sie dasselbe Passwort zweimal ein.",
    showPassword: "Passwort anzeigen",
    hidePassword: "Passwort ausblenden",
    enterPrivatePortal: "Privates Portal öffnen",
    dontHaveAccount: "Noch kein Konto? Registrieren",
    fullName: "Vollständiger Name",
    intent: "Absicht",
    buy: "Kaufen",
    rent: "Mieten",
    invest: "Investieren",
    listAProperty: "Immobilie listen",
    createPrivateAccount: "Privates Konto erstellen",
    alreadyHaveAccount: "Bereits ein Konto? Anmelden",
    verifyAccount: "Konto verifizieren",
    confirmAccess: "Bestätigen Sie Ihren Zugang.",
    verificationSent: "Verifizierungs-E-Mail gesendet. Bestätigen Sie sie im Posteingang und melden Sie sich dann an.",
    verificationSendFailed: "Konto erstellt, aber Firebase hat die Verifizierungs-E-Mail nicht gesendet:",
    existingAccountVerify: "Diese E-Mail hat bereits ein Konto. Melden Sie sich mit dieser E-Mail und dem Passwort an und senden Sie die Verifizierungs-E-Mail erneut.",
    resendVerification: "Verifizierungs-E-Mail erneut senden",
    signingIn: "Anmeldung laeuft...",
    signedIn: "Angemeldet. Ihr Konto wird geoeffnet...",
    creatingAccount: "Privates Konto wird erstellt...",
    accountCreated: "Konto erstellt. Verifizierungs-E-Mail gesendet.",
    verificationResent: "Verifizierungs-E-Mail erneut gesendet. Bitte prüfen Sie Posteingang, Spam und Werbung. Firebase kann wiederholte Sendungen verzögern.",
    verificationSentShort: "Gesendet - Posteingang prüfen",
    verificationResendFailed: "Verifizierungs-E-Mail konnte nicht erneut gesendet werden.",
    verificationCopy: "Wir haben eine Verifizierungs-E-Mail gesendet an",
    verifyThenSignIn: "Verifizieren Sie sie und melden Sie sich dann an.",
    signInFailed: "Anmeldung fehlgeschlagen.",
    createAccountError: "Konto konnte nicht erstellt werden.",
    privateProfile: "Privates Profil",
    verifiedAccount: "Verifiziertes privates Konto",
    verificationPending: "E-Mail-Verifizierung ausstehend",
    profileImageUrl: "Profilbild-URL",
    profileImageUpload: "Profilbild hochladen",
    profileImageHelp: "JPG, PNG oder WebP · maximal 5 MB",
    uploadingProfileImage: "Profilbild wird hochgeladen...",
    changeProfileImage: "Profilbild auswählen oder ändern",
    profileImageSelected: "Wird beim Speichern des Profils hochgeladen",
    saveProfile: "Profil speichern",
    savingProfile: "Profil wird gespeichert...",
    profileSaved: "Profil gespeichert.",
    saveProfileConfirmation: "Diese Profildaten speichern und das ausgewählte Profilbild auf Ihr Konto anwenden?",
    confirmProfileSave: "Ja, Profil speichern",
    logOutConfirmation: "Von diesem Konto abmelden und zum öffentlichen Zugang zurückkehren?",
    confirmLogOut: "Ja, abmelden",
    profileSaveFailed: "Profil konnte nicht gespeichert werden.",
    logOut: "Abmelden",
    controlRoom: "Kontrollraum.",
    totalListings: "Alle Inserate",
    poaAssets: "Objekte auf Anfrage",
    newRequests: "Neue Anfragen",
    inbox: "Posteingang",
    addNewUnit: "Neue Einheit hinzufügen",
    yield: "Rendite",
    occupancy: "Auslastung",
    edit: "Bearbeiten",
    open: "Öffnen",
    adminPassword: "Admin-Passwort",
    unlockSettings: "Einstellungen entsperren",
    settingsUnlocked: "Einstellungen entsperrt.",
    wrongAdminPassword: "Falsches Admin-Passwort.",
    brandName: "Markenname",
    whatsappUrl: "WhatsApp-URL",
    defaultCurrency: "Standardwährung",
    cryptoNote: "Krypto-Hinweis",
    pendingRequests: "Ausstehende Anfragen",
    saveSiteSettings: "Website-Einstellungen speichern",
    siteSettingsSaved: "Website-Einstellungen gespeichert.",
    refreshInbox: "Posteingang aktualisieren",
    noRequestsFound: "Noch keine Anfragen gefunden.",
    privateRequest: "Private Anfrage",
    noBriefProvided: "Kein schriftliches Briefing vorhanden.",
    privateClient: "Privater Kunde",
    notProvided: "Nicht angegeben",
    status: "Status",
    reviewing: "In Prüfung",
    contacted: "Kontaktiert",
    closed: "Geschlossen",
    delete: "Löschen",
    backToControlRoom: "Zurück zum Kontrollraum",
    slug: "Slug",
    location: "Standort",
    mainImageUrl: "Hauptbild-URL",
    mainImage: "Hauptbild",
    useAsMain: "Als Hauptbild verwenden",
    detailImageUrls: "Bild-URLs der Detailseite",
    uploadGalleryImages: "Galeriebilder hochladen",
    useFirstUploadedMain: "Erstes hochgeladenes Bild als Hauptbild verwenden",
    priceUsd: "Preis USD",
    priceLabel: "Preislabel",
    bedrooms: "Schlafzimmer",
    interior: "Innenfläche",
    security: "Sicherheit",
    payment: "Zahlung",
    mapLeft: "Karte links",
    mapTop: "Karte oben",
    specs: "Spezifikationen",
    tags: "Tags",
    luxuryMetrics: "Luxuskennzahlen",
    rooms: "Räume",
    neighborhood: "Umgebung",
    illustrationSet: "Illustrationsset",
    explanation: "Erklärung",
    saveUnit: "Einheit speichern",
    removeUnit: "Einheit entfernen",
    unitRemoved: "Einheit erfolgreich entfernt.",
    unitRemoveError: "Diese Einheit konnte nicht entfernt werden.",
    seedDefaults: "Standardwerte laden",
    savingUnit: "Einheit wird gespeichert...",
    uploadedAndSaved: "Galeriebilder wurden in Firebase Storage hochgeladen und die Einheit gespeichert.",
    unitSaved: "Einheit erfolgreich gespeichert.",
    unitSaveError: "Änderungen an der Einheit konnten nicht gespeichert werden.",
  },
  it: {
    primaryNavigation: "Navigazione principale",
    mobileNavigation: "Navigazione mobile",
    language: "Lingua",
    residences: "Residenze",
    collections: "Collezioni",
    about: "Chi siamo",
    contact: "Contatto",
    concierge: "Concierge",
    exploreMap: "Mappa esplora",
    mapSearchHeadline: "Trova la tua prossima casa vacanza sulla mappa",
    mapSearchCopy: "Sfoglia la mappa, scegli paese e citta e invia una richiesta filtrata per trovare la migliore offerta indipendente.",
    areaNeighborhood: "Area o quartiere",
    searchAreaPlaceholder: "El Gouna, Sahl Hasheesh, Al Ahyaa...",
    country: "Paese",
    city: "Citta",
    countryPlaceholder: "Egitto",
    cityPlaceholder: "Hurghada",
    searchRange: "Raggio",
    duration: "Durata",
    anyDuration: "Qualsiasi durata",
    nightly: "Notte",
    weekly: "Settimanale",
    monthlyDuration: "Mensile",
    seasonal: "Stagionale",
    accommodationType: "Tipo di alloggio",
    allResidential: "Tutti gli affitti residenziali",
    studios: "Monolocali",
    monthlyRentals: "Affitti mensili",
    compounds: "Compound",
    apartments: "Appartamenti",
    searchMap: "Cerca sulla mappa",
    sendSearchRequest: "Invia richiesta ricerca",
    searchRequestSent: "Richiesta ricerca inviata al nostro team.",
    searchRequestFailed: "Impossibile inviare questa richiesta ricerca.",
    openMapSearch: "Apri ricerca mappa",
    searchingMap: "Ricerca mappa...",
    independentOnly: "Solo affitti indipendenti",
    sidePanelTitle: "Case indipendenti disponibili",
    mapPanelTitle: "Mappa affitti residenziali",
    excludedCommercial: "Hotel e resort esclusi",
    exactAddress: "Indirizzo esatto",
    noMapResults: "Nessun affitto indipendente trovato per questa area.",
    crmLeadLogged: "Ricerca salvata per follow-up del consulente.",
    crmLeadFailed: "Ricerca completata. Lead salvato localmente e sincronizzato quando disponibile.",
    apiFallbackNotice: "Mostriamo affitti indipendenti curati mentre Places/Gemini live non e disponibile.",
    showingBestMatches: "Mostriamo i migliori risultati indipendenti per il filtro scelto.",
    interestedDeal: "Interessato - crea accordo",
    dealRequestSent: "Richiesta accordo inviata al nostro team.",
    dealRequestFailed: "Impossibile inviare questa richiesta accordo.",
    chooseMapArea: "Scegli l'area preferita",
    chooseMapAreaHint: "Fai clic per impostare il centro, poi trascina la maniglia dorata sul bordo per ridimensionare il raggio.",
    selectedArea: "Area selezionata",
    selectedRangeReady: "La tua area preferita e pronta",
    selectedRangeCopy: "Centro, raggio e confini esatti saranno allegati alla richiesta.",
    centerPoint: "Punto centrale",
    rangeRadius: "Raggio",
    boundaryBox: "Confini",
    sendSelectedRange: "Invia area selezionata",
    signInToSendRange: "Accedi per inviare quest'area",
    searchMapDetail: "Aggiorna le residenze corrispondenti",
    sendRequestDetail: "Invia area e filtri al nostro team",
    profile: "Profilo",
    signIn: "Accedi",
    admin: "Admin",
    privateAdvisor: "Consulente privato",
    privateGlobalResidences: "Residenze private globali",
    footerSiteCopy: "Residenze private, affitti selezionati, ricerca geografica interattiva e consulenza riservata sul Mar Rosso.",
    footerExplore: "Esplora",
    footerPlatform: "Piattaforma",
    systemActive: "Sistema attivo",
    whyHurghada: "Perché Hurghada?",
    hurghadaHomeTitle: "Investi dove il mondo sceglie di vivere.",
    hurghadaHomeCopy: "Quaranta chilometri di costa, turismo tutto l'anno, collegamenti internazionali e valore eccezionale rendono Hurghada un mercato immobiliare ad alte prestazioni.",
    yearRoundDemand: "Domanda tutto l'anno",
    yearRoundDemandCopy: "Dodici mesi di turismo attivo sostengono occupazione e continuità dei ricavi locativi.",
    investorValue: "Vantaggio per l'investitore",
    investorValueCopy: "Dinamiche valutarie favorevoli e comunità costiere in crescita creano opportunità interessanti.",
    coastalLifestyle: "Lifestyle costiero",
    coastalLifestyleCopy: "365 giorni di sole, infrastrutture moderne e una comunità internazionale consolidata.",
    discoverHurghada: "Scopri l'opportunità Hurghada",
    exploreResidences: "Esplora le residenze",
    speakToAdvisor: "Parla con un consulente",
    destination: "Destinazione",
    global: "Globale",
    frenchRiviera: "Costa Azzurra",
    dubai: "Dubai",
    maldives: "Maldive",
    desertReserve: "Riserva nel deserto",
    lifestyle: "Lifestyle",
    anyLifestyle: "Qualsiasi lifestyle",
    beachfront: "Fronte mare",
    penthouse: "Attico",
    privateIsland: "Isola privata",
    wellness: "Wellness",
    investment: "Investimento",
    privacy: "Privacy",
    anyGrade: "Qualsiasi livello",
    privateGrade: "A+ privato",
    discreetGrade: "A discreto",
    curate: "Cura selezione",
    curatedByLife: "Curato per stile di vita, non per inventario",
    featuredCollections: "Collezioni in evidenza",
    waterfrontVillas: "Ville sull'acqua",
    skylinePenthouses: "Attici sopra lo skyline",
    investmentResidences: "Residenze d'investimento",
    curatedMatch: "Abbinamento curato",
    residencesFound: "residenze trovate",
    advancedSearch: "Ricerca avanzata",
    all: "Tutti",
    iWant: "Vorrei...",
    absolutePrivacy: "Privacy assoluta",
    iconicViews: "Viste iconiche",
    staffReadyLiving: "Abitazione pronta per lo staff",
    cryptoSupport: "Supporto crypto",
    priceOnApplication: "Prezzo su richiesta",
    privacyLower: "privacy",
    viewExplanation: "Vedi spiegazione",
    inComparison: "Nel confronto",
    compare: "Confronta",
    privateViewing: "Visita privata",
    privateMap: "Mappa privata",
    investmentSnapshot: "Panoramica investimento",
    decisionBrief: "Sintesi decisionale aggiornata",
    selectResidence: "Seleziona una residenza",
    noMatchingResidences: "Nessuna residenza corrisponde ai filtri attuali.",
    assets: "asset",
    openExplanation: "Apri spiegazione",
    illustratedDrawingsGuide: "Illustrazioni + guida dell'unita",
    illustratedExplanation: "Spiegazione illustrata",
    seeUnitBeforeArrival: "Guarda l'unita prima del tuo arrivo.",
    unitExplanationCopy:
      "Il nostro team prepara spiegazioni visive private per affitti selezionati, incluse illustrazioni, note sulle planimetrie, percorsi di arrivo, mappe dei servizi e guida stanza per stanza.",
    openUnitExplanation: "Apri spiegazione unita",
    vipConcierge: "Concierge VIP",
    privateAccessSteps: "Accesso privato in tre passaggi discreti.",
    purpose: "Finalita",
    rentalReservation: "Prenotazione affitto",
    unitExplanationRequest: "Richiesta spiegazione unita",
    preferredDate: "Data preferita",
    channel: "Canale",
    whatsappBusiness: "WhatsApp Business",
    premiumVideoCall: "Videochiamata premium",
    privateEmail: "Email privata",
    preferences: "Preferenze",
    preferencesPlaceholder: "Lifestyle, privacy, profilo ospiti, valuta e richieste speciali",
    assignPrivateAdvisor: "Assegna consulente privato",
    conciergeSent: "Richiesta concierge inviata con successo.",
    conciergeError: "Impossibile inviare la richiesta concierge.",
    confirmRequest: "Conferma richiesta",
    sendPrivateRequest: "Inviare questa richiesta privata?",
    confirmationCopy:
      "Stai per inviare una richiesta privata. I dettagli del tuo account e il brief saranno salvati in modo sicuro per il follow-up del consulente.",
    cancel: "Annulla",
    sendRequest: "Invia richiesta",
    confirmAction: "Conferma azione",
    saveSettingsConfirmation: "Salvare queste impostazioni e pubblicarle nell'esperienza live?",
    deleteRequestConfirmation: "Eliminare definitivamente questa richiesta dalla inbox admin? L'azione non può essere annullata.",
    statusConfirmation: "Applicare questo cambio di stato alla richiesta cliente selezionata?",
    saveUnitConfirmation: "Salvare e pubblicare tutte le modifiche apportate a questa residenza?",
    deleteUnitConfirmation: "Rimuovere definitivamente questa residenza dal catalogo? L'azione non può essere annullata.",
    restoreDefaultsConfirmation: "Sostituire il catalogo attuale con le unità predefinite?",
    confirmSave: "Sì, salva modifiche",
    confirmDelete: "Sì, elimina",
    confirmUpdate: "Sì, aggiorna",
    closeAdvisorForm: "Chiudi modulo consulente",
    describeResidence: "Descrivi la residenza di cui hai bisogno.",
    advisorNote:
      "Il percorso piu sicuro e un breve brief privato: niente dati di pagamento, niente passaporti e niente messaggi pubblici. La richiesta viene salvata sulla piattaforma per il follow-up.",
    name: "Nome",
    email: "Email",
    privatePhone: "Telefono privato",
    buyOrInvest: "Acquistare o investire",
    listMyProperty: "Inserisci la mia proprieta",
    residence: "Residenza",
    advisorRecommendation: "Raccomandazione del consulente",
    budgetRange: "Fascia budget",
    confidential: "Riservato",
    privacyLevel: "Livello privacy",
    discreet: "Discreto",
    highPrivacy: "Alta privacy",
    ultraPrivate: "Ultra privato",
    familyOfficeOnly: "Solo family office",
    contactChannel: "Canale di contatto",
    describeUnitWanted: "Descrivi l'unita o la residenza desiderata",
    requestPlaceholder: "Posizione, vista, numero ospiti, staff, sicurezza, servizi, orario di arrivo...",
    additionalPreferences: "Preferenze aggiuntive",
    additionalPreferencesPlaceholder: "Architettura, lifestyle, esigenze alimentari, yacht dock, eliporto, animali, valuta di pagamento...",
    sending: "Invio...",
    sendPrivateBrief: "Invia brief privato",
    advisorSignInRequired: "Accedi con un account verificato prima di inviare una richiesta al consulente privato.",
    privateBriefSent: "Brief privato inviato con successo. Un consulente privato lo esaminera e ti contattera tramite il canale scelto.",
    privateBriefLocal: "Brief privato salvato localmente, ma Firebase non ha confermato la sincronizzazione. Riprova o controlla le regole Firestore.",
    advisorError: "Impossibile inviare la richiesta al consulente.",
    illustratedUnitExplanation: "Spiegazione illustrata dell'unita",
    drawings: "Disegni",
    included: "Incluso",
    floorNotes: "Note planimetria",
    zones: "zone",
    access: "Accesso",
    private: "Privato",
    whatYouReceive: "Cosa ricevi",
    privateVisualClarity: "Chiarezza visiva privata.",
    privateAccess: "Accesso privato",
    signupHeadline: "Registrati e ottieni la tua proprieta.",
    usernameOrEmail: "Nome utente o email",
    password: "Password",
    confirmPassword: "Conferma password",
    passwordsDoNotMatch: "Le password non corrispondono. Inserisci la stessa password due volte.",
    showPassword: "Mostra password",
    hidePassword: "Nascondi password",
    enterPrivatePortal: "Entra nel portale privato",
    dontHaveAccount: "Non hai un account? Registrati",
    fullName: "Nome completo",
    intent: "Intento",
    buy: "Acquistare",
    rent: "Affittare",
    invest: "Investire",
    listAProperty: "Inserire una proprieta",
    createPrivateAccount: "Crea account privato",
    alreadyHaveAccount: "Hai gia un account? Accedi",
    verifyAccount: "Verifica account",
    confirmAccess: "Conferma il tuo accesso.",
    verificationSent: "Email di verifica inviata. Confermala nella posta in arrivo, poi accedi.",
    verificationSendFailed: "Account creato, ma Firebase non ha inviato l'email di verifica:",
    existingAccountVerify: "Questa email ha gia un account. Accedi con email e password, poi reinvia l'email di verifica.",
    resendVerification: "Reinvia email di verifica",
    signingIn: "Accesso in corso...",
    signedIn: "Accesso riuscito. Apertura account...",
    creatingAccount: "Creazione account privato...",
    accountCreated: "Account creato. Email di verifica inviata.",
    verificationResent: "Email di verifica inviata di nuovo. Controlla inbox, spam e promozioni. Firebase puo ritardare invii ripetuti.",
    verificationSentShort: "Inviata - controlla la posta",
    verificationResendFailed: "Impossibile reinviare l'email di verifica.",
    verificationCopy: "Abbiamo inviato un'email di verifica a",
    verifyThenSignIn: "Verificala, poi accedi.",
    signInFailed: "Accesso non riuscito.",
    createAccountError: "Impossibile creare l'account.",
    privateProfile: "Profilo privato",
    verifiedAccount: "Account privato verificato",
    verificationPending: "Verifica email in sospeso",
    profileImageUrl: "URL immagine profilo",
    profileImageUpload: "Carica immagine profilo",
    profileImageHelp: "JPG, PNG o WebP · massimo 5 MB",
    uploadingProfileImage: "Caricamento immagine profilo...",
    changeProfileImage: "Scegli o cambia immagine profilo",
    profileImageSelected: "Verrà caricata quando salvi il profilo",
    saveProfile: "Salva profilo",
    savingProfile: "Salvataggio profilo...",
    profileSaved: "Profilo salvato.",
    saveProfileConfirmation: "Salvare questi dati e applicare l'immagine profilo selezionata al tuo account?",
    confirmProfileSave: "Sì, salva profilo",
    logOutConfirmation: "Uscire da questo account e tornare all'accesso pubblico?",
    confirmLogOut: "Sì, esci",
    profileSaveFailed: "Impossibile salvare il profilo.",
    logOut: "Esci",
    controlRoom: "control room.",
    totalListings: "Inserzioni totali",
    poaAssets: "Asset su richiesta",
    newRequests: "Nuove richieste",
    inbox: "Inbox",
    addNewUnit: "Aggiungi nuova unita",
    yield: "Rendimento",
    occupancy: "Occupazione",
    edit: "Modifica",
    open: "Apri",
    adminPassword: "Password admin",
    unlockSettings: "Sblocca impostazioni",
    settingsUnlocked: "Impostazioni sbloccate.",
    wrongAdminPassword: "Password admin errata.",
    brandName: "Nome brand",
    whatsappUrl: "URL WhatsApp",
    defaultCurrency: "Valuta predefinita",
    cryptoNote: "Nota crypto",
    pendingRequests: "Richieste in sospeso",
    saveSiteSettings: "Salva impostazioni sito",
    siteSettingsSaved: "Impostazioni sito salvate.",
    refreshInbox: "Aggiorna inbox",
    noRequestsFound: "Nessuna richiesta trovata.",
    privateRequest: "Richiesta privata",
    noBriefProvided: "Nessun brief scritto fornito.",
    privateClient: "Cliente privato",
    notProvided: "Non fornito",
    status: "Stato",
    reviewing: "In revisione",
    contacted: "Contattato",
    closed: "Chiuso",
    delete: "Elimina",
    backToControlRoom: "Torna al control room",
    slug: "Slug",
    location: "Localita",
    mainImageUrl: "URL immagine principale",
    mainImage: "Immagine principale",
    useAsMain: "Usa come principale",
    detailImageUrls: "URL immagini pagina dettagli",
    uploadGalleryImages: "Carica immagini galleria",
    useFirstUploadedMain: "Usa la prima immagine caricata come principale",
    priceUsd: "Prezzo USD",
    priceLabel: "Etichetta prezzo",
    bedrooms: "Camere",
    interior: "Interni",
    security: "Sicurezza",
    payment: "Pagamento",
    mapLeft: "Mappa sinistra",
    mapTop: "Mappa alto",
    specs: "Specifiche",
    tags: "Tag",
    luxuryMetrics: "Metriche luxury",
    rooms: "Stanze",
    neighborhood: "Quartiere",
    illustrationSet: "Set illustrazioni",
    explanation: "Spiegazione",
    saveUnit: "Salva unita",
    removeUnit: "Rimuovi unita",
    unitRemoved: "Unita rimossa con successo.",
    unitRemoveError: "Impossibile rimuovere questa unita.",
    seedDefaults: "Carica predefiniti",
    savingUnit: "Salvataggio unita...",
    uploadedAndSaved: "Immagini galleria caricate su Firebase Storage e unita salvata.",
    unitSaved: "Unita salvata con successo.",
    unitSaveError: "Impossibile salvare le modifiche dell'unita.",
  },
};

type TranslationKey = keyof typeof translations.en;

const LanguageContext = createContext<LanguageContextValue | null>(null);

const getInitialLanguage = (): Language => {
  const saved = localStorage.getItem("auraLanguage") as Language | null;
  return saved && languages.some((item) => item.code === saved) ? saved : "en";
};

const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error("Language context is unavailable.");
  return context;
};

const iconPaths: Record<IconName, string[]> = {
  arrowLeft: ["M19 12H5", "M12 19l-7-7 7-7"],
  arrowRight: ["M5 12h14", "M12 5l7 7-7 7"],
  building: ["M4 20h16", "M6 20V6l8-3 4 2v15", "M9 9h1", "M9 13h1", "M14 9h1", "M14 13h1"],
  calendar: ["M7 3v4", "M17 3v4", "M4 8h16", "M5 5h14v15H5z"],
  check: ["M5 12l4 4L19 6"],
  compass: ["M12 3l7 18-7-4-7 4 7-18z"],
  compare: ["M8 7h12", "M16 3l4 4-4 4", "M16 17H4", "M8 13l-4 4 4 4"],
  edit: ["M4 20h4L19 9l-4-4L4 16v4z", "M13 7l4 4"],
  external: ["M14 4h6v6", "M10 14L20 4", "M20 14v6H4V4h6"],
  eye: ["M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z", "M9 12a3 3 0 1 0 6 0 3 3 0 0 0-6 0"],
  globe: ["M3 12h18", "M12 3a15 15 0 0 1 0 18", "M12 3a15 15 0 0 0 0 18", "M4 8h16", "M4 16h16"],
  image: ["M4 5h16v14H4z", "M8 13l3-3 3 4 2-2 4 5", "M8 8h.01"],
  inbox: ["M4 4h16l-2 10h-4l-2 3-2-3H6L4 4z", "M4 14v6h16v-6"],
  key: ["M14 10a4 4 0 1 0-4 4l-5 5h4v-3h3l2-2", "M14 10h.01"],
  layers: ["M12 3l9 5-9 5-9-5 9-5z", "M3 12l9 5 9-5", "M3 16l9 5 9-5"],
  lock: ["M6 10h12v10H6z", "M8 10V7a4 4 0 0 1 8 0v3"],
  map: ["M4 6l5-2 6 2 5-2v14l-5 2-6-2-5 2V6z", "M9 4v14", "M15 6v14"],
  message: ["M4 5h16v11H8l-4 4V5z"],
  plus: ["M12 5v14", "M5 12h14"],
  refresh: ["M20 7v6h-6", "M4 17v-6h6", "M20 13a8 8 0 0 1-14 4", "M4 11a8 8 0 0 1 14-4"],
  save: ["M5 4h12l2 2v14H5z", "M8 4v6h8", "M8 20v-6h8v6"],
  search: ["M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15z", "M16 16l5 5"],
  settings: ["M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z", "M4 12h2", "M18 12h2", "M12 4v2", "M12 18v2", "M6.5 6.5l1.5 1.5", "M16 16l1.5 1.5", "M17.5 6.5L16 8", "M8 16l-1.5 1.5"],
  shield: ["M12 3l7 3v5c0 5-3 8-7 10-4-2-7-5-7-10V6l7-3z"],
  spark: ["M12 3l2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3z"],
  trash: ["M4 7h16", "M9 7V4h6v3", "M7 7l1 13h8l1-13"],
  upload: ["M12 16V4", "M7 9l5-5 5 5", "M5 20h14"],
  user: ["M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8z", "M4 21a8 8 0 0 1 16 0"],
  wallet: ["M4 7h16v12H4z", "M16 12h4", "M4 7l3-3h11"],
  x: ["M6 6l12 12", "M18 6L6 18"],
};

function Icon({ name }: { name: IconName }) {
  return (
    <svg className="ui-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {iconPaths[name].map((path) => (
        <path d={path} key={path} />
      ))}
    </svg>
  );
}

const route = () => {
  const hash = window.location.hash.replace(/^#\/?/, "");
  const [path = "home", query = ""] = hash.split("?");
  const [page = "home", id = ""] = path.split("/");
  return { page: (page || "home") as Page, id, query };
};

const go = (path: string) => {
  window.location.hash = path;
};

const smoothScrollTo = (id: string) => {
  const element = document.getElementById(id);
  if (!element) return;
  const offset = 86;
  const top = element.getBoundingClientRect().top + window.scrollY - offset;
  window.scrollTo({ top, behavior: "smooth" });
};

const goHomeSection = (id: string) => {
  if (!window.location.hash || window.location.hash === "#/home") {
    smoothScrollTo(id);
    return;
  }

  window.location.hash = "/home";
  window.setTimeout(() => smoothScrollTo(id), 120);
};

const accommodationOptions: { value: AccommodationType; labelKey: TranslationKey }[] = [
  { value: "all", labelKey: "allResidential" },
  { value: "studio", labelKey: "studios" },
  { value: "monthly", labelKey: "monthlyRentals" },
  { value: "compound", labelKey: "compounds" },
  { value: "apartment", labelKey: "apartments" },
];

const durationOptions: { value: DurationType; labelKey: TranslationKey }[] = [
  { value: "any", labelKey: "anyDuration" },
  { value: "nightly", labelKey: "nightly" },
  { value: "weekly", labelKey: "weekly" },
  { value: "monthly", labelKey: "monthlyDuration" },
  { value: "seasonal", labelKey: "seasonal" },
];

const hurghadaAreas = ["El Gouna", "Sahl Hasheesh", "Al Ahyaa", "Sheraton Road", "El Kawther", "Makadi Bay", "Mubarak 6"];
const areaCenters: Record<string, { lat: number; lng: number }> = {
  hurghada: { lat: 27.2579, lng: 33.8116 },
  "el gouna": { lat: 27.4026, lng: 33.6785 },
  "sahl hasheesh": { lat: 27.0522, lng: 33.8892 },
  "al ahyaa": { lat: 27.3132, lng: 33.7395 },
  "sheraton road": { lat: 27.2176, lng: 33.8382 },
  "el kawther": { lat: 27.1913, lng: 33.8268 },
  "mubarak 6": { lat: 27.2258, lng: 33.8038 },
};
const commercialBlockList = ["hotel", "resort", "hostel", "motel", "inn", "lodge", "casino", "marriott", "hilton", "steigenberger", "rixos", "jazz", "jaz ", "sentido", "steigen", "club"];

const curatedHurghadaRentals: MapRental[] = [
  { id: "gouna-lagoon-studio", title: "Lagoon View Studio Residence", address: "Abu Tig Marina Extension, El Gouna, Hurghada", area: "El Gouna", category: "studio", image: heroVillaImage, summary: "Compact marina-side studio suitable for short stays and owner-managed rental checks.", lat: 27.4026, lng: 33.6785, bedrooms: 1, priceLabel: "Monthly ready", source: "curated" },
  { id: "gouna-marina-apartment", title: "Marina One Bedroom Apartment", address: "New Marina Walk, El Gouna, Hurghada", area: "El Gouna", category: "apartment", image: penthouseImage, summary: "Independent one-bedroom apartment near the marina promenade, not a hotel inventory unit.", lat: 27.4098, lng: 33.6741, bedrooms: 1, priceLabel: "Short stay / monthly", source: "curated" },
  { id: "gouna-west-compound", title: "West Golf Compound Residence", address: "West Golf Residential Cluster, El Gouna, Hurghada", area: "El Gouna", category: "compound", image: islandVillaImage, summary: "Compound residence with private owner rental potential and advisor review required.", lat: 27.3908, lng: 33.6657, bedrooms: 2, priceLabel: "Owner managed", source: "curated" },
  { id: "gouna-monthly-townhome", title: "Downtown Monthly Town Apartment", address: "Downtown El Gouna Residential Lane, Hurghada", area: "El Gouna", category: "monthly", image: "assets/desert-villa.png", summary: "Monthly rental candidate in a residential lane for longer stays and relocation clients.", lat: 27.3951, lng: 33.6779, bedrooms: 2, priceLabel: "Monthly lease", source: "curated" },
  { id: "sahl-hasheesh-compound", title: "Bayfront Compound Apartment", address: "Old Town Promenade, Sahl Hasheesh, Hurghada", area: "Sahl Hasheesh", category: "compound", image: islandVillaImage, summary: "Residential compound apartment near the promenade, screened away from resort inventory.", lat: 27.0499, lng: 33.8911, bedrooms: 2, priceLabel: "Managed rental", source: "curated" },
  { id: "sahl-hasheesh-monthly", title: "Palm Residence Monthly Rental", address: "Palm Beach Road Residential Strip, Sahl Hasheesh, Hurghada", area: "Sahl Hasheesh", category: "monthly", image: "assets/desert-villa.png", summary: "Longer-stay residential rental candidate with owner negotiation required.", lat: 27.0576, lng: 33.8828, bedrooms: 2, priceLabel: "Monthly lease", source: "curated" },
  { id: "sahl-hasheesh-studio", title: "Old Town Studio Suite", address: "Old Town Residential Court, Sahl Hasheesh, Hurghada", area: "Sahl Hasheesh", category: "studio", image: heroVillaImage, summary: "Small independent studio-style unit for individual travelers and remote-work stays.", lat: 27.0522, lng: 33.8892, bedrooms: 1, priceLabel: "Flexible rental", source: "curated" },
  { id: "sahl-hasheesh-apartment", title: "Veranda District Two Bedroom", address: "Veranda Residential District, Sahl Hasheesh, Hurghada", area: "Sahl Hasheesh", category: "apartment", image: penthouseImage, summary: "Two-bedroom apartment candidate in a residential district, suitable for advisor follow-up.", lat: 27.0612, lng: 33.8784, bedrooms: 2, priceLabel: "Advisor pricing", source: "curated" },
  { id: "ahyaa-studio", title: "North Coast Studio Unit", address: "Al Ahyaa Coastal Road, Hurghada", area: "Al Ahyaa", category: "studio", image: heroVillaImage, summary: "Independent studio on the northern coastal road with flexible rental potential.", lat: 27.3132, lng: 33.7395, bedrooms: 1, priceLabel: "Flexible rental", source: "curated" },
  { id: "ahyaa-monthly", title: "Al Ahyaa Monthly Flat", address: "Al Ahyaa Residential Block, Hurghada", area: "Al Ahyaa", category: "monthly", image: "assets/desert-villa.png", summary: "Simple monthly residential flat for budget-conscious long stays.", lat: 27.3007, lng: 33.7465, bedrooms: 1, priceLabel: "Monthly option", source: "curated" },
  { id: "kawther-apartment", title: "El Kawther City Apartment", address: "El Kawther District, Hurghada", area: "El Kawther", category: "apartment", image: penthouseImage, summary: "City apartment close to daily services, best handled by direct owner negotiation.", lat: 27.1913, lng: 33.8268, bedrooms: 2, priceLabel: "City rental", source: "curated" },
  { id: "kawther-studio", title: "El Kawther Compact Studio", address: "El Kawther Residential Street, Hurghada", area: "El Kawther", category: "studio", image: heroVillaImage, summary: "Compact private studio in a residential zone, not hotel-operated.", lat: 27.1957, lng: 33.8214, bedrooms: 1, priceLabel: "Flexible rental", source: "curated" },
  { id: "mubarak-six-compound", title: "Mubarak 6 Garden Compound Home", address: "Mubarak 6, Hurghada", area: "Mubarak 6", category: "compound", image: "assets/desert-villa.png", summary: "Family-sized compound home for private rental management or purchase inquiry.", lat: 27.2258, lng: 33.8038, bedrooms: 3, priceLabel: "Family ready", source: "curated" },
  { id: "mubarak-six-apartment", title: "Mubarak 6 Residential Apartment", address: "Mubarak 6 Residential Zone, Hurghada", area: "Mubarak 6", category: "apartment", image: penthouseImage, summary: "Residential apartment with owner-side negotiation and advisory follow-up.", lat: 27.2301, lng: 33.8076, bedrooms: 2, priceLabel: "Advisor pricing", source: "curated" },
  { id: "sheraton-monthly", title: "Sheraton Road Private Apartment", address: "Sheraton Road Residential Block, Hurghada", area: "Sheraton Road", category: "monthly", image: penthouseImage, summary: "Monthly private apartment close to central services and marina access.", lat: 27.2176, lng: 33.8382, bedrooms: 2, priceLabel: "Monthly option", source: "curated" },
  { id: "sheraton-studio", title: "Sheraton Road Studio Flat", address: "Sheraton Road Side Street, Hurghada", area: "Sheraton Road", category: "studio", image: heroVillaImage, summary: "Private studio flat in the central corridor, suitable for quick advisor screening.", lat: 27.2204, lng: 33.8349, bedrooms: 1, priceLabel: "Short stay", source: "curated" },
];

const isCommercialAccommodation = (rental: MapRental) => {
  const searchable = `${rental.title} ${rental.address} ${(rental.placeTypes || []).join(" ")}`.toLowerCase();
  return commercialBlockList.some((word) => searchable.includes(word)) || (rental.placeTypes || []).some((type) => ["hotel", "lodging", "resort_hotel"].includes(type));
};

const normalizeSearchText = (value: string) =>
  value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const defaultDurationsFor = (rental: Pick<MapRental, "category" | "priceLabel">): DurationType[] => {
  const label = rental.priceLabel.toLowerCase();
  if (rental.category === "monthly" || label.includes("monthly")) return ["monthly", "seasonal"];
  if (rental.category === "studio") return ["nightly", "weekly", "monthly"];
  if (rental.category === "compound") return ["weekly", "monthly", "seasonal"];
  return ["nightly", "weekly", "monthly"];
};

const distanceKm = (a: { lat: number; lng: number }, b: { lat: number; lng: number }) => {
  const toRad = (value: number) => (value * Math.PI) / 180;
  const earthKm = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const x = Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * earthKm * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
};

const dedupeRentals = (rentals: MapRental[]) => {
  const seen = new Set<string>();
  return rentals.filter((rental) => {
    const key = `${normalizeSearchText(rental.title)}|${normalizeSearchText(rental.address)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const filterIndependentRentals = (
  rentals: MapRental[],
  area: string,
  category: AccommodationType,
  duration: DurationType = "any",
  radiusKm = 60,
  country = "Egypt",
  city = "Hurghada"
) => {
  const normalizedCountry = normalizeSearchText(country);
  const normalizedCity = normalizeSearchText(city);
  const normalizedArea = normalizeSearchText(area);
  const broadHurghadaSearch = !normalizedArea || normalizedArea === "hurghada";
  const centerKey = normalizedArea && areaCenters[normalizedArea] ? normalizedArea : normalizedCity && areaCenters[normalizedCity] ? normalizedCity : "hurghada";
  const center = areaCenters[centerKey] || areaCenters.hurghada;
  return dedupeRentals(rentals).filter((rental) => {
    if (normalizedCountry && normalizedCountry !== "egypt") return false;
    if (normalizedCity && normalizedCity !== "hurghada") return false;
    const areaText = normalizeSearchText(`${rental.area} ${rental.address}`);
    const matchesArea = broadHurghadaSearch || areaText.includes(normalizedArea);
    const matchesCategory = category === "all" || rental.category === category;
    const matchesDuration = duration === "any" || (rental.durations || defaultDurationsFor(rental)).includes(duration);
    const inRange = distanceKm(center, rental) <= radiusKm;
    return matchesArea && matchesCategory && matchesDuration && inRange && !isCommercialAccommodation(rental);
  });
};

const normalizeProxyRentals = (items: Partial<MapRental>[] = []): MapRental[] =>
  items
    .filter((item) => item.title && item.address && typeof item.lat === "number" && typeof item.lng === "number")
    .map((item, index) => ({
      id: item.id || `proxy-rental-${index + 1}`,
      title: item.title || "Independent rental",
      address: item.address || "Hurghada",
      area: item.area || "Hurghada",
      category: item.category || "apartment",
      image: item.image || (item.category === "studio" ? heroVillaImage : item.category === "compound" ? islandVillaImage : penthouseImage),
      summary: item.summary || "Live map result screened for independent residential rental review.",
      durations: item.durations || defaultDurationsFor({ category: item.category || "apartment", priceLabel: item.priceLabel || "Advisor pricing" }),
      lat: item.lat || 27.2579,
      lng: item.lng || 33.8116,
      bedrooms: item.bedrooms || 1,
      priceLabel: item.priceLabel || "Advisor pricing",
      source: "proxy",
      placeTypes: item.placeTypes || [],
    }));

async function searchIndependentRentals(country: string, city: string, area: string, category: AccommodationType, duration: DurationType, radiusKm: number) {
  const endpoint = (import.meta.env.VITE_ACCOMMODATION_SEARCH_ENDPOINT as string | undefined) || "/api/search-accommodations";
  if (endpoint) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        country,
        area,
        city,
        radiusKm,
        accommodationType: category,
        duration,
        excludeCommercialTypes: ["hotel", "resort", "lodging"],
        categories: ["Studios", "Monthly Rentals", "Compounds", "Apartments"],
        providerIntent: "Google Places plus Gemini residential classification",
      }),
    });
    if (!response.ok) throw new Error("Map search endpoint failed.");
    const data = (await response.json()) as { results?: Partial<MapRental>[] };
    const proxyMatches = filterIndependentRentals(normalizeProxyRentals(data.results), area, category, duration, radiusKm, country, city);
    return {
      rentals: proxyMatches,
      usedFallback: proxyMatches.length === 0,
    };
  }

  return { rentals: filterIndependentRentals(curatedHurghadaRentals, area, category, duration, radiusKm, country, city), usedFallback: true };
}

async function getIndependentRentalResults(country: string, city: string, area: string, category: AccommodationType, duration: DurationType, radiusKm: number) {
  try {
    const result = await searchIndependentRentals(country, city, area, category, duration, radiusKm);
    if (result.rentals.length) return result;
    return { rentals: filterIndependentRentals(curatedHurghadaRentals, area, category, duration, radiusKm, country, city), usedFallback: true };
  } catch {
    return { rentals: filterIndependentRentals(curatedHurghadaRentals, area, category, duration, radiusKm, country, city), usedFallback: true };
  }
}

const initials = (value = "A") =>
  value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const option = (value: string, label = value): SelectOption => ({ value, label });

function useDismissOnOutside<T extends HTMLElement>(open: boolean, onDismiss: () => void) {
  const layerRef = useRef<T | null>(null);
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss;

  useEffect(() => {
    if (!open) return;
    const handlePointerDown = (event: PointerEvent) => {
      if (layerRef.current && !layerRef.current.contains(event.target as Node)) dismissRef.current();
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") dismissRef.current();
    };
    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return layerRef;
}

function LuxurySelect({
  name,
  value,
  defaultValue,
  options,
  onChange,
  tone = "light",
}: {
  name?: string;
  value?: string;
  defaultValue?: string;
  options: SelectOption[];
  onChange?: (value: string) => void;
  tone?: "light" | "dark";
}) {
  const selectId = useId();
  const [internalValue, setInternalValue] = useState(defaultValue || options[0]?.value || "");
  const [open, setOpen] = useState(false);
  const selectRef = useDismissOnOutside<HTMLDivElement>(open, () => setOpen(false));
  const selectedValue = value ?? internalValue;
  const selected = options.find((item) => item.value === selectedValue) || options[0];

  useEffect(() => {
    const closeOtherSelects = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== selectId) setOpen(false);
    };

    window.addEventListener("aura-select-open", closeOtherSelects);
    return () => window.removeEventListener("aura-select-open", closeOtherSelects);
  }, [selectId]);

  const choose = (nextValue: string) => {
    setInternalValue(nextValue);
    onChange?.(nextValue);
    setOpen(false);
  };

  return (
    <div ref={selectRef} className={`glass-select luxury-select ${open ? "open" : ""} ${tone}`}>
      {name && <input type="hidden" name={name} value={selectedValue} />}
      <button
        className="glass-select-button"
        type="button"
        onClick={() => {
          const nextOpen = !open;
          if (nextOpen) window.dispatchEvent(new CustomEvent("aura-select-open", { detail: selectId }));
          setOpen(nextOpen);
        }}
      >
        <span className="glass-select-value">{selected?.label || selectedValue}</span>
        <span className="glass-select-arrow" aria-hidden="true" />
      </button>
      <div className="glass-select-menu">
        {options.map((item) => (
          <button
            className={`glass-select-option ${item.value === selectedValue ? "selected" : ""}`}
            type="button"
            key={item.value}
            onClick={() => choose(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function LanguageSwitcher({ compact = false }: { compact?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  const [open, setOpen] = useState(false);
  const switcherRef = useDismissOnOutside<HTMLDivElement>(open, () => setOpen(false));
  const activeLanguage = languages.find((item) => item.code === language) || languages[0];

  return (
    <div ref={switcherRef} className={`language-switcher ${open ? "open" : ""} ${compact ? "compact" : ""}`}>
      <button
        className="language-trigger"
        type="button"
        aria-label={t("language")}
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon name="globe" />
        <span>{activeLanguage.code.toUpperCase()}</span>
      </button>
      <div className="language-menu" role="listbox" aria-label={t("language")}>
        {languages.map((item) => (
          <button
            className={language === item.code ? "active" : ""}
            type="button"
            key={item.code}
            role="option"
            aria-selected={language === item.code}
            onClick={() => {
              setLanguage(item.code);
              setOpen(false);
            }}
          >
            <span>{item.label}</span>
            <strong>{item.code.toUpperCase()}</strong>
          </button>
        ))}
      </div>
    </div>
  );
}

function ConfirmationModal({
  request,
  onDecision,
}: {
  request: ConfirmationRequest | null;
  onDecision: (confirmed: boolean) => void;
}) {
  const { t } = useLanguage();
  if (!request) return null;

  return (
    <aside className="request-confirmation open">
      <button className="confirmation-scrim" type="button" aria-label={t("cancel")} onClick={() => onDecision(false)} />
      <section className={`confirmation-panel ${request.tone || "default"}`} role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="confirmation-mark" aria-hidden="true"><Icon name={request.icon || "shield"} /></span>
        <p className="eyebrow">{request.eyebrow}</p>
        <h2 id="confirm-title">{request.title}</h2>
        <p>{request.description}</p>
        <div className="confirmation-actions">
          <button type="button" onClick={() => onDecision(false)}><Icon name="x" />{t("cancel")}</button>
          <button className="confirmation-accept" type="button" onClick={() => onDecision(true)}><Icon name={request.icon || "check"} />{request.confirmLabel}</button>
        </div>
      </section>
    </aside>
  );
}

function Header({
  user,
  settings,
  activePage,
  activeRouteId,
  onNavigate,
  onContact,
}: {
  user: Profile | null;
  settings: SiteSettings;
  activePage: Page;
  activeRouteId: string;
  onNavigate: (section: string) => void;
  onContact: () => void;
}) {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState(activePage === "home" ? "home" : "");
  const headerRef = useDismissOnOutside<HTMLElement>(mobileMenuOpen, () => setMobileMenuOpen(false));
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [mobileMenuOpen]);
  useEffect(() => {
    if (activePage !== "home") {
      setActiveSection("");
      return;
    }
    const sections = ["home", "collections", "residences", "concierge"];
    const updateActiveSection = () => {
      const marker = window.scrollY + 150;
      let current = "home";
      sections.forEach((section) => {
        const element = document.getElementById(section);
        if (element && element.offsetTop <= marker) current = section;
      });
      setActiveSection(current);
    };
    updateActiveSection();
    window.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => window.removeEventListener("scroll", updateActiveSection);
  }, [activePage]);
  const navigateDesktop = (section: string) => {
    setActiveSection(section);
    onNavigate(section);
  };
  const navigateMobile = (section: string) => {
    setMobileMenuOpen(false);
    setActiveSection(section);
    onNavigate(section);
  };

  return (
    <header ref={headerRef} className="site-header scrolled">
      <button className="brand brand-button" type="button" aria-current={activePage === "home" && activeSection === "home" ? "page" : undefined} onClick={() => navigateDesktop("home")}>
        <span className="brand-mark">A</span>
        <span>{settings.brandName}</span>
      </button>
      <nav className="desktop-nav" aria-label={t("primaryNavigation")}>
        <button type="button" aria-current={activePage === "home" && activeSection === "residences" ? "location" : undefined} onClick={() => navigateDesktop("residences")}><Icon name="building" />{t("residences")}</button>
        <button type="button" aria-current={activePage === "home" && activeSection === "collections" ? "location" : undefined} onClick={() => navigateDesktop("collections")}><Icon name="layers" />{t("collections")}</button>
        <a href="#/explore-map" aria-current={activePage === "explore-map" ? "page" : undefined}><Icon name="map" />{t("exploreMap")}</a>
        <a href="#/about" aria-current={activePage === "about" && activeRouteId !== "contact" ? "page" : undefined}><Icon name="globe" />{t("about")}</a>
        <button type="button" aria-current={activePage === "home" && activeSection === "concierge" ? "location" : undefined} onClick={() => navigateDesktop("concierge")}><Icon name="message" />{t("concierge")}</button>
        {!user && <a href="#/auth" aria-current={activePage === "auth" ? "page" : undefined}><Icon name="lock" />{t("signIn")}</a>}
        {isAdmin(user) && <a className="admin-nav-link" href="#/admin" aria-current={activePage === "admin" || activePage === "admin-unit" ? "page" : undefined}><Icon name="settings" />{t("admin")}</a>}
      </nav>
      <div className="header-actions">
        <LanguageSwitcher />
        <button className="advisor-button" type="button" aria-current={activePage === "about" && activeRouteId === "contact" ? "page" : undefined} onClick={onContact}>
          <Icon name="message" />{t("contact")}
        </button>
        {user && (
          <a className="profile-chip" href="#/profile" aria-current={activePage === "profile" ? "page" : undefined}>
            <span
              className="profile-avatar"
              style={user.photoURL ? { backgroundImage: `url("${user.photoURL}")` } : undefined}
            >
              {user.photoURL ? "" : initials(user.name || user.email)}
            </span>
            <span>{user.name || t("profile")}</span>
          </a>
        )}
        <button
          className={`mobile-menu-button ${mobileMenuOpen ? "open" : ""}`}
          type="button"
          aria-label={t("mobileNavigation")}
          aria-expanded={mobileMenuOpen}
          onClick={() => setMobileMenuOpen((open) => !open)}
        >
          <span />
          <span />
          <span />
        </button>
      </div>
      <nav className={`mobile-menu ${mobileMenuOpen ? "open" : ""}`} aria-label={t("mobileNavigation")}>
        <LanguageSwitcher compact />
        <button type="button" aria-current={activePage === "home" && activeSection === "residences" ? "location" : undefined} onClick={() => navigateMobile("residences")}><Icon name="building" />{t("residences")}</button>
        <button type="button" aria-current={activePage === "home" && activeSection === "collections" ? "location" : undefined} onClick={() => navigateMobile("collections")}><Icon name="layers" />{t("collections")}</button>
        <a href="#/explore-map" aria-current={activePage === "explore-map" ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}><Icon name="map" />{t("exploreMap")}</a>
        <a href="#/about" aria-current={activePage === "about" && activeRouteId !== "contact" ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}><Icon name="globe" />{t("about")}</a>
        <button type="button" aria-current={activePage === "home" && activeSection === "concierge" ? "location" : undefined} onClick={() => navigateMobile("concierge")}><Icon name="message" />{t("concierge")}</button>
        {!user && <a href="#/auth" aria-current={activePage === "auth" ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}><Icon name="lock" />{t("signIn")}</a>}
        {isAdmin(user) && <a className="admin-nav-link" href="#/admin" aria-current={activePage === "admin" || activePage === "admin-unit" ? "page" : undefined} onClick={() => setMobileMenuOpen(false)}><Icon name="settings" />{t("admin")}</a>}
        <button type="button" aria-current={activePage === "about" && activeRouteId === "contact" ? "page" : undefined} onClick={() => { setMobileMenuOpen(false); onContact(); }}><Icon name="message" />{t("contact")}</button>
      </nav>
    </header>
  );
}

function GlobalFooter({ settings, onNavigate }: { settings: SiteSettings; onNavigate: (section: string) => void }) {
  const { t } = useLanguage();
  return (
    <footer id="contact" className="site-footer wmd-footer">
      <div className="wmd-footer-main">
        <div className="wmd-footer-intro">
          <h3>{settings.brandName}</h3>
          <p>{t("footerSiteCopy")}</p>
        </div>
        <div className="wmd-footer-links">
          <div><p>{t("footerExplore")}</p><ul><li><a href="#/home" onClick={(event) => { event.preventDefault(); onNavigate("residences"); }}>{t("residences")}</a></li><li><a href="#/home" onClick={(event) => { event.preventDefault(); onNavigate("collections"); }}>{t("collections")}</a></li><li><a href="#/explore-map">{t("exploreMap")}</a></li></ul></div>
          <div><p>{t("footerPlatform")}</p><ul><li><a href="#/about">{t("about")}</a></li><li><a href="#/about/contact">{t("contact")}</a></li><li><a href="#/profile">{t("profile")}</a></li></ul></div>
        </div>
      </div>
      <div className="wmd-footer-signature">
        <img src="assets/wmd-office-logo.png" alt="W.M.D. office logo" />
        <div><p>© 2026 <strong>Future Coders</strong></p><span>Powered by W.M.D. office</span></div>
        <small><i aria-hidden="true" />{t("systemActive")}</small>
      </div>
    </footer>
  );
}

function HomePage({
  user,
  properties,
  settings,
  setProperties,
  onNavigate,
  onAdvisor,
  onConfirmRequest,
}: {
  user: Profile | null;
  properties: Property[];
  settings: SiteSettings;
  setProperties: (properties: Property[]) => void;
  onNavigate: (section: string) => void;
  onAdvisor: (context?: AdvisorContext) => void;
  onConfirmRequest: ConfirmAction;
}) {
  const { t } = useLanguage();
  const [destination, setDestination] = useState("all");
  const [lifestyle, setLifestyle] = useState("all");
  const [privacy, setPrivacy] = useState("all");
  const [currency, setCurrency] = useState<keyof typeof rates>(settings.defaultCurrency);
  const [activeSnapshot, setActiveSnapshot] = useState(0);
  const [curated, setCurated] = useState(false);
  const [comparison, setComparison] = useState<number[]>([]);
  const [bookingMessage, setBookingMessage] = useState("");

  useEffect(() => {
    setCurrency(settings.defaultCurrency);
  }, [settings.defaultCurrency]);

  const requireAccess = () => {
    if (hasPrivateAccess(user)) return true;
    go("/auth");
    return false;
  };

  const visible = useMemo(
    () =>
      properties.filter(
        (property) =>
          (destination === "all" || property.destination === destination) &&
          (lifestyle === "all" || property.tags.includes(lifestyle)) &&
          (privacy === "all" || property.privacy === privacy)
      ),
    [destination, lifestyle, privacy, properties]
  );

  const formatPrice = (property: Property) => {
    if (property.priceLabel === "POA") return t("priceOnApplication");
    const rate = rates[currency];
    return `${rate.symbol}${Math.round((property.priceUsd * rate.rate) / 100000) / 10}M`;
  };
  const lifestyleOptions = [
    option("all", t("anyLifestyle")),
    option("Beachfront", t("beachfront")),
    option("Penthouse", t("penthouse")),
    option("Private Island", t("privateIsland")),
    option("Wellness", t("wellness")),
    option("Investment", t("investment")),
  ];
  const tagLabel = (tag: string) =>
    tag === "Beachfront"
      ? t("beachfront")
      : tag === "Penthouse"
        ? t("penthouse")
        : tag === "Private Island"
          ? t("privateIsland")
          : tag === "Wellness"
            ? t("wellness")
            : tag === "Investment"
              ? t("investment")
              : tag;

  const openDetail = (slug: string) => {
    if (!requireAccess()) return;
    go(`/detail/${slug}`);
  };

  const openMapSearch = () => {
    const destinationMap: Record<string, { country: string; city: string; area: string }> = {
      all: { country: "Egypt", city: "Hurghada", area: "" },
      riviera: { country: "France", city: "Nice", area: "French Riviera" },
      dubai: { country: "United Arab Emirates", city: "Dubai", area: "Dubai Marina" },
      maldives: { country: "Maldives", city: "Male", area: "Private Atoll" },
      desert: { country: "United Arab Emirates", city: "Dubai", area: "Desert Reserve" },
    };
    const unitType: AccommodationType =
      lifestyle === "Penthouse" || lifestyle === "Beachfront"
        ? "apartment"
        : lifestyle === "Investment"
          ? "monthly"
          : lifestyle === "Wellness"
            ? "compound"
            : "all";
    const destinationTarget = destinationMap[destination] || destinationMap.all;
    const params = new URLSearchParams({
      country: destinationTarget.country,
      city: destinationTarget.city,
      area: destinationTarget.area,
      type: unitType,
      duration: unitType === "monthly" ? "monthly" : "any",
      range: privacy === "A+" ? "15" : "35",
      source: "home-filter",
    });
    go(`/explore-map?${params.toString()}`);
  };

  const toggleCompare = (index: number) => {
    if (!requireAccess()) return;
    setComparison((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : current.length < 3 ? current.concat(index) : current
    );
  };
  const snapshotProperty = visible.includes(properties[activeSnapshot]) ? properties[activeSnapshot] : visible[0];

  return (
    <main>
      <section className="hero" id="home">
        <picture>
          <img src={heroVillaImage} alt="Coastal luxury villa at golden hour" />
        </picture>
        <div className="hero-overlay" />
        <div className="hero-content reveal visible">
          <p className="eyebrow">{t("privateGlobalResidences")}</p>
          <h1>{settings.brandName}</h1>
          <div className="hero-actions">
            <button className="primary-link" type="button" onClick={() => onNavigate("residences")}>
              <Icon name="search" />{t("exploreResidences")}
            </button>
            <button className="ghost-link" type="button" onClick={() => onAdvisor({ source: "hero" })}>
              <Icon name="message" />{t("speakToAdvisor")}
            </button>
          </div>
        </div>
        <form className="search-panel reveal visible">
          <label>
            <span>{t("destination")}</span>
            <LuxurySelect
              value={destination}
              onChange={setDestination}
              options={[
                option("all", t("global")),
                option("riviera", t("frenchRiviera")),
                option("dubai", t("dubai")),
                option("maldives", t("maldives")),
                option("desert", t("desertReserve")),
              ]}
              tone="dark"
            />
          </label>
          <label>
            <span>{t("lifestyle")}</span>
            <LuxurySelect
              value={lifestyle}
              onChange={setLifestyle}
              options={lifestyleOptions}
              tone="dark"
            />
          </label>
          <label>
            <span>{t("privacy")}</span>
            <LuxurySelect
              value={privacy}
              onChange={setPrivacy}
              options={[option("all", t("anyGrade")), option("A+", t("privateGrade")), option("A", t("discreetGrade"))]}
              tone="dark"
            />
          </label>
          <button
            type="button"
            onClick={() => {
              if (!requireAccess()) return;
              setCurated(true);
            }}
          >
            <Icon name="spark" />{t("curate")}
          </button>
          <button type="button" onClick={openMapSearch}>
            <Icon name="map" />{t("openMapSearch")}
          </button>
        </form>
      </section>

      <section className="section intro-section" id="collections">
        <div className="section-heading reveal visible">
          <p className="eyebrow">{t("curatedByLife")}</p>
          <h2>{t("featuredCollections")}</h2>
        </div>
        <div className="collection-grid">
          {[t("waterfrontVillas"), t("skylinePenthouses"), t("investmentResidences")].map((title, index) => (
            <article className="collection-card reveal visible" key={title}>
              <span><Icon name={index === 0 ? "map" : index === 1 ? "building" : "wallet"} />0{index + 1}</span>
              <h3>{title}</h3>
            </article>
          ))}
        </div>
      </section>

      <section className="section home-hurghada-preview" aria-labelledby="home-hurghada-title">
        <div className="home-hurghada-lead">
          <p className="eyebrow">{t("whyHurghada")}</p>
          <h2 id="home-hurghada-title">{t("hurghadaHomeTitle")}</h2>
          <p>{t("hurghadaHomeCopy")}</p>
          <a href="#/about"><Icon name="compass" />{t("discoverHurghada")}</a>
        </div>
        <div className="home-hurghada-signals">
          {[
            ["12", t("yearRoundDemand"), t("yearRoundDemandCopy"), "calendar" as IconName],
            ["ROI", t("investorValue"), t("investorValueCopy"), "wallet" as IconName],
            ["365", t("coastalLifestyle"), t("coastalLifestyleCopy"), "spark" as IconName],
          ].map(([value, title, copy, icon]) => (
            <article key={String(title)}><span>{value}</span><Icon name={icon as IconName} /><h3>{title}</h3><p>{copy}</p></article>
          ))}
        </div>
      </section>

      <section className="catalog section" id="residences">
        {curated && (
          <div className="curation-status active">
            <div>
              <span>{t("curatedMatch")}</span>
              <strong>{visible.length} {t("residencesFound")}</strong>
            </div>
          </div>
        )}
        <div className="catalog-shell">
          <aside className="catalog-sidebar reveal visible">
            <p className="eyebrow">{t("advancedSearch")}</p>
            <h2>{t("residences")}</h2>
            <div className="filter-group">
              {["all", "Beachfront", "Penthouse", "Private Island", "Wellness", "Investment"].map((tag) => (
                <button
                  className={`filter-chip ${lifestyle === tag ? "active" : ""}`}
                  type="button"
                  key={tag}
                  onClick={() => setLifestyle(tag)}
                >
                  {tag === "all" ? t("all") : tagLabel(tag)}
                </button>
              ))}
            </div>
            <div className="mood-panel">
              <p>{t("iWant")}</p>
              <label><input type="checkbox" /> {t("absolutePrivacy")}</label>
              <label><input type="checkbox" /> {t("iconicViews")}</label>
              <label><input type="checkbox" /> {t("staffReadyLiving")}</label>
              <label><input type="checkbox" /> {t("cryptoSupport")}</label>
            </div>
          </aside>

          <div className="property-list">
            {visible.map((property) => {
              const index = properties.indexOf(property);
              return (
                <article className="property-card reveal visible" key={property.slug}>
                  <img src={property.image} alt={property.name} />
                  <div className="property-card-content">
                    <div>
                      <div className="property-meta">
                        <span><Icon name="map" />{property.location}</span>
                        <span><Icon name="shield" />{property.privacy} {t("privacyLower")}</span>
                      </div>
                      <h3>{property.name}</h3>
                      <p>{property.specs}</p>
                      <div className="property-tags">
                        {property.tags.map((tag) => <span key={tag}>{tagLabel(tag)}</span>)}
                      </div>
                    </div>
                    <div>
                      <p className="property-price">{formatPrice(property)}</p>
                      <div className="property-actions">
                        <button type="button" onClick={() => openDetail(property.slug)}><Icon name="eye" />{t("viewExplanation")}</button>
                        <button type="button" onClick={() => toggleCompare(index)}>
                          <Icon name="compare" />
                          {comparison.includes(index) ? t("inComparison") : t("compare")}
                        </button>
                        <button type="button" onClick={() => onAdvisor({ source: "property-card", property: property.name })}>
                          <Icon name="calendar" />{t("privateViewing")}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          <aside className="investment-snapshot-panel reveal visible">
            <header className="investment-snapshot-header">
              <div><span><Icon name="wallet" />{t("investmentSnapshot")}</span><small>{t("decisionBrief")}</small></div>
              <strong>{visible.length} {t("assets")}</strong>
            </header>
            {snapshotProperty ? (
              <>
                <div className="investment-snapshot-selector" aria-label={t("selectResidence")}>
                  {visible.slice(0, 4).map((property) => {
                    const index = properties.indexOf(property);
                    return <button className={property.slug === snapshotProperty.slug ? "active" : ""} type="button" key={property.slug} onClick={() => setActiveSnapshot(index)}>{property.name}</button>;
                  })}
                </div>
                <div className="investment-snapshot-visual">
                  <img src={snapshotProperty.image} alt={snapshotProperty.name} />
                  <div><span><Icon name="map" />{snapshotProperty.location}</span><h3>{snapshotProperty.name}</h3><p>{formatPrice(snapshotProperty)}</p></div>
                </div>
                <dl className="investment-snapshot-metrics">
                  <div><dt><Icon name="shield" />{t("privacy")}</dt><dd>{snapshotProperty.privacy}</dd></div>
                  <div><dt><Icon name="wallet" />{t("yield")}</dt><dd>{snapshotProperty.yield || "—"}</dd></div>
                  <div><dt><Icon name="calendar" />{t("occupancy")}</dt><dd>{snapshotProperty.occupancy || "—"}</dd></div>
                  <div><dt><Icon name="key" />{t("payment")}</dt><dd>{snapshotProperty.payment || "—"}</dd></div>
                </dl>
                <div className="investment-snapshot-actions">
                  <button type="button" onClick={() => toggleCompare(properties.indexOf(snapshotProperty))}><Icon name="compare" />{comparison.includes(properties.indexOf(snapshotProperty)) ? t("inComparison") : t("compare")}</button>
                  <button type="button" onClick={() => openDetail(snapshotProperty.slug)}><Icon name="eye" />{t("viewExplanation")}</button>
                  <button type="button" onClick={openMapSearch}><Icon name="map" />{t("openMapSearch")}</button>
                </div>
              </>
            ) : <p className="investment-snapshot-empty">{t("noMatchingResidences")}</p>}
          </aside>
        </div>
      </section>

      <section className="detail section" id="explanation">
        <div className="detail-media reveal visible">
          <img src={islandVillaImage} alt="Private island villa with yacht dock" />
          <button type="button" className="media-pill"><Icon name="image" />{t("illustratedDrawingsGuide")}</button>
        </div>
        <div className="detail-copy reveal visible">
          <p className="eyebrow">{t("illustratedExplanation")}</p>
          <h2>{t("seeUnitBeforeArrival")}</h2>
          <p className="narrative-text">{t("unitExplanationCopy")}</p>
          <div className="unit-explanation-links">
            {properties.map((property) => (
              <button className="unit-explanation-link" type="button" key={property.slug} onClick={() => openDetail(property.slug)}>
                <span>{property.location}</span>
                <strong>{property.name}</strong>
                <em><Icon name="external" />{t("openUnitExplanation")}</em>
              </button>
            ))}
          </div>
        </div>
      </section>

      <section className="concierge section" id="concierge">
        <div className="section-heading reveal visible">
          <p className="eyebrow">{t("vipConcierge")}</p>
          <h2>{t("privateAccessSteps")}</h2>
        </div>
        <form
          className="booking-card reveal visible"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!requireAccess()) return;
            if (!(await onConfirmRequest({ eyebrow: t("confirmRequest"), title: t("sendPrivateRequest"), description: t("confirmationCopy"), confirmLabel: t("sendRequest"), icon: "message" }))) return;
            const data = new FormData(event.currentTarget);
            try {
              await submitRentalRequest({
                source: "booking-panel",
                purpose: String(data.get("purpose")),
                preferredDate: String(data.get("preferredDate")),
                channel: String(data.get("channel")),
                preferences: String(data.get("preferences")),
              });
              setBookingMessage(t("conciergeSent"));
            } catch (error) {
              setBookingMessage(error instanceof Error ? error.message : t("conciergeError"));
            }
          }}
        >
          <label>
            {t("purpose")}
            <LuxurySelect
              name="purpose"
              defaultValue="Private viewing"
              options={[
                option("Private viewing", t("privateViewing")),
                option("Rental reservation", t("rentalReservation")),
                option("Unit explanation request", t("unitExplanationRequest")),
              ]}
              tone="dark"
            />
          </label>
          <label>{t("preferredDate")}<input name="preferredDate" type="date" /></label>
          <label>
            {t("channel")}
            <LuxurySelect
              name="channel"
              defaultValue="WhatsApp Business"
              options={[
                option("WhatsApp Business", t("whatsappBusiness")),
                option("Premium video call", t("premiumVideoCall")),
                option("Private email", t("privateEmail")),
              ]}
              tone="dark"
            />
          </label>
          <label className="wide">{t("preferences")}<textarea name="preferences" placeholder={t("preferencesPlaceholder")} /></label>
          <button type="submit"><Icon name="message" />{t("assignPrivateAdvisor")}</button>
          {bookingMessage && <p className="booking-message success"><span aria-hidden="true">✓</span>{bookingMessage}</p>}
        </form>
      </section>

    </main>
  );
}

function AdvisorDrawer({
  open,
  context,
  user,
  properties,
  onClose,
  onConfirmRequest,
}: {
  open: boolean;
  context: AdvisorContext;
  user: Profile | null;
  properties: Property[];
  onClose: () => void;
  onConfirmRequest: ConfirmAction;
}) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) setMessage("");
  }, [open, context]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setMessage("");

    if (!hasPrivateAccess(user)) {
      setMessage(t("advisorSignInRequired"));
      window.setTimeout(() => go("/auth"), 700);
      return;
    }

    const data = new FormData(form);
    const request: AdvisorRequest = {
      source: context.source || "advisor-drawer",
      name: String(data.get("name")),
      email: String(data.get("email")),
      phone: String(data.get("phone")),
      purpose: String(data.get("purpose")),
      desiredResidence: String(data.get("desiredResidence")),
      budgetRange: String(data.get("budgetRange")),
      privacyLevel: String(data.get("privacyLevel")),
      preferredDate: String(data.get("preferredDate")),
      channel: String(data.get("channel")),
      preferences: String(data.get("preferences")),
      request: String(data.get("request")),
    };

    if (!(await onConfirmRequest({ eyebrow: t("confirmRequest"), title: t("sendPrivateRequest"), description: t("confirmationCopy"), confirmLabel: t("sendRequest"), icon: "message" }))) return;

    try {
      setSubmitting(true);
      const result = await submitAdvisorRequest(request);
      setMessage(
        result.synced
          ? t("privateBriefSent")
          : t("privateBriefLocal")
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("advisorError"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <aside className={`concierge-drawer ${open ? "open" : ""}`} aria-hidden={!open}>
      <button className="drawer-scrim" type="button" aria-label={t("closeAdvisorForm")} onClick={onClose} />
      <section className="drawer-panel" role="dialog" aria-modal="true" aria-labelledby="advisor-title">
        <button className="close-button" type="button" aria-label={t("closeAdvisorForm")} onClick={onClose}>
          <Icon name="x" />
        </button>
        <p className="eyebrow">{t("privateAdvisor")}</p>
        <h2 id="advisor-title">{t("describeResidence")}</h2>
        <p className="advisor-note">{t("advisorNote")}</p>
        <form className="advisor-form" onSubmit={handleSubmit}>
          <div className="advisor-form-grid">
            <label>
              {t("name")}
              <input name="name" defaultValue={user?.name || ""} autoComplete="name" required />
            </label>
            <label>
              {t("email")}
              <input name="email" type="email" defaultValue={user?.email || ""} autoComplete="email" required />
            </label>
            <label>
              {t("privatePhone")}
              <input name="phone" type="tel" autoComplete="tel" placeholder="+971..." />
            </label>
            <label>
              {t("purpose")}
              <LuxurySelect
                name="purpose"
                defaultValue="Rental reservation"
                options={[
                  option("Rental reservation", t("rentalReservation")),
                  option("Private viewing", t("privateViewing")),
                  option("Buy or invest", t("buyOrInvest")),
                  option("List my property", t("listMyProperty")),
                ]}
              />
            </label>
            <label>
              {t("residence")}
              <LuxurySelect
                name="desiredResidence"
                defaultValue={context.property || "Advisor recommendation"}
                options={[option("Advisor recommendation", t("advisorRecommendation"))].concat(properties.map((property) => option(property.name)))}
              />
            </label>
            <label>
              {t("budgetRange")}
              <LuxurySelect
                name="budgetRange"
                defaultValue="Confidential"
                options={[option("Confidential", t("confidential")), option("Up to $1M"), option("$1M - $5M"), option("$5M - $15M"), option("$15M+")]}
              />
            </label>
            <label>
              {t("privacyLevel")}
              <LuxurySelect
                name="privacyLevel"
                defaultValue="Discreet"
                options={[
                  option("Discreet", t("discreet")),
                  option("High privacy", t("highPrivacy")),
                  option("Ultra private", t("ultraPrivate")),
                  option("Family office only", t("familyOfficeOnly")),
                ]}
              />
            </label>
            <label>
              {t("preferredDate")}
              <input name="preferredDate" type="date" />
            </label>
            <label>
              {t("contactChannel")}
              <LuxurySelect
                name="channel"
                defaultValue="Private email"
                options={[
                  option("Private email", t("privateEmail")),
                  option("WhatsApp Business", t("whatsappBusiness")),
                  option("Premium video call", t("premiumVideoCall")),
                ]}
              />
            </label>
          </div>
          <label>
            {t("describeUnitWanted")}
            <textarea
              name="request"
              placeholder={t("requestPlaceholder")}
              required
            />
          </label>
          <label>
            {t("additionalPreferences")}
            <textarea name="preferences" placeholder={t("additionalPreferencesPlaceholder")} />
          </label>
          <button type="submit" disabled={submitting}><Icon name="message" />{submitting ? t("sending") : t("sendPrivateBrief")}</button>
          {message && (
            <p className={`advisor-message ${message.startsWith("Private brief sent") ? "success" : "error"}`}>
              <span aria-hidden="true">{message.startsWith("Private brief sent") ? "✓" : "!"}</span>
              {message}
            </p>
          )}
        </form>
      </section>
    </aside>
  );
}

function DetailPage({ user, properties, id }: { user: Profile | null; properties: Property[]; id: string }) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!hasPrivateAccess(user)) go("/auth");
  }, [user]);
  const property = properties.find((item) => item.slug === id) || properties[0];
  if (!property) return null;
  const gallery = Array.from(new Set([property.image].concat(property.images || []))).filter(Boolean);
  const detailGallery = gallery.filter((image) => image !== property.image);
  return (
    <main className="page-shell narrative-page">
      <section className="narrative-hero" style={{ backgroundImage: `linear-gradient(90deg, rgba(7,7,7,.72), rgba(7,7,7,.18)), url("${property.image}")` }}>
        <p className="eyebrow">{property.location}</p>
        <h1>{property.name}</h1>
        <span className="hero-service-pill">{t("illustratedUnitExplanation")}</span>
      </section>
      <section className="detail section narrative-detail">
        <div className="detail-media reveal visible"><img src={property.image} alt={property.name} /></div>
        <div className="detail-copy reveal visible">
          <p className="eyebrow">{t("illustratedExplanation")}</p>
          <h1>{property.name}</h1>
          <p className="narrative-text">{property.explanation}</p>
          <dl className="spec-grid">
            <div><dt><Icon name="image" />{t("drawings")}</dt><dd>{t("included")}</dd></div>
            <div><dt><Icon name="layers" />{t("floorNotes")}</dt><dd>{property.rooms.length} {t("zones")}</dd></div>
            <div><dt><Icon name="shield" />{t("privacy")}</dt><dd>{property.security}</dd></div>
            <div><dt><Icon name="key" />{t("access")}</dt><dd>{t("private")}</dd></div>
          </dl>
          <div className="floor-plan">{property.rooms.map((room, index) => <div className={`plan-room ${index === 0 ? "large" : ""}`} key={room}>{room}</div>)}</div>
        </div>
      </section>
      {detailGallery.length > 0 && (
        <section className="section property-gallery-section">
          <div className="property-gallery-grid">
            {detailGallery.map((image, index) => (
              <figure className="property-gallery-item" key={image}>
                <img src={image} alt={`${property.name} gallery ${index + 1}`} />
              </figure>
            ))}
          </div>
        </section>
      )}
      <section className="section explanation-section">
        <div className="section-heading"><p className="eyebrow">{t("whatYouReceive")}</p><h2>{t("privateVisualClarity")}</h2></div>
        <div className="explanation-grid">{property.illustrationSet.map((item, index) => <article className="explanation-card reveal visible" key={item}><span><Icon name="spark" />0{index + 1}</span><h3>{item}</h3></article>)}</div>
      </section>
    </main>
  );
}

function ExploreMapPanel({
  rentals,
  activeId,
  onSelect,
  areaCenter,
  radiusKm,
  onAreaCenterChange,
  onRadiusChange,
  geographicArea,
  canSendRange,
  sendingRange,
  onSendRange,
}: {
  rentals: MapRental[];
  activeId: string;
  onSelect: (id: string) => void;
  areaCenter: MapAreaCenter;
  radiusKm: number;
  onAreaCenterChange: (center: MapAreaCenter) => void;
  onRadiusChange: (radiusKm: number) => void;
  geographicArea: GeographicArea;
  canSendRange: boolean;
  sendingRange: boolean;
  onSendRange: () => void;
}) {
  const { t } = useLanguage();
  const leafletNode = useRef<HTMLDivElement | null>(null);
  const leafletMapRef = useRef<L.Map | null>(null);
  const leafletMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const areaCircleRef = useRef<L.Circle | null>(null);
  const radiusHandleRef = useRef<L.Marker | null>(null);
  const radiusHandleDraggingRef = useRef(false);
  const areaCenterRef = useRef(areaCenter);
  const radiusChangeRef = useRef(onRadiusChange);
  areaCenterRef.current = areaCenter;
  radiusChangeRef.current = onRadiusChange;
  const activeRental = rentals.find((item) => item.id === activeId) || rentals[0];

  const leafletIcon = (rental: MapRental, selected: boolean) => L.divIcon({
    className: "explore-leaflet-marker-shell",
    html: `<span class="explore-leaflet-marker${selected ? " active" : ""}">${rental.category === "studio" ? "S" : rental.category === "compound" ? "C" : rental.category === "monthly" ? "M" : "A"}</span>`,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
  });

  useEffect(() => {
    if (!leafletNode.current || rentals.length === 0) return;
    const center: L.LatLngExpression = activeRental
      ? [activeRental.lat, activeRental.lng]
      : [27.2579, 33.8116];
    const map = L.map(leafletNode.current, {
      center,
      zoom: 13,
      zoomControl: true,
      scrollWheelZoom: true,
    });
    leafletMapRef.current = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);
    const bounds = L.latLngBounds([]);
    rentals.forEach((rental) => {
      const marker = L.marker([rental.lat, rental.lng], {
        title: rental.title,
        icon: leafletIcon(rental, rental.id === activeId),
      }).addTo(map);
      marker.on("click", () => onSelect(rental.id));
      marker.bindTooltip(rental.title, { direction: "top", offset: [0, -18] });
      leafletMarkersRef.current.set(rental.id, marker);
      bounds.extend([rental.lat, rental.lng]);
    });
    map.on("click", (event: L.LeafletMouseEvent) => {
      onAreaCenterChange({ lat: event.latlng.lat, lng: event.latlng.lng });
    });
    if (rentals.length > 1) map.fitBounds(bounds, { padding: [44, 44], maxZoom: 14 });
    const resizeTimer = window.setTimeout(() => map.invalidateSize(), 0);
    return () => {
      window.clearTimeout(resizeTimer);
      leafletMarkersRef.current.clear();
      areaCircleRef.current = null;
      radiusHandleRef.current = null;
      radiusHandleDraggingRef.current = false;
      leafletMapRef.current = null;
      map.remove();
    };
  }, [rentals, onSelect, onAreaCenterChange]);

  useEffect(() => {
    const map = leafletMapRef.current;
    if (!map) return;
    let shouldFitRange = !radiusHandleDraggingRef.current;
    if (!areaCircleRef.current) {
      areaCircleRef.current = L.circle([areaCenter.lat, areaCenter.lng], {
        radius: radiusKm * 1000,
        color: "#d4af37",
        weight: 2,
        opacity: 0.95,
        fillColor: "#d4af37",
        fillOpacity: 0.15,
        dashArray: "8 7",
        interactive: false,
      }).addTo(map);
      shouldFitRange = true;
    } else {
      areaCircleRef.current.setLatLng([areaCenter.lat, areaCenter.lng]);
      areaCircleRef.current.setRadius(radiusKm * 1000);
    }

    const longitudeDelta = radiusKm / (111.32 * Math.max(Math.cos((areaCenter.lat * Math.PI) / 180), 0.01));
    const handlePosition: L.LatLngExpression = [areaCenter.lat, areaCenter.lng + longitudeDelta];
    if (!radiusHandleRef.current) {
      radiusHandleRef.current = L.marker(handlePosition, {
        draggable: true,
        zIndexOffset: 900,
        title: t("searchRange"),
        icon: L.divIcon({
          className: "explore-radius-handle-shell",
          html: '<span class="explore-radius-handle"><span></span></span>',
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        }),
      }).addTo(map);
      radiusHandleRef.current.on("dragstart", () => {
        radiusHandleDraggingRef.current = true;
      });
      radiusHandleRef.current.on("drag", (event: L.LeafletEvent) => {
        const marker = event.target as L.Marker;
        const center = areaCenterRef.current;
        const nextRadius = map.distance([center.lat, center.lng], marker.getLatLng()) / 1000;
        radiusChangeRef.current(Math.min(60, Math.max(5, Math.round(nextRadius))));
      });
      radiusHandleRef.current.on("dragend", () => {
        radiusHandleDraggingRef.current = false;
      });
    } else if (!radiusHandleDraggingRef.current) {
      radiusHandleRef.current.setLatLng(handlePosition);
    }
    if (shouldFitRange && areaCircleRef.current) {
      map.fitBounds(areaCircleRef.current.getBounds(), { padding: [54, 54], maxZoom: 13, animate: true });
    }
  }, [areaCenter, radiusKm, t]);

  useEffect(() => {
    if (!leafletMapRef.current || !activeRental) return;
    leafletMarkersRef.current.forEach((marker, rentalId) => {
      const rental = rentals.find((item) => item.id === rentalId);
      if (rental) marker.setIcon(leafletIcon(rental, rentalId === activeId));
    });
    leafletMapRef.current.panTo([activeRental.lat, activeRental.lng], { animate: true, duration: 0.45 });
  }, [activeId, activeRental, rentals]);

  return (
    <section className="explore-map-panel">
      <div className="explore-panel-heading">
        <p className="eyebrow">{t("mapPanelTitle")}</p>
        <span><Icon name="shield" />{t("excludedCommercial")}</span>
      </div>
      <div className="visual-map-canvas osm-map-canvas" aria-label={t("mapPanelTitle")}>
        <div className="leaflet-map-surface" ref={leafletNode} />
        <div className="explore-area-guide">
          <strong>{t("chooseMapArea")}</strong>
          <span>{t("chooseMapAreaHint")}</span>
        </div>
        <div className="explore-area-coordinates">
          {t("selectedArea")}: {areaCenter.lat.toFixed(4)}, {areaCenter.lng.toFixed(4)} · {radiusKm} km
        </div>
        {activeRental && (
          <article className="explore-map-card">
            <img src={activeRental.image} alt={activeRental.title} />
            <strong>{activeRental.title}</strong>
            <p>{activeRental.summary}</p>
            <span>{activeRental.address}</span>
          </article>
        )}
      </div>
      <section className="explore-range-receipt" aria-live="polite">
        <div className="explore-range-receipt-copy">
          <span className="explore-range-status"><Icon name="check" />{t("selectedRangeReady")}</span>
          <strong>{t("selectedRangeCopy")}</strong>
        </div>
        <dl>
          <div><dt>{t("centerPoint")}</dt><dd>{geographicArea.centerLatitude.toFixed(4)}, {geographicArea.centerLongitude.toFixed(4)}</dd></div>
          <div><dt>{t("rangeRadius")}</dt><dd>{geographicArea.radiusKm} km</dd></div>
          <div><dt>{t("boundaryBox")}</dt><dd>N {geographicArea.bounds.north.toFixed(3)} · S {geographicArea.bounds.south.toFixed(3)} · E {geographicArea.bounds.east.toFixed(3)} · W {geographicArea.bounds.west.toFixed(3)}</dd></div>
        </dl>
        <button className="explore-range-send-button" type="button" onClick={onSendRange} disabled={sendingRange}>
          <Icon name={canSendRange ? "message" : "lock"} />
          <span>{canSendRange ? t("sendSelectedRange") : t("signInToSendRange")}</span>
          <Icon name="arrowRight" />
        </button>
      </section>
    </section>
  );
}

function ExploreMapPage({ user, routeQuery, onConfirmRequest }: { user: Profile | null; routeQuery: string; onConfirmRequest: ConfirmAction }) {
  const { t } = useLanguage();
  const initialParams = useMemo(() => new URLSearchParams(routeQuery), [routeQuery]);
  const initialCountry = initialParams.get("country") || "Egypt";
  const initialCity = initialParams.get("city") || "Hurghada";
  const initialArea = initialParams.get("area") || "";
  const initialCategory = (initialParams.get("type") || "all") as AccommodationType;
  const initialDuration = (initialParams.get("duration") || "any") as DurationType;
  const initialRange = Number(initialParams.get("range")) || 35;
  const initialLatitude = initialParams.get("lat");
  const initialLongitude = initialParams.get("lng");
  const initialRentals = useMemo(
    () => filterIndependentRentals(curatedHurghadaRentals, initialArea, initialCategory, initialDuration, initialRange, initialCountry, initialCity),
    [initialArea, initialCategory, initialDuration, initialRange, initialCountry, initialCity]
  );
  const [country, setCountry] = useState(initialCountry);
  const [city, setCity] = useState(initialCity);
  const [area, setArea] = useState(initialArea);
  const [category, setCategory] = useState<AccommodationType>(initialCategory);
  const [duration, setDuration] = useState<DurationType>(initialDuration);
  const [radiusKm, setRadiusKm] = useState(initialRange);
  const [rentals, setRentals] = useState<MapRental[]>(initialRentals);
  const [activeId, setActiveId] = useState(() => initialRentals[0]?.id || "");
  const [mapAreaCenter, setMapAreaCenter] = useState<MapAreaCenter>(() => {
    const latitude = initialLatitude === null ? Number.NaN : Number(initialLatitude);
    const longitude = initialLongitude === null ? Number.NaN : Number(initialLongitude);
    if (Number.isFinite(latitude) && Number.isFinite(longitude)) return { lat: latitude, lng: longitude };
    const firstRental = initialRentals[0];
    return firstRental ? { lat: firstRental.lat, lng: firstRental.lng } : { lat: 27.2579, lng: 33.8116 };
  });
  const [searched, setSearched] = useState(true);
  const [loading, setLoading] = useState(false);
  const [sendingRange, setSendingRange] = useState(false);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");

  const geographicArea = useMemo(() => {
    const latitudeDelta = radiusKm / 111.32;
    const longitudeDelta = radiusKm / (111.32 * Math.max(Math.cos((mapAreaCenter.lat * Math.PI) / 180), 0.01));
    return {
      centerLatitude: Number(mapAreaCenter.lat.toFixed(6)),
      centerLongitude: Number(mapAreaCenter.lng.toFixed(6)),
      radiusKm,
      bounds: {
        north: Number((mapAreaCenter.lat + latitudeDelta).toFixed(6)),
        south: Number((mapAreaCenter.lat - latitudeDelta).toFixed(6)),
        east: Number((mapAreaCenter.lng + longitudeDelta).toFixed(6)),
        west: Number((mapAreaCenter.lng - longitudeDelta).toFixed(6)),
      },
    };
  }, [mapAreaCenter, radiusKm]);

  async function executeSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const cleanCountry = country.trim() || "Egypt";
    const cleanCity = city.trim() || "Hurghada";
    const cleanArea = area.trim();
    setLoading(true);
    setMessageTone("info");
    setMessage(t("searchingMap"));
    const result = await getIndependentRentalResults(cleanCountry, cleanCity, cleanArea, category, duration, radiusKm);
    const nextRentals = result.rentals;
    setRentals(nextRentals);
    setActiveId(nextRentals[0]?.id || "");
    setSearched(true);
    try {
      const leadResult = await submitExploreLead({
        source: "explore-map",
        userId: user?.uid || "guest",
        userEmail: user?.email || "",
        searchedArea: `${cleanCountry} / ${cleanCity}${cleanArea ? ` / ${cleanArea}` : ""} / ${radiusKm}km / ${duration}`,
        accommodationType: `${category} / ${duration}`,
        resultCount: nextRentals.length,
        excludedCommercial: true,
        geographicArea,
      });
      setMessageTone(leadResult.synced ? "success" : "info");
      setMessage(result.usedFallback ? t("apiFallbackNotice") : leadResult.synced ? t("crmLeadLogged") : t("crmLeadFailed"));
    } catch (error) {
      setMessageTone("info");
      setMessage(result.usedFallback ? t("apiFallbackNotice") : t("crmLeadFailed"));
    } finally {
      setLoading(false);
    }
  }

  async function requestDeal(rental: MapRental) {
    if (!(await onConfirmRequest({ eyebrow: t("confirmRequest"), title: rental.title, description: t("confirmationCopy"), confirmLabel: t("sendRequest"), icon: "message" }))) return;
    try {
      await submitRentalRequest({
        source: "explore-map-deal",
        name: user?.name || "",
        email: user?.email || "",
        purpose: "Make a deal for selected independent rental",
        desiredResidence: rental.title,
        request: `${rental.title} / ${rental.address} / ${rental.category} / ${rental.priceLabel}`,
        preferences: `Area: ${rental.area}. Bedrooms: ${rental.bedrooms}. Commercial hotels/resorts excluded.`,
      });
      setMessageTone("success");
      setMessage(t("dealRequestSent"));
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? `${t("dealRequestFailed")} ${error.message}` : t("dealRequestFailed"));
    }
  }

  async function sendSearchRequest() {
    if (!user) {
      const params = new URLSearchParams({
        country,
        city,
        area,
        type: category,
        duration,
        range: String(radiusKm),
        lat: String(geographicArea.centerLatitude),
        lng: String(geographicArea.centerLongitude),
      });
      sessionStorage.setItem("auraAuthReturn", `/explore-map?${params.toString()}`);
      go("/auth");
      return;
    }
    if (!(await onConfirmRequest({ eyebrow: t("confirmRequest"), title: `${country} · ${city} · ${radiusKm} km`, description: t("selectedRangeCopy"), confirmLabel: t("sendSelectedRange"), icon: "map" }))) return;
    setSendingRange(true);
    try {
      const result = await submitRentalRequest({
        source: "explore-map-filter-search",
        name: user?.name || "",
        email: user?.email || "",
        purpose: "Search request from interactive map filters",
        desiredResidence: `${country} / ${city}${area ? ` / ${area}` : ""}`,
        request: `Country: ${country}. City: ${city}. Area: ${area || "Any"}. Selected map center: ${geographicArea.centerLatitude}, ${geographicArea.centerLongitude}. Radius: ${geographicArea.radiusKm}km. Bounds: N ${geographicArea.bounds.north}, S ${geographicArea.bounds.south}, E ${geographicArea.bounds.east}, W ${geographicArea.bounds.west}. Unit type: ${category}. Duration: ${duration}.`,
        preferences: "Client selected this geographical living area directly on the interactive map. Independent residential/touristic units only; hotels and resorts excluded.",
        geographicArea,
      });
      if (!result.synced) throw new Error("The request could not reach the advisory inbox. Please try again.");
      setMessageTone("success");
      setMessage(t("searchRequestSent"));
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? `${t("searchRequestFailed")} ${error.message}` : t("searchRequestFailed"));
    } finally {
      setSendingRange(false);
    }
  }

  return (
    <main className="explore-map-page has-results">
      <section className="explore-search-hero">
        <p className="eyebrow">{t("independentOnly")}</p>
        <h1>{t("mapSearchHeadline")}</h1>
        <p>{t("mapSearchCopy")}</p>
        <form className="explore-search-form" onSubmit={executeSearch}>
          <label>
            <span>{t("country")}</span>
            <input name="country" value={country} onChange={(event) => setCountry(event.target.value)} placeholder={t("countryPlaceholder")} />
          </label>
          <label>
            <span>{t("city")}</span>
            <input name="city" value={city} onChange={(event) => setCity(event.target.value)} placeholder={t("cityPlaceholder")} />
          </label>
          <label>
            <span>{t("areaNeighborhood")}</span>
            <input
              name="area"
              value={area}
              onChange={(event) => setArea(event.target.value)}
              list="hurghada-areas"
              placeholder={t("searchAreaPlaceholder")}
            />
            <datalist id="hurghada-areas">
              {hurghadaAreas.map((item) => <option value={item} key={item} />)}
            </datalist>
          </label>
          <label>
            <span>{t("accommodationType")}</span>
            <select value={category} onChange={(event) => setCategory(event.target.value as AccommodationType)}>
              {accommodationOptions.map((optionItem) => (
                <option value={optionItem.value} key={optionItem.value}>{t(optionItem.labelKey)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("duration")}</span>
            <select value={duration} onChange={(event) => setDuration(event.target.value as DurationType)}>
              {durationOptions.map((optionItem) => (
                <option value={optionItem.value} key={optionItem.value}>{t(optionItem.labelKey)}</option>
              ))}
            </select>
          </label>
          <label>
            <span>{t("searchRange")}: {radiusKm} km</span>
            <input className="range-input" type="range" min="5" max="60" step="5" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} />
          </label>
          <div className="explore-form-actions">
            <button className="explore-search-button" type="submit" disabled={loading}>
              <span className="explore-action-icon"><Icon name="search" /></span>
              <span className="explore-action-copy"><strong>{loading ? t("searchingMap") : t("searchMap")}</strong><small>{t("searchMapDetail")}</small></span>
              <Icon name="arrowRight" />
            </button>
          </div>
        </form>
        <p className={`auth-message ${message ? messageTone : ""}`}>{message}</p>
      </section>

      {searched && (
        <section className="explore-results-shell">
          <aside className="explore-list-panel">
            <div className="explore-panel-heading">
              <p className="eyebrow">{t("sidePanelTitle")}</p>
              <strong>{rentals.length}</strong>
            </div>
            {rentals.length === 0 && <p className="explore-empty">{t("noMapResults")}</p>}
            {rentals.map((rental) => (
              <article className={`explore-property-card ${rental.id === activeId ? "active" : ""}`} key={rental.id}>
                <button className="explore-property-main" type="button" onClick={() => setActiveId(rental.id)}>
                  <img src={rental.image} alt={rental.title} />
                  <span>{t(rental.category === "studio" ? "studios" : rental.category === "monthly" ? "monthlyRentals" : rental.category === "compound" ? "compounds" : "apartments")}</span>
                  <strong>{rental.title}</strong>
                  <p>{rental.summary}</p>
                  <em>{t("exactAddress")}: {rental.address}</em>
                  <small>{rental.bedrooms} BR / {rental.priceLabel}</small>
                </button>
                <button className="explore-deal-button" type="button" onClick={() => requestDeal(rental)}><Icon name="check" />{t("interestedDeal")}</button>
              </article>
            ))}
          </aside>
          <ExploreMapPanel
            rentals={rentals}
            activeId={activeId}
            onSelect={setActiveId}
            areaCenter={mapAreaCenter}
            radiusKm={radiusKm}
            onAreaCenterChange={setMapAreaCenter}
            onRadiusChange={setRadiusKm}
            geographicArea={geographicArea}
            canSendRange={Boolean(user)}
            sendingRange={sendingRange}
            onSendRange={sendSearchRequest}
          />
        </section>
      )}
    </main>
  );
}

function AuthPage({ onUser }: { onUser: (user: Profile | null) => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [resendState, setResendState] = useState<"idle" | "sending" | "sent">("idle");
  const settleConfirmation = () => new Promise((resolve) => window.setTimeout(resolve, 450));

  async function handleSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    setAuthSubmitting(true);
    setMessageTone("info");
    setMessage(t("signingIn"));
    try {
      const result = await signIn(String(data.get("login")), String(data.get("password")));
      onUser(await waitForAuth());
      if (result.role === "verify") {
        setVerificationEmail(result.email);
        setMode("verify");
        setMessageTone("info");
        setMessage(t("verificationPending"));
        return;
      }
      setMessageTone("success");
      setMessage(t("signedIn"));
      await settleConfirmation();
      const returnTo = sessionStorage.getItem("auraAuthReturn");
      if (returnTo) sessionStorage.removeItem("auraAuthReturn");
      go(result.role === "admin" ? "/admin" : returnTo || "/profile");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : t("signInFailed"));
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = String(data.get("password"));
    const confirmPassword = String(data.get("confirmPassword"));
    if (password !== confirmPassword) {
      setMessageTone("error");
      setMessage(t("passwordsDoNotMatch"));
      return;
    }
    setAuthSubmitting(true);
    setMessageTone("info");
    setMessage(t("creatingAccount"));
    try {
      const result = await signUp({
        name: String(data.get("name")),
        email: String(data.get("email")),
        password,
        intent: String(data.get("intent")),
      });
      setVerificationEmail(result.email);
      setMode("verify");
      setMessageTone(result.verificationSent ? "success" : "error");
      setMessage(result.verificationSent ? t("accountCreated") : `${t("verificationSendFailed")} ${result.verificationError}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : t("createAccountError");
      setMessageTone("error");
      if (message.includes("already exists") || message.includes("email-already-in-use")) {
        setVerificationEmail(String(data.get("email")));
        setMode("signin");
        setMessage(t("existingAccountVerify"));
        return;
      }
      setMessage(message);
    } finally {
      setAuthSubmitting(false);
    }
  }

  async function handleResendVerification() {
    setResendState("sending");
    setMessageTone("info");
    setMessage(t("sending"));
    try {
      const email = await sendCurrentUserVerificationEmail();
      setVerificationEmail(email || verificationEmail);
      setMessageTone("success");
      setMessage(t("verificationResent"));
      setResendState("sent");
    } catch (error) {
      setMessageTone("error");
      setMessage(error instanceof Error ? error.message : t("verificationResendFailed"));
      setResendState("idle");
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">{t("privateAccess")}</p>
        <h1>{t("signupHeadline")}</h1>
        {mode === "signin" && (
          <form className="auth-form active" onSubmit={handleSignIn}>
            <label>{t("usernameOrEmail")}<input name="login" autoComplete="username" /></label>
            <label>{t("password")}<span className="password-field"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete="current-password" /><button className="password-toggle" type="button" aria-label={passwordVisible ? t("hidePassword") : t("showPassword")} title={passwordVisible ? t("hidePassword") : t("showPassword")} onClick={() => setPasswordVisible((visible) => !visible)}><Icon name={passwordVisible ? "x" : "eye"} /></button></span></label>
            <button className="auth-primary-button" type="submit" disabled={authSubmitting}><Icon name="lock" />{authSubmitting ? t("signingIn") : t("enterPrivatePortal")}</button>
            <button className="auth-switch-link" type="button" onClick={() => setMode("signup")}><Icon name="user" />{t("dontHaveAccount")}</button>
          </form>
        )}
        {mode === "signup" && (
          <form className="auth-form active" onSubmit={handleSignUp}>
            <label>{t("fullName")}<input name="name" /></label>
            <label>{t("email")}<input name="email" type="email" /></label>
            <label>{t("password")}<span className="password-field"><input name="password" type={passwordVisible ? "text" : "password"} autoComplete="new-password" minLength={6} required /><button className="password-toggle" type="button" aria-label={passwordVisible ? t("hidePassword") : t("showPassword")} title={passwordVisible ? t("hidePassword") : t("showPassword")} onClick={() => setPasswordVisible((visible) => !visible)}><Icon name={passwordVisible ? "x" : "eye"} /></button></span></label>
            <label>{t("confirmPassword")}<input name="confirmPassword" type="password" autoComplete="new-password" minLength={6} required /></label>
            <label>{t("intent")}<select name="intent"><option value="Buy">{t("buy")}</option><option value="Rent">{t("rent")}</option><option value="Invest">{t("invest")}</option><option value="List a property">{t("listAProperty")}</option></select></label>
            <button className="auth-primary-button" type="submit" disabled={authSubmitting}><Icon name="user" />{authSubmitting ? t("creatingAccount") : t("createPrivateAccount")}</button>
            <button className="auth-switch-link" type="button" onClick={() => setMode("signin")}><Icon name="lock" />{t("alreadyHaveAccount")}</button>
          </form>
        )}
        {mode === "verify" && (
          <section className="auth-form active verification-panel">
            <p className="eyebrow">{t("verifyAccount")}</p>
            <h2>{t("confirmAccess")}</h2>
            <p>{t("verificationCopy")} {verificationEmail}. {t("verifyThenSignIn")}</p>
            <button className={`auth-primary-button ${resendState === "sent" ? "is-confirmed" : ""}`} type="button" onClick={handleResendVerification} disabled={resendState === "sending"}>
              <Icon name={resendState === "sent" ? "check" : "refresh"} />{resendState === "sending" ? t("sending") : resendState === "sent" ? t("verificationSentShort") : t("resendVerification")}
            </button>
            <button className="auth-secondary-button" type="button" onClick={() => setMode("signin")}><Icon name="lock" />{t("signIn")}</button>
          </section>
        )}
        <p className={`auth-message ${message ? messageTone : ""}`}>{message}</p>
      </section>
    </main>
  );
}

function ProfilePage({ user, onUser, onConfirmRequest }: { user: Profile | null; onUser: (user: Profile | null) => void; onConfirmRequest: ConfirmAction }) {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [selectedImageName, setSelectedImageName] = useState("");
  const [selectedProfileImage, setSelectedProfileImage] = useState<File | null>(null);
  const [profileImagePreview, setProfileImagePreview] = useState(user?.photoURL || "");
  const profileImageInputRef = useRef<HTMLInputElement>(null);
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  useEffect(() => {
    if (!user) go("/auth");
  }, [user]);
  useEffect(() => {
    if (!selectedProfileImage) {
      setProfileImagePreview(user?.photoURL || "");
      return;
    }
    const previewUrl = URL.createObjectURL(selectedProfileImage);
    setProfileImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [selectedProfileImage, user?.photoURL]);
  if (!user) return null;
  return (
    <main className="profile-shell">
      <section className="profile-card">
        <div className="profile-hero-row">
          <div className="profile-avatar large" style={profileImagePreview ? { backgroundImage: `url("${profileImagePreview}")` } : undefined}>{profileImagePreview ? "" : initials(user.name || user.email)}</div>
          <div className="profile-heading">
            <p className="eyebrow">{t("privateProfile")}</p>
            <h1>{user.name || user.email}</h1>
            <p className={`profile-status ${user.emailVerified ? "verified" : "pending"}`}>{user.emailVerified ? t("verifiedAccount") : t("verificationPending")}</p>
          </div>
        </div>
        <div className="profile-summary">
          <div><span>{t("email")}</span><strong>{user.email}</strong></div>
          <div><span>{t("intent")}</span><strong>{user.intent || t("rent")}</strong></div>
        </div>
        <form className="profile-form" onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          if (!(await onConfirmRequest({
            eyebrow: t("confirmAction"),
            title: t("saveProfile"),
            description: t("saveProfileConfirmation"),
            confirmLabel: t("confirmProfileSave"),
            tone: "save",
            icon: "save",
          }))) return;
          setSaving(true);
          setMessageTone("info");
          setMessage(t("savingProfile"));
          try {
            let photoURL = user.photoURL || "";
            if (selectedProfileImage) {
              setMessage(t("uploadingProfileImage"));
              photoURL = await uploadProfileImage(selectedProfileImage);
            }
            const updatedProfile = await updateProfileData({ name: String(data.get("name")), intent: String(data.get("intent")), photoURL });
            onUser(updatedProfile);
            setSelectedProfileImage(null);
            setSelectedImageName("");
            setProfileImagePreview(photoURL);
            if (profileImageInputRef.current) profileImageInputRef.current.value = "";
            setMessageTone("success");
            setMessage(t("profileSaved"));
          } catch (error) {
            setMessageTone("error");
            setMessage(error instanceof Error ? error.message : t("profileSaveFailed"));
          } finally {
            setSaving(false);
          }
        }}>
          <label>{t("name")}<input name="name" defaultValue={user.name} /></label>
          <label>{t("email")}<input disabled defaultValue={user.email} /></label>
          <label className="profile-upload-field">{t("profileImageUpload")}<span className={`profile-file-control ${selectedProfileImage ? "has-selection" : ""}`}><Icon name={selectedProfileImage ? "check" : "upload"} /><strong>{selectedImageName || t("changeProfileImage")}</strong><small>{selectedProfileImage ? t("profileImageSelected") : t("profileImageHelp")}</small><input ref={profileImageInputRef} name="profileImage" type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => {
            const file = event.currentTarget.files?.[0] || null;
            if (file && (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024)) {
              setMessageTone("error");
              setMessage(file.size > 5 * 1024 * 1024 ? "Profile images must be smaller than 5 MB." : "Choose a valid image file.");
              event.currentTarget.value = "";
              return;
            }
            setSelectedProfileImage(file);
            setSelectedImageName(file?.name || "");
            setMessage("");
          }} /></span></label>
          <label>{t("intent")}<select name="intent" defaultValue={user.intent || "Rent"}><option value="Buy">{t("buy")}</option><option value="Rent">{t("rent")}</option><option value="Invest">{t("invest")}</option><option value="List a property">{t("listAProperty")}</option></select></label>
          <div className="profile-actions">
            <button className="profile-save-button" type="submit" disabled={saving}><Icon name="save" />{saving ? t("savingProfile") : t("saveProfile")}</button>
            <button className="profile-logout-button icon-only" type="button" aria-label={t("logOut")} title={t("logOut")} onClick={async () => {
              if (!(await onConfirmRequest({
                eyebrow: t("confirmAction"),
                title: t("logOut"),
                description: t("logOutConfirmation"),
                confirmLabel: t("confirmLogOut"),
                icon: "arrowLeft",
              }))) return;
              await logout();
              onUser(null);
              go("/auth");
            }}><Icon name="arrowLeft" /></button>
          </div>
          <p className={`auth-message ${message ? messageTone : ""}`}>{message}</p>
        </form>
      </section>
    </main>
  );
}

function AboutPage({ id, onAdvisor }: { id: string; onAdvisor: (context?: AdvisorContext) => void }) {
  const { language } = useLanguage();
  useEffect(() => {
    if (id !== "contact") return;
    window.setTimeout(() => {
      document.getElementById("contact-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [id]);

  const content = {
    en: {
      eyebrow: "Why Hurghada?", title: "The Ultimate Destination for Real Estate Investment & Coastal Living",
      introLabel: "The Red Sea's Premier Property Hotspot", introTitle: "A global sanctuary, built around the sea.",
      intro: ["Stretching across 40 kilometers of pristine coastline, Hurghada has evolved from a serene resort town into a booming cosmopolitan city and a powerhouse for property investment.", "Offering 365 days of sunshine, crystal-clear waters, and world-class infrastructure, Hurghada is no longer just a holiday destination—it is a global sanctuary for expats, retirees, digital nomads, and high-yield real estate investors."],
      bridge: "Whether you are seeking a sun-drenched second home, a permanent relocation asset, or a high-performance rental property, here is why buying in Hurghada is the smartest move you can make today.",
      stats: [["40 KM", "Pristine coastline"], ["365", "Days of sunshine"], ["12 MONTHS", "Active rental demand"], ["GLOBAL", "Airport connectivity"]],
      sections: [
        { number: "01", label: "High-Yield Investment", title: "Exceptional ROI & Rental Demand", intro: "Backed by year-round tourism and a growing international expat community, Hurghada offers financial dynamics that outperform traditional Mediterranean markets.", points: [["Continuous Rental Revenue", "Unlike seasonal European resorts, Hurghada welcomes active tourism all year—supporting high occupancy and premium returns for short-term and monthly rentals."], ["Rapid Capital Appreciation", "Property values in master-planned beachfront communities and gated compounds continue to grow, building meaningful equity for early buyers."], ["Massive Currency Advantage", "Buying in USD, EUR, or GBP against local development costs gives international investors exceptional purchasing power and attractive price-per-square-meter value."]] },
        { number: "02", label: "Tax & Legal Advantages", title: "A Secure Buyer's Market", intro: "Egypt's modern investment framework supports foreign ownership with a transaction path designed to be clear, secure, and financially advantageous.", points: [["Zero Capital Gains Tax", "When you resell your property, foreign buyers can retain the full upside of their investment without a capital gains tax on the resale profit."], ["Minimal Holding Costs", "Annual property taxes remain exceptionally low compared with Europe and the Gulf, helping maximize net passive income."], ["Straightforward Foreign Ownership", "Foreign nationals can register qualifying properties in their own names with clear, legally binding title documentation that protects the asset."]] },
        { number: "03", label: "Premium Lifestyle & Low Cost of Living", title: "The Expat Haven", intro: "Hurghada blends the ease of a coastal riviera with the affordability and practicality required for permanent living and long-term relocation.", points: [["Unbeatable Cost of Living", "Fine dining, private beach clubs, and premium services remain accessible at a fraction of comparable European or Mediterranean costs."], ["Advanced Infrastructure & Healthcare", "International schools, European-standard private hospitals, shopping hubs, and secure gated communities support daily life."], ["Global Connectivity", "Hurghada International Airport provides direct, year-round access to major European and Middle Eastern capitals."], ["Perfect Microclimate", "Warm winters and low-humidity summers encourage a healthy outdoor lifestyle centered around the Red Sea."]] },
      ],
      closingLabel: "Find Your Perfect Hurghada Property", closingTitle: "Your Red Sea address starts here.", closing: "From high-end studios for digital nomads to grand beachfront villas in exclusive gated compounds, our local expertise and international standards help you secure the exact asset for your goals.", explore: "Explore Hurghada Properties", advisor: "Speak to a Local Advisor",
    },
    de: {
      eyebrow: "Warum Hurghada?", title: "Das ultimative Ziel für Immobilieninvestitionen und Leben am Meer",
      introLabel: "Der führende Immobilienstandort am Roten Meer", introTitle: "Ein globaler Rückzugsort, geschaffen rund um das Meer.",
      intro: ["Entlang von 40 Kilometern unberührter Küste hat sich Hurghada von einem ruhigen Ferienort zu einer kosmopolitischen Stadt und einem Zentrum für Immobilieninvestitionen entwickelt.", "Mit 365 Sonnentagen, kristallklarem Wasser und erstklassiger Infrastruktur ist Hurghada heute ein globaler Rückzugsort für Expats, Ruheständler, digitale Nomaden und renditeorientierte Investoren."],
      bridge: "Ob sonniger Zweitwohnsitz, dauerhafte Relokationsimmobilie oder leistungsstarkes Mietobjekt—hier erfahren Sie, warum ein Kauf in Hurghada heute eine kluge Entscheidung ist.",
      stats: [["40 KM", "Unberührte Küste"], ["365", "Sonnentage"], ["12 MONATE", "Aktive Mietnachfrage"], ["GLOBAL", "Flugverbindungen"]],
      sections: [
        { number: "01", label: "Renditestarke Investition", title: "Außergewöhnliche Rendite und Mietnachfrage", intro: "Ganzjähriger Tourismus und eine wachsende internationale Expat-Community schaffen eine Dynamik, die traditionelle Mittelmeermärkte übertrifft.", points: [["Kontinuierliche Mieteinnahmen", "Hurghada bleibt zwölf Monate aktiv und ermöglicht hohe Auslastung sowie attraktive Erträge bei Kurzzeit- und Monatsmieten."], ["Schnelle Wertsteigerung", "Immobilien in geplanten Strandgemeinden und gesicherten Anlagen verzeichnen robustes Wachstum und bauen frühzeitig Eigenkapital auf."], ["Starker Währungsvorteil", "USD, EUR und GBP bieten gegenüber lokalen Entwicklungskosten hohe Kaufkraft und attraktive Quadratmeterpreise."]] },
        { number: "02", label: "Steuerliche und rechtliche Vorteile", title: "Ein sicherer Käufermarkt", intro: "Ägyptens moderner Investitionsrahmen unterstützt ausländisches Eigentum mit einem klaren, sicheren und finanziell attraktiven Transaktionsweg.", points: [["Keine Kapitalertragsteuer", "Beim späteren Wiederverkauf können ausländische Käufer den Wertzuwachs ohne Kapitalertragsteuer auf den Wiederverkaufsgewinn behalten."], ["Geringe laufende Kosten", "Die jährlichen Immobiliensteuern sind im Vergleich zu Europa und der Golfregion außergewöhnlich niedrig."], ["Klare Eigentumsstruktur", "Ausländische Staatsangehörige können geeignete Immobilien im eigenen Namen mit rechtlich bindender Eigentumsdokumentation registrieren."]] },
        { number: "03", label: "Premium-Lifestyle und niedrige Lebenshaltungskosten", title: "Der ideale Ort für Expats", intro: "Hurghada verbindet die Leichtigkeit einer Küstenriviera mit der Bezahlbarkeit und Alltagstauglichkeit für dauerhaftes Wohnen.", points: [["Überzeugende Lebenshaltungskosten", "Gastronomie, private Beachclubs und Premiumservices bleiben zu einem Bruchteil vergleichbarer europäischer Kosten erreichbar."], ["Moderne Infrastruktur und Medizin", "Internationale Schulen, Privatkliniken auf europäischem Niveau, Einkaufszentren und gesicherte Wohnanlagen unterstützen den Alltag."], ["Globale Anbindung", "Der internationale Flughafen Hurghada bietet ganzjährige Direktverbindungen zu europäischen und nahöstlichen Metropolen."], ["Perfektes Mikroklima", "Warme Winter und trockene Sommer fördern einen gesunden, aktiven Lebensstil am Roten Meer."]] },
      ],
      closingLabel: "Finden Sie Ihre perfekte Immobilie in Hurghada", closingTitle: "Ihre Adresse am Roten Meer beginnt hier.", closing: "Vom hochwertigen Studio für digitale Nomaden bis zur großzügigen Strandvilla im exklusiven Compound verbinden wir lokale Expertise mit internationalen Standards.", explore: "Immobilien in Hurghada entdecken", advisor: "Mit lokalem Berater sprechen",
    },
    it: {
      eyebrow: "Perché Hurghada?", title: "La destinazione ideale per investimenti immobiliari e vita sulla costa",
      introLabel: "Il polo immobiliare più importante del Mar Rosso", introTitle: "Un rifugio globale costruito intorno al mare.",
      intro: ["Lungo 40 chilometri di costa incontaminata, Hurghada si è trasformata da tranquilla località turistica in una città cosmopolita e in un centro di investimento immobiliare.", "Con 365 giorni di sole, acque cristalline e infrastrutture di livello internazionale, Hurghada è un rifugio globale per expat, pensionati, nomadi digitali e investitori ad alto rendimento."],
      bridge: "Che tu stia cercando una seconda casa al sole, una proprietà per il trasferimento permanente o un immobile da reddito, ecco perché acquistare a Hurghada è una scelta intelligente.",
      stats: [["40 KM", "Costa incontaminata"], ["365", "Giorni di sole"], ["12 MESI", "Domanda locativa attiva"], ["GLOBALE", "Collegamenti aerei"]],
      sections: [
        { number: "01", label: "Investimento ad alto rendimento", title: "ROI eccezionale e domanda locativa", intro: "Turismo tutto l'anno e una comunità internazionale in crescita creano dinamiche superiori ai tradizionali mercati mediterranei.", points: [["Ricavi locativi continui", "Hurghada accoglie turismo per dodici mesi, sostenendo alta occupazione e rendimenti premium negli affitti brevi e mensili."], ["Rapida rivalutazione", "Le proprietà nelle comunità pianificate sul mare e nei compound recintati continuano a crescere di valore."], ["Forte vantaggio valutario", "USD, EUR e GBP offrono agli investitori internazionali grande potere d'acquisto e prezzi al metro quadro competitivi."]] },
        { number: "02", label: "Vantaggi fiscali e legali", title: "Un mercato sicuro per l'acquirente", intro: "Il quadro moderno degli investimenti in Egitto supporta la proprietà straniera con un percorso chiaro, sicuro e finanziariamente favorevole.", points: [["Nessuna imposta sulle plusvalenze", "Alla rivendita, gli acquirenti stranieri possono conservare l'intero apprezzamento senza imposta sulla plusvalenza immobiliare."], ["Costi di mantenimento minimi", "Le imposte immobiliari annuali sono molto basse rispetto all'Europa e al Golfo, massimizzando il reddito netto."], ["Proprietà straniera lineare", "I cittadini stranieri possono registrare immobili idonei a proprio nome con documentazione legale chiara e vincolante."]] },
        { number: "03", label: "Lifestyle premium e costo della vita contenuto", title: "Il rifugio degli expat", intro: "Hurghada unisce il fascino di una riviera alla convenienza e alla praticità necessarie per vivere stabilmente.", points: [["Costo della vita imbattibile", "Ristorazione, beach club privati e servizi premium restano accessibili a una frazione dei costi europei."], ["Infrastrutture e sanità avanzate", "Scuole internazionali, ospedali privati di standard europeo, centri commerciali e comunità protette supportano la vita quotidiana."], ["Connettività globale", "L'aeroporto internazionale offre voli diretti tutto l'anno verso le principali capitali europee e mediorientali."], ["Microclima perfetto", "Inverni caldi ed estati a bassa umidità favoriscono uno stile di vita sano e all'aperto sul Mar Rosso."]] },
      ],
      closingLabel: "Trova la tua proprietà perfetta a Hurghada", closingTitle: "Il tuo indirizzo sul Mar Rosso inizia qui.", closing: "Dagli studi di fascia alta per nomadi digitali alle grandi ville fronte mare in compound esclusivi, uniamo esperienza locale e standard internazionali.", explore: "Esplora le proprietà a Hurghada", advisor: "Parla con un consulente locale",
    },
  }[language];

  return (
    <main className="page-shell about-page">
      <section className="about-destination-hero">
        <div className="about-destination-hero-copy">
          <p className="eyebrow">{content.eyebrow}</p>
          <h1>{content.title}</h1>
          <a className="about-scroll-cue" href="#hurghada-story"><Icon name="compass" />{content.introLabel}</a>
        </div>
      </section>

      <section className="section about-destination-intro" id="hurghada-story">
        <header>
          <p className="eyebrow">{content.introLabel}</p>
          <h2>{content.introTitle}</h2>
        </header>
        <div className="about-destination-copy">
          {content.intro.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          <strong>{content.bridge}</strong>
        </div>
      </section>

      <section className="about-proof-strip" aria-label={content.introLabel}>
        {content.stats.map(([value, label]) => <div key={label}><strong>{value}</strong><span>{label}</span></div>)}
      </section>

      <div className="about-investment-story">
        {content.sections.map((section, index) => (
          <section className={`section about-investment-section tone-${index + 1}`} key={section.number}>
            <header className="about-investment-heading">
              <span>{section.number}</span>
              <div><p className="eyebrow">{section.label}</p><h2>{section.title}</h2><p>{section.intro}</p></div>
            </header>
            <div className="about-benefit-grid">
              {section.points.map(([title, description], pointIndex) => (
                <article className="about-benefit-card" key={title}>
                  <span>0{pointIndex + 1}</span><Icon name={index === 0 ? "wallet" : index === 1 ? "shield" : "spark"} />
                  <h3>{title}</h3><p>{description}</p>
                </article>
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="section about-property-cta" id="contact-info">
        <div><p className="eyebrow">{content.closingLabel}</p><h2>{content.closingTitle}</h2><p>{content.closing}</p></div>
        <div className="about-property-actions">
          <button type="button" onClick={() => go("/explore-map")}><Icon name="map" />{content.explore}</button>
          <button type="button" onClick={() => onAdvisor({ source: "hurghada-destination" })}><Icon name="message" />{content.advisor}</button>
        </div>
      </section>
    </main>
  );
}

function AdminPage({
  user,
  properties,
  setProperties,
  settings,
  setSettings,
  onConfirmRequest,
}: {
  user: Profile;
  properties: Property[];
  setProperties: (properties: Property[]) => void;
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  onConfirmRequest: ConfirmAction;
}) {
  const { t } = useLanguage();
  const [settingsMessage, setSettingsMessage] = useState("");
  const [requests, setRequests] = useState<ManagedRequest[]>([]);
  const [inboxMessage, setInboxMessage] = useState("");
  const [section, setSection] = useState<"overview" | "listings" | "inbox" | "settings">("overview");
  const [listingSearch, setListingSearch] = useState("");
  const [listingMessage, setListingMessage] = useState("");
  const [deletingSlug, setDeletingSlug] = useState("");

  const refreshRequests = async () => {
    const nextRequests = await getManagedRequests();
    setRequests(nextRequests.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))));
  };

  useEffect(() => {
    refreshRequests();
  }, []);

  const visibleProperties = properties.filter((item) =>
    `${item.name} ${item.location} ${item.destination}`.toLowerCase().includes(listingSearch.toLowerCase())
  );

  async function createUnit() {
    const base = defaultProperties[0];
    const slug = `new-residence-${Date.now()}`;
    const draft: Property = {
      ...base,
      slug,
      name: "New Private Residence",
      location: "Global",
      destination: "global",
      priceUsd: 0,
      priceLabel: "POA",
      specs: "Add bedrooms / interior / lifestyle notes",
      explanation: "Add the private illustrated explanation for this residence.",
    };
    setProperties(await saveProperty(draft));
    go(`/admin-unit/${slug}`);
  }

  async function removeUnit(property: Property) {
    if (!(await onConfirmRequest({
      eyebrow: t("confirmAction"),
      title: `${t("removeUnit")}: ${property.name}`,
      description: t("deleteUnitConfirmation"),
      confirmLabel: t("confirmDelete"),
      tone: "danger",
      icon: "trash",
    }))) return;
    setDeletingSlug(property.slug);
    setListingMessage("");
    try {
      setProperties(await deleteProperty(property.slug));
      setListingMessage(`${property.name}: ${t("unitRemoved")}`);
    } catch (error) {
      setListingMessage(error instanceof Error ? `${t("unitRemoveError")} ${error.message}` : t("unitRemoveError"));
    } finally {
      setDeletingSlug("");
    }
  }

  async function changeRequestStatus(request: ManagedRequest, status: string) {
    if ((request.status || "new") === status) return;
    if (!(await onConfirmRequest({ eyebrow: t("confirmAction"), title: `${t("status")}: ${status}`, description: t("statusConfirmation"), confirmLabel: t("confirmUpdate"), icon: "refresh" }))) return;
    const updated = await updateManagedRequestStatus(request, status);
    setRequests((current) => current.map((item) => (item.id === request.id ? { ...item, ...updated } : item)));
  }

  async function removeRequest(request: ManagedRequest) {
    if (!(await onConfirmRequest({ eyebrow: t("confirmAction"), title: t("delete"), description: t("deleteRequestConfirmation"), confirmLabel: t("confirmDelete"), tone: "danger", icon: "trash" }))) return;
    try {
      await deleteManagedRequest(request);
      setRequests((current) => current.filter((item) => item.id !== request.id));
      setInboxMessage("");
    } catch (error) {
      setInboxMessage(error instanceof Error ? error.message : t("unitSaveError"));
    }
  }

  return (
    <main className="page-shell admin-page">
      <section className="section admin-hero">
        <div className="admin-hero-copy">
          <p className="eyebrow"><Icon name="lock" /> {t("admin")}</p>
          <h1>{settings.brandName} {t("controlRoom")}</h1>
          <p>{user.name} · {user.email}</p>
        </div>
        <button className="admin-primary-action" type="button" onClick={createUnit}><Icon name="plus" />{t("addNewUnit")}</button>
        <div className="vault-dashboard admin-metrics">
          <div className="metric"><span><Icon name="building" />{t("totalListings")}</span><strong>{properties.length}</strong></div>
          <div className="metric"><span><Icon name="wallet" />{t("poaAssets")}</span><strong>{properties.filter((item) => item.priceLabel === "POA").length}</strong></div>
          <div className="metric"><span><Icon name="message" />{t("newRequests")}</span><strong>{requests.filter((item) => item.status === "new").length}</strong></div>
          <div className="metric"><span><Icon name="inbox" />{t("inbox")}</span><strong>{requests.length}</strong></div>
        </div>
        <nav className="admin-section-nav" aria-label={t("admin")}>
          {(["overview", "listings", "inbox", "settings"] as const).map((item) => (
            <button className={section === item ? "active" : ""} type="button" key={item} onClick={() => setSection(item)}>
              <Icon name={item === "overview" ? "eye" : item === "listings" ? "building" : item === "inbox" ? "inbox" : "settings"} />
              {item === "overview" ? t("controlRoom") : item === "listings" ? t("totalListings") : item === "inbox" ? t("inbox") : t("saveSiteSettings")}
              {item === "inbox" && requests.filter((request) => (request.status || "new") === "new").length > 0 && <span>{requests.filter((request) => (request.status || "new") === "new").length}</span>}
            </button>
          ))}
        </nav>
      </section>
      {(section === "overview" || section === "listings") && <section className="section admin-grid admin-units-first">
        <div className="admin-listing-toolbar">
          <label className="admin-search"><Icon name="search" /><input value={listingSearch} onChange={(event) => setListingSearch(event.target.value)} placeholder={`${t("totalListings")}...`} /></label>
          <button type="button" onClick={createUnit}><Icon name="plus" />{t("addNewUnit")}</button>
        </div>
        {listingMessage && <p className="auth-message admin-listing-message">{listingMessage}</p>}
        {visibleProperties.map((item) => (
          <article className="admin-listing" key={item.slug}>
            <img src={item.image} alt={item.name} />
            <div><span>{item.location}</span><h3>{item.name}</h3><p>{item.specs}</p></div>
            <dl><div><dt>{t("yield")}</dt><dd>{item.yield}</dd></div><div><dt>{t("occupancy")}</dt><dd>{item.occupancy}</dd></div><div><dt>{t("privacy")}</dt><dd>{item.privacy}</dd></div></dl>
            <div className="admin-listing-actions">
              <button type="button" onClick={() => go(`/detail/${item.slug}`)}><Icon name="external" />{t("open")}</button>
              <button type="button" onClick={() => go(`/admin-unit/${item.slug}`)}><Icon name="edit" />{t("edit")}</button>
              <button className="admin-listing-remove" type="button" disabled={deletingSlug === item.slug} onClick={() => removeUnit(item)}><Icon name="trash" />{t("removeUnit")}</button>
            </div>
          </article>
        ))}
      </section>}
      {section === "settings" && <section className="section admin-control-section">
        <div className="admin-panel">
            <form className="admin-form unlocked" onSubmit={async (event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const next = {
                ...settings,
                brandName: String(data.get("brandName")),
                whatsappUrl: String(data.get("whatsappUrl")),
                defaultCurrency: String(data.get("defaultCurrency")) as SiteSettings["defaultCurrency"],
                cryptoPayments: String(data.get("cryptoPayments")),
                pendingRequests: Number(data.get("pendingRequests")) || requests.length,
              };
              if (!(await onConfirmRequest({ eyebrow: t("confirmAction"), title: t("saveSiteSettings"), description: t("saveSettingsConfirmation"), confirmLabel: t("confirmSave"), tone: "save", icon: "save" }))) return;
              setSettings(await saveSiteSettings(next));
              setSettingsMessage(t("siteSettingsSaved"));
            }}>
              <label>{t("brandName")}<input name="brandName" defaultValue={settings.brandName} /></label>
              <label>{t("whatsappUrl")}<input name="whatsappUrl" defaultValue={settings.whatsappUrl} /></label>
              <label>{t("defaultCurrency")}<select name="defaultCurrency" defaultValue={settings.defaultCurrency}><option>USD</option><option>EUR</option><option>AED</option><option>GBP</option></select></label>
              <label>{t("cryptoNote")}<input name="cryptoPayments" defaultValue={settings.cryptoPayments} /></label>
              <label>{t("pendingRequests")}<input name="pendingRequests" type="number" defaultValue={settings.pendingRequests} /></label>
              <button type="submit"><Icon name="save" />{t("saveSiteSettings")}</button>
              <p className="auth-message">{settingsMessage}</p>
            </form>
        </div>
      </section>}
      {(section === "overview" || section === "inbox") && <section className="section admin-panel admin-inbox">
        <div className="section-heading admin-inbox-toolbar">
          <button type="button" onClick={refreshRequests}><Icon name="refresh" />{t("refreshInbox")}</button>
        </div>
        <div className="admin-request-grid">
          {inboxMessage && <p className="auth-message error">{inboxMessage}</p>}
          {requests.length === 0 && <p className="auth-message">{t("noRequestsFound")}</p>}
          {requests.map((request) => (
            <article className="admin-request-card" key={`${request.collection}-${request.id}`}>
              <div>
                <span>{request.collection === "advisorRequests" ? t("privateAdvisor") : t("concierge")}</span>
                <h3>{request.purpose || t("privateRequest")}</h3>
                <p>{request.request || request.preferences || t("noBriefProvided")}</p>
              </div>
              <dl>
                <div><dt>{t("name")}</dt><dd>{request.name || t("privateClient")}</dd></div>
                <div><dt>{t("email")}</dt><dd>{request.email || request.userEmail || t("notProvided")}</dd></div>
                <div><dt>{t("residence")}</dt><dd>{request.desiredResidence || t("advisorRecommendation")}</dd></div>
                <div><dt>{t("status")}</dt><dd>{request.status || "new"}</dd></div>
              </dl>
              {request.geographicArea && (
                <section className="admin-geographic-range">
                  <span><Icon name="map" />{t("selectedArea")}</span>
                  <strong>{request.geographicArea.radiusKm} km</strong>
                  <p>{t("centerPoint")}: {request.geographicArea.centerLatitude.toFixed(4)}, {request.geographicArea.centerLongitude.toFixed(4)}</p>
                  <small>N {request.geographicArea.bounds.north.toFixed(3)} · S {request.geographicArea.bounds.south.toFixed(3)} · E {request.geographicArea.bounds.east.toFixed(3)} · W {request.geographicArea.bounds.west.toFixed(3)}</small>
                </section>
              )}
              <div className="admin-actions">
                {["reviewing", "contacted", "closed"].map((status) => (
                  <button
                    className={(request.status || "new") === status ? "active" : ""}
                    type="button"
                    key={status}
                    onClick={() => changeRequestStatus(request, status)}
                  >
                    <Icon name={status === "closed" ? "check" : status === "contacted" ? "message" : "eye"} />
                    {status === "reviewing" ? t("reviewing") : status === "contacted" ? t("contacted") : t("closed")}
                  </button>
                ))}
                <button type="button" onClick={() => removeRequest(request)}><Icon name="trash" />{t("delete")}</button>
              </div>
            </article>
          ))}
        </div>
      </section>}
    </main>
  );
}

function UnitManagementPage({
  properties,
  setProperties,
  id,
  onConfirmRequest,
}: {
  properties: Property[];
  setProperties: (properties: Property[]) => void;
  id: string;
  onConfirmRequest: ConfirmAction;
}) {
  const { t } = useLanguage();
  const [message, setMessage] = useState("");
  const property = properties.find((item) => item.slug === id) || properties[0] || defaultProperties[0];
  const [mainImage, setMainImage] = useState(property.image);

  const csv = (items: string[]) => items.join(", ");
  const fromCsv = (value: FormDataEntryValue | null) =>
    String(value || "")
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  const uniqueImages = (items: string[]) => Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)));
  const propertyGallery = uniqueImages([property.image].concat(property.images || []));
  const slugify = (value: string) =>
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  useEffect(() => {
    setMainImage(property.image);
  }, [property.slug, property.image]);

  const readProperty = (data: FormData): Property => {
    const name = String(data.get("name") || "Untitled Residence");
    const manualMain = String(data.get("image") || property.image);
    const galleryUrls = fromCsv(data.get("galleryImages"));
    const selectedMain = String(data.get("selectedMainImage") || manualMain);
    const images = uniqueImages([selectedMain, manualMain].concat(galleryUrls));
    return {
      ...property,
      slug: slugify(String(data.get("slug") || name)),
      name,
      location: String(data.get("location")),
      destination: String(data.get("destination")),
      image: selectedMain || manualMain,
      images,
      priceUsd: Number(data.get("priceUsd")) || 0,
      priceLabel: String(data.get("priceLabel")),
      tags: fromCsv(data.get("tags")),
      privacy: String(data.get("privacy")),
      specs: String(data.get("specs")),
      bedrooms: Number(data.get("bedrooms")) || 0,
      interior: String(data.get("interior")),
      security: String(data.get("security")),
      payment: String(data.get("payment")),
      yield: String(data.get("yield")),
      occupancy: String(data.get("occupancy")),
      coordinates: { left: String(data.get("mapLeft") || "50%"), top: String(data.get("mapTop") || "50%") },
      metrics: fromCsv(data.get("metrics")),
      explanation: String(data.get("explanation")),
      illustrationSet: fromCsv(data.get("illustrationSet")),
      neighborhood: fromCsv(data.get("neighborhood")),
      rooms: fromCsv(data.get("rooms")),
    };
  };

  async function saveCurrent(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    if (!(await onConfirmRequest({ eyebrow: t("confirmAction"), title: t("saveUnit"), description: t("saveUnitConfirmation"), confirmLabel: t("confirmSave"), tone: "save", icon: "save" }))) return;
    try {
      setMessage(t("savingUnit"));
      const next = readProperty(data);
      const imageFiles = data
        .getAll("imageFiles")
        .filter((item): item is File => item instanceof File && item.size > 0);

      if (imageFiles.length > 0) {
        setMessage(`Uploading ${imageFiles.length} high-resolution image${imageFiles.length > 1 ? "s" : ""} to Firebase Storage...`);
        const uploadedUrls = await Promise.all(imageFiles.map((file) => uploadPropertyImage(file, next.slug)));
        next.images = uniqueImages([next.image].concat(next.images || [], uploadedUrls));
        if (data.get("firstUploadedMain") === "on") {
          next.image = uploadedUrls[0];
          next.images = uniqueImages([next.image].concat(next.images || []));
        }
      }

      const nextProperties = await saveProperty(next);
      setProperties(nextProperties);
      setMessage(imageFiles.length > 0 ? t("uploadedAndSaved") : t("unitSaved"));
      if (next.slug !== id) go(`/admin-unit/${next.slug}`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : t("unitSaveError"));
    }
  }

  async function resetDefaults() {
    if (!(await onConfirmRequest({ eyebrow: t("confirmAction"), title: t("seedDefaults"), description: t("restoreDefaultsConfirmation"), confirmLabel: t("confirmUpdate"), icon: "refresh" }))) return;
    const nextProperties = await seedDefaults();
    setProperties(nextProperties);
    go("/admin");
  }

  return (
    <main className="page-shell admin-page">
      <section className="section">
        <div className="section-heading">
          <h1>{property.name}</h1>
          <button className="primary-dark" type="button" onClick={() => go("/admin")}><Icon name="arrowLeft" />{t("backToControlRoom")}</button>
        </div>
      </section>
      <section className="section admin-panel unit-management-page">
        <form className="admin-form" key={property.slug} onSubmit={saveCurrent}>
          <label>{t("slug")}<input name="slug" defaultValue={property.slug} /></label>
          <label>{t("name")}<input name="name" defaultValue={property.name} /></label>
          <label>{t("location")}<input name="location" defaultValue={property.location} /></label>
          <label>{t("destination")}<input name="destination" defaultValue={property.destination} /></label>
          <label className="wide">{t("mainImageUrl")}<input name="image" defaultValue={property.image} onChange={(event) => setMainImage(event.currentTarget.value)} /></label>
          <input type="hidden" name="selectedMainImage" value={mainImage} />
          <div className="admin-gallery-selector wide">
            {propertyGallery.map((image) => (
              <label className={mainImage === image ? "selected" : ""} key={image}>
                <input type="radio" checked={mainImage === image} onChange={() => setMainImage(image)} />
                <img src={image} alt="" />
                <span>{mainImage === image ? t("mainImage") : t("useAsMain")}</span>
              </label>
            ))}
          </div>
          <label className="wide">{t("detailImageUrls")}<textarea name="galleryImages" defaultValue={csv((property.images || []).filter((image) => image !== property.image))} /></label>
          <label className="wide">{t("uploadGalleryImages")}<input name="imageFiles" type="file" accept="image/*" multiple /></label>
          <label className="admin-check wide"><input name="firstUploadedMain" type="checkbox" /> {t("useFirstUploadedMain")}</label>
          <label>{t("priceUsd")}<input name="priceUsd" type="number" defaultValue={property.priceUsd} /></label>
          <label>{t("priceLabel")}<input name="priceLabel" defaultValue={property.priceLabel} /></label>
          <label>{t("bedrooms")}<input name="bedrooms" type="number" defaultValue={property.bedrooms} /></label>
          <label>{t("interior")}<input name="interior" defaultValue={property.interior} /></label>
          <label>{t("privacy")}<input name="privacy" defaultValue={property.privacy} /></label>
          <label>{t("security")}<input name="security" defaultValue={property.security} /></label>
          <label>{t("payment")}<input name="payment" defaultValue={property.payment} /></label>
          <label>{t("yield")}<input name="yield" defaultValue={property.yield} /></label>
          <label>{t("occupancy")}<input name="occupancy" defaultValue={property.occupancy} /></label>
          <label>{t("mapLeft")}<input name="mapLeft" defaultValue={property.coordinates.left} /></label>
          <label>{t("mapTop")}<input name="mapTop" defaultValue={property.coordinates.top} /></label>
          <label className="wide">{t("specs")}<textarea name="specs" defaultValue={property.specs} /></label>
          <label className="wide">{t("tags")}<textarea name="tags" defaultValue={csv(property.tags)} /></label>
          <label className="wide">{t("luxuryMetrics")}<textarea name="metrics" defaultValue={csv(property.metrics)} /></label>
          <label className="wide">{t("rooms")}<textarea name="rooms" defaultValue={csv(property.rooms)} /></label>
          <label className="wide">{t("neighborhood")}<textarea name="neighborhood" defaultValue={csv(property.neighborhood)} /></label>
          <label className="wide">{t("illustrationSet")}<textarea name="illustrationSet" defaultValue={csv(property.illustrationSet)} /></label>
          <label className="wide">{t("explanation")}<textarea name="explanation" defaultValue={property.explanation} /></label>
          <div className="admin-actions">
            <button type="submit"><Icon name="save" />{t("saveUnit")}</button>
            <button type="button" onClick={resetDefaults}><Icon name="refresh" />{t("seedDefaults")}</button>
          </div>
          <p className="auth-message">{message}</p>
        </form>
      </section>
    </main>
  );
}

function AdminAccessPage({ ready, user }: { ready: boolean; user: Profile | null }) {
  const { t } = useLanguage();
  return (
    <main className="page-shell admin-access-page">
      <section className="admin-access-card">
        <span className="admin-access-icon"><Icon name={ready ? "lock" : "refresh"} /></span>
        <p className="eyebrow">{t("admin")}</p>
        <h1>{ready ? t("confirmAccess") : t("signingIn")}</h1>
        <p>{t("privateAccessSteps")}</p>
        {ready && !user && <a href="#/auth"><Icon name="lock" />{t("signIn")}</a>}
        {ready && user && <a href="#/profile"><Icon name="user" />{t("profile")}</a>}
      </section>
    </main>
  );
}

export default function App() {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());
  const [currentRoute, setCurrentRoute] = useState(route());
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [properties, setProperties] = useState<Property[]>(defaultProperties);
  const [settings, setSettings] = useState<SiteSettings>(() => getCachedSiteSettings());
  const [advisorOpen, setAdvisorOpen] = useState(false);
  const [advisorContext, setAdvisorContext] = useState<AdvisorContext>({ source: "advisor" });
  const [confirmationRequest, setConfirmationRequest] = useState<ConfirmationRequest | null>(null);

  const openAdvisor = (context: AdvisorContext = { source: "advisor" }) => {
    setAdvisorContext(context);
    setAdvisorOpen(true);
  };

  const navigateSection = (section: string) => {
    goHomeSection(section);
  };
  const openContactPage = () => {
    go("/about/contact");
  };

  const confirmRequestSend: ConfirmAction = (options) =>
    new Promise<boolean>((resolve) => {
      setConfirmationRequest({ ...options, resolve });
    });

  const resolveConfirmation = (confirmed: boolean) => {
    confirmationRequest?.resolve(confirmed);
    setConfirmationRequest(null);
  };
  const setLanguage = (nextLanguage: Language) => {
    localStorage.setItem("auraLanguage", nextLanguage);
    setLanguageState(nextLanguage);
  };
  const t = (key: TranslationKey) => translations[language][key] || translations.en[key];
  const languageContext = useMemo(() => ({ language, setLanguage, t }), [language]);

  useEffect(() => {
    let transitionTimer: number | undefined;
    const onHash = () => {
      const nextRoute = route();
      setTransitioning(true);
      window.clearTimeout(transitionTimer);
      transitionTimer = window.setTimeout(() => {
        setCurrentRoute(nextRoute);
        window.scrollTo({ top: 0, behavior: "smooth" });
        window.setTimeout(() => setTransitioning(false), 40);
      }, 180);
    };
    window.addEventListener("hashchange", onHash);
    waitForAuth().then(setUser).finally(() => setAuthReady(true));
    getProperties().then(setProperties);
    getSiteSettings().then(setSettings);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.clearTimeout(transitionTimer);
    };
  }, []);

  useEffect(() => {
    document.title = `${settings.brandName} | ${t("privateGlobalResidences")}`;
    document.documentElement.lang = language;
  }, [settings.brandName, language]);

  useEffect(() => {
    const selector = [
      ".section-heading",
      ".property-card",
      ".collection-card",
      ".insight",
      ".about-benefit-card",
      ".about-proof-strip > div",
      ".investment-snapshot-panel",
      ".explore-range-receipt",
      ".admin-listing",
      ".admin-request-card",
      ".admin-hero .metric",
      ".profile-card",
    ].join(",");
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const observed = new WeakSet<Element>();
    const revealObserver = reducedMotion ? null : new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("motion-visible");
        revealObserver?.unobserve(entry.target);
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -8% 0px" });

    const register = (root: ParentNode | Element) => {
      const targets: Element[] = [];
      if (root instanceof Element && root.matches(selector)) targets.push(root);
      targets.push(...Array.from(root.querySelectorAll(selector)));
      targets.forEach((target, index) => {
        if (observed.has(target)) return;
        observed.add(target);
        target.classList.add("motion-reveal");
        if (target instanceof HTMLElement) target.style.setProperty("--motion-delay", `${Math.min(index % 6, 5) * 55}ms`);
        if (reducedMotion) target.classList.add("motion-visible");
        else revealObserver?.observe(target);
      });
    };

    register(document);
    const mutationObserver = new MutationObserver((records) => {
      records.forEach((record) => record.addedNodes.forEach((node) => {
        if (node instanceof Element) register(node);
      }));
    });
    const page = document.querySelector(".page-transition");
    if (page) mutationObserver.observe(page, { childList: true, subtree: true });

    return () => {
      mutationObserver.disconnect();
      revealObserver?.disconnect();
    };
  }, [currentRoute.page, currentRoute.id, currentRoute.query]);

  const content =
    currentRoute.page === "auth" ? (
      <AuthPage onUser={setUser} />
    ) : currentRoute.page === "about" ? (
      <AboutPage id={currentRoute.id} onAdvisor={openAdvisor} />
    ) : currentRoute.page === "explore-map" ? (
      <ExploreMapPage user={user} routeQuery={currentRoute.query} onConfirmRequest={confirmRequestSend} />
    ) : currentRoute.page === "detail" ? (
      <DetailPage user={user} properties={properties} id={currentRoute.id} />
    ) : currentRoute.page === "profile" ? (
      <ProfilePage user={user} onUser={setUser} onConfirmRequest={confirmRequestSend} />
    ) : currentRoute.page === "admin-unit" && authReady && isAdmin(user) ? (
      <UnitManagementPage
        properties={properties}
        setProperties={setProperties}
        id={currentRoute.id}
        onConfirmRequest={confirmRequestSend}
      />
    ) : currentRoute.page === "admin" && authReady && isAdmin(user) ? (
      <AdminPage
        user={user!}
        properties={properties}
        setProperties={setProperties}
        settings={settings}
        setSettings={setSettings}
        onConfirmRequest={confirmRequestSend}
      />
    ) : currentRoute.page === "admin" || currentRoute.page === "admin-unit" ? (
      <AdminAccessPage ready={authReady} user={user} />
    ) : (
      <HomePage
        user={user}
        properties={properties}
        settings={settings}
        setProperties={setProperties}
        onNavigate={navigateSection}
        onAdvisor={openAdvisor}
        onConfirmRequest={confirmRequestSend}
      />
    );

  return (
    <LanguageContext.Provider value={languageContext}>
      <Header user={user} settings={settings} activePage={currentRoute.page} activeRouteId={currentRoute.id} onNavigate={navigateSection} onContact={openContactPage} />
      <div className={`page-transition ${transitioning ? "leaving" : "entered"}`} key={`${currentRoute.page}-${currentRoute.id}-${currentRoute.query}`}>
        {content}
      </div>
      <GlobalFooter settings={settings} onNavigate={navigateSection} />
      <AdvisorDrawer
        open={advisorOpen}
        context={advisorContext}
        user={user}
        properties={properties}
        onClose={() => setAdvisorOpen(false)}
        onConfirmRequest={confirmRequestSend}
      />
      <ConfirmationModal request={confirmationRequest} onDecision={resolveConfirmation} />
    </LanguageContext.Provider>
  );
}
