import { createContext, FormEvent, useContext, useEffect, useId, useMemo, useState } from "react";
import type { AdvisorRequest, ManagedRequest, Profile, Property, SiteSettings } from "./types";
import { defaultProperties, defaultSiteSettings, rates } from "./data";
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
  submitRentalRequest,
  updateManagedRequestStatus,
  updateProfileData,
  uploadPropertyImage,
  waitForAuth,
} from "./firebase";

type Page = "home" | "about" | "auth" | "detail" | "profile" | "admin" | "admin-unit";
type AdvisorContext = {
  source: string;
  property?: string;
};
type SelectOption = {
  value: string;
  label: string;
};
type ConfirmationRequest = {
  label: string;
  resolve: (confirmed: boolean) => void;
};
type Language = "en" | "de" | "it";
type LanguageContextValue = {
  language: Language;
  setLanguage: (language: Language) => void;
  t: (key: TranslationKey) => string;
};
type IconName =
  | "arrowLeft"
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
    profile: "Profile",
    signIn: "Sign In",
    admin: "Admin",
    privateAdvisor: "Private Advisor",
    privateGlobalResidences: "Private global residences",
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
    saveProfile: "Save Profile",
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
    profile: "Profil",
    signIn: "Anmelden",
    admin: "Admin",
    privateAdvisor: "Privater Berater",
    privateGlobalResidences: "Private globale Residenzen",
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
    saveProfile: "Profil speichern",
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
    profile: "Profilo",
    signIn: "Accedi",
    admin: "Admin",
    privateAdvisor: "Consulente privato",
    privateGlobalResidences: "Residenze private globali",
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
    saveProfile: "Salva profilo",
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
  const [page = "home", id = ""] = hash.split("/");
  return { page: (page || "home") as Page, id };
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

const initials = (value = "A") =>
  value
    .split(/[\s@.]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");

const option = (value: string, label = value): SelectOption => ({ value, label });

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
    <div className={`glass-select luxury-select ${open ? "open" : ""} ${tone}`}>
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
  const activeLanguage = languages.find((item) => item.code === language) || languages[0];

  return (
    <div className={`language-switcher ${open ? "open" : ""} ${compact ? "compact" : ""}`}>
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
      <button className="confirmation-scrim" type="button" aria-label="Cancel request" onClick={() => onDecision(false)} />
      <section className="confirmation-panel" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <span className="confirmation-mark" aria-hidden="true"><Icon name="shield" /></span>
        <p className="eyebrow">{t("confirmRequest")}</p>
        <h2 id="confirm-title">{t("sendPrivateRequest")}</h2>
        <p>{t("confirmationCopy")}</p>
        <div className="confirmation-actions">
          <button type="button" onClick={() => onDecision(false)}><Icon name="x" />{t("cancel")}</button>
          <button type="button" onClick={() => onDecision(true)}><Icon name="check" />{t("sendRequest")}</button>
        </div>
      </section>
    </aside>
  );
}

function Header({
  user,
  settings,
  onNavigate,
  onContact,
}: {
  user: Profile | null;
  settings: SiteSettings;
  onNavigate: (section: string) => void;
  onContact: () => void;
}) {
  const { t } = useLanguage();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigateMobile = (section: string) => {
    setMobileMenuOpen(false);
    onNavigate(section);
  };

  return (
    <header className="site-header scrolled">
      <button className="brand brand-button" type="button" onClick={() => onNavigate("home")}>
        <span className="brand-mark">A</span>
        <span>{settings.brandName}</span>
      </button>
      <nav className="desktop-nav" aria-label={t("primaryNavigation")}>
        <button type="button" onClick={() => onNavigate("residences")}><Icon name="building" />{t("residences")}</button>
        <button type="button" onClick={() => onNavigate("collections")}><Icon name="layers" />{t("collections")}</button>
        <a href="#/about"><Icon name="globe" />{t("about")}</a>
        <button type="button" onClick={() => onNavigate("concierge")}><Icon name="message" />{t("concierge")}</button>
        {!user && <a href="#/auth"><Icon name="lock" />{t("signIn")}</a>}
        {isAdmin() && <a href="#/admin"><Icon name="settings" />{t("admin")}</a>}
      </nav>
      <div className="header-actions">
        <LanguageSwitcher />
        <button className="advisor-button" type="button" onClick={onContact}>
          <Icon name="message" />{t("contact")}
        </button>
        {user && (
          <a className="profile-chip" href="#/profile">
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
        <button type="button" onClick={() => navigateMobile("residences")}><Icon name="building" />{t("residences")}</button>
        <button type="button" onClick={() => navigateMobile("collections")}><Icon name="layers" />{t("collections")}</button>
        <a href="#/about" onClick={() => setMobileMenuOpen(false)}><Icon name="globe" />{t("about")}</a>
        <button type="button" onClick={() => navigateMobile("concierge")}><Icon name="message" />{t("concierge")}</button>
        {!user && <a href="#/auth" onClick={() => setMobileMenuOpen(false)}><Icon name="lock" />{t("signIn")}</a>}
        {isAdmin() && <a href="#/admin" onClick={() => setMobileMenuOpen(false)}><Icon name="settings" />{t("admin")}</a>}
        <button type="button" onClick={() => { setMobileMenuOpen(false); onContact(); }}><Icon name="message" />{t("contact")}</button>
      </nav>
    </header>
  );
}

function GlobalFooter({
  settings,
  onNavigate,
  onAdvisor,
}: {
  settings: SiteSettings;
  onNavigate: (section: string) => void;
  onAdvisor: (context?: AdvisorContext) => void;
}) {
  const { t } = useLanguage();
  return (
    <footer className="site-footer">
      <div className="footer-brand">
        <button className="brand brand-button" type="button" onClick={() => onNavigate("home")}>
          <span className="brand-mark">A</span>
          <span>{settings.brandName}</span>
        </button>
        <p>{settings.cryptoPayments}</p>
      </div>
      <nav className="footer-nav" aria-label={t("primaryNavigation")}>
        <button type="button" onClick={() => onNavigate("residences")}><Icon name="building" />{t("residences")}</button>
        <button type="button" onClick={() => onNavigate("collections")}><Icon name="layers" />{t("collections")}</button>
        <button type="button" onClick={() => onNavigate("concierge")}><Icon name="message" />{t("concierge")}</button>
        <a href="#/profile"><Icon name="user" />{t("profile")}</a>
      </nav>
      <div className="footer-actions">
        <button type="button" onClick={() => onAdvisor({ source: "footer" })}><Icon name="message" />{t("privateAdvisor")}</button>
        <span>{t("privateGlobalResidences")}</span>
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
  onConfirmRequest: (label: string) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [destination, setDestination] = useState("all");
  const [lifestyle, setLifestyle] = useState("all");
  const [privacy, setPrivacy] = useState("all");
  const [currency, setCurrency] = useState<keyof typeof rates>(settings.defaultCurrency);
  const [activeMap, setActiveMap] = useState(0);
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

  const toggleCompare = (index: number) => {
    if (!requireAccess()) return;
    setComparison((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : current.length < 3 ? current.concat(index) : current
    );
  };

  return (
    <main>
      <section className="hero" id="home">
        <picture>
          <img src="assets/hero-villa.png" alt="Coastal luxury villa at golden hour" />
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

          <aside className="map-panel reveal visible">
            <div className="map-toolbar">
              <span><Icon name="map" />{t("privateMap")}</span>
              <span><Icon name="building" />{visible.length} {t("assets")}</span>
            </div>
            <div className="map-canvas">
              {properties.map((property, index) => (
                <button
                  className={`map-pin ${activeMap === index ? "active" : ""}`}
                  style={{ left: property.coordinates.left, top: property.coordinates.top }}
                  type="button"
                  key={property.slug}
                  onClick={() => {
                    if (!requireAccess()) return;
                    setActiveMap(index);
                  }}
                  aria-label={`View ${property.name}`}
                />
              ))}
              <div className="map-route" />
            </div>
            {properties[activeMap] && (
              <div className="map-property">
                <img src={properties[activeMap].image} alt={properties[activeMap].name} />
                <div>
                  <span>{properties[activeMap].location}</span>
                  <h3>{properties[activeMap].name}</h3>
                  <p>{properties[activeMap].specs}</p>
                  <button type="button" onClick={() => openDetail(properties[activeMap].slug)}><Icon name="external" />{t("openExplanation")}</button>
                </div>
              </div>
            )}
          </aside>
        </div>
      </section>

      <section className="detail section" id="explanation">
        <div className="detail-media reveal visible">
          <img src="assets/island-villa.png" alt="Private island villa with yacht dock" />
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
            if (!(await onConfirmRequest("concierge booking"))) return;
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
  onConfirmRequest: (label: string) => Promise<boolean>;
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

    if (!(await onConfirmRequest("private advisor brief"))) return;

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

function AuthPage({ onUser }: { onUser: (user: Profile | null) => void }) {
  const { t } = useLanguage();
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState<"info" | "success" | "error">("info");
  const [verificationEmail, setVerificationEmail] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);
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
      go(result.role === "admin" ? "/admin" : "/profile");
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
    setAuthSubmitting(true);
    setMessageTone("info");
    setMessage(t("creatingAccount"));
    try {
      const result = await signUp({
        name: String(data.get("name")),
        email: String(data.get("email")),
        password: String(data.get("password")),
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
            <label>{t("password")}<input name="password" type="password" autoComplete="current-password" /></label>
            <button className="auth-primary-button" type="submit" disabled={authSubmitting}><Icon name="lock" />{authSubmitting ? t("signingIn") : t("enterPrivatePortal")}</button>
            <button className="auth-switch-link" type="button" onClick={() => setMode("signup")}><Icon name="user" />{t("dontHaveAccount")}</button>
          </form>
        )}
        {mode === "signup" && (
          <form className="auth-form active" onSubmit={handleSignUp}>
            <label>{t("fullName")}<input name="name" /></label>
            <label>{t("email")}<input name="email" type="email" /></label>
            <label>{t("password")}<input name="password" type="password" /></label>
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

function ProfilePage({ user, onUser }: { user: Profile | null; onUser: (user: Profile | null) => void }) {
  const { t } = useLanguage();
  useEffect(() => {
    if (!user) go("/auth");
  }, [user]);
  if (!user) return null;
  return (
    <main className="profile-shell">
      <section className="profile-card">
        <div className="profile-hero-row">
          <div className="profile-avatar large" style={user.photoURL ? { backgroundImage: `url("${user.photoURL}")` } : undefined}>{user.photoURL ? "" : initials(user.name || user.email)}</div>
          <div><p className="eyebrow">{t("privateProfile")}</p><h1>{user.name}</h1><p className="profile-status">{user.emailVerified ? t("verifiedAccount") : t("verificationPending")}</p></div>
        </div>
        <form className="profile-form" onSubmit={async (event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          onUser(await updateProfileData({ name: String(data.get("name")), intent: String(data.get("intent")), photoURL: String(data.get("photoURL")) }));
        }}>
          <label>{t("name")}<input name="name" defaultValue={user.name} /></label>
          <label>{t("email")}<input disabled defaultValue={user.email} /></label>
          <label>{t("profileImageUrl")}<input name="photoURL" defaultValue={user.photoURL || ""} /></label>
          <label>{t("intent")}<select name="intent" defaultValue={user.intent || "Rent"}><option value="Buy">{t("buy")}</option><option value="Rent">{t("rent")}</option><option value="Invest">{t("invest")}</option><option value="List a property">{t("listAProperty")}</option></select></label>
          <button type="submit"><Icon name="save" />{t("saveProfile")}</button>
          <button type="button" onClick={async () => { await logout(); onUser(null); go("/auth"); }}><Icon name="x" />{t("logOut")}</button>
        </form>
      </section>
    </main>
  );
}

function AboutPage({ id }: { id: string }) {
  useEffect(() => {
    if (id !== "contact") return;
    window.setTimeout(() => {
      document.getElementById("contact-info")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
  }, [id]);

  const agencyServices = [
    "Private villas",
    "Beachfront residences",
    "Penthouses",
    "Tourist rental units",
    "Resort properties",
    "Private island and destination properties",
    "Investment residences",
  ];
  const marketingServices = [
    "Project presentation",
    "Unit listing and positioning",
    "Buyer and investor lead generation",
    "Luxury property content and visual presentation",
    "Development campaign support",
    "Private advisor inquiry handling",
    "International client communication",
  ];
  const platformServices = [
    "Unit listing for rental management",
    "Unit listing for sale",
    "Private advisor requests",
    "Concierge and rental inquiries",
    "Owner and client communication",
    "Property status tracking",
    "Yield and occupancy indicators",
    "Premium image galleries",
    "Currency and payment preference display",
    "Admin-managed listing updates",
  ];
  const websiteServices = [
    "Curated luxury residence listings",
    "Advanced property search by destination, lifestyle, and privacy level",
    "Featured collections such as waterfront villas, penthouses, and investment residences",
    "Private advisor request forms",
    "Concierge request forms for viewings, rental reservations, and unit explanations",
    "Property comparison tools",
    "Currency display options",
    "Owner listing and unit management features",
    "Admin review of advisor and rental requests",
    "Property image gallery and detailed unit pages",
    "WhatsApp Business, private email, and premium call contact options",
  ];

  return (
    <main className="page-shell about-page">
      <section className="about-hero section">
        <p className="eyebrow">Company Description</p>
        <h1>Company Name: _______________________________</h1>
        <div className="about-copy">
          <p>
            _______________________________ is a specialized real estate agency and marketing platform focused on luxury,
            tourist, and investment properties. We represent owners, developers, investors, and clients seeking premium
            real estate opportunities in high-value destinations.
          </p>
          <p>
            Our work combines private property advisory, luxury rental management, real estate sales, major project
            representation, and development marketing. We provide a trusted platform where exclusive units can be presented
            professionally, matched with qualified buyers or tenants, and managed through a discreet advisory process.
          </p>
          <p>
            We operate as agents for luxury villas, penthouses, tourist residences, private estates, branded developments,
            and major real estate projects. Our goal is to connect premium properties with the right audience through refined
            presentation, accurate listing management, private client communication, and strategic marketing.
          </p>
        </div>
      </section>

      <section className="section about-services">
        <div className="section-heading">
          <p className="eyebrow">Services We Offer</p>
          <h2>Luxury, tourism, project, and development representation.</h2>
        </div>
        <article className="about-card">
          <h3>Luxury and Tourist Property Agency</h3>
          <p>We represent luxury and tourist properties for sale, rent, and investment, including:</p>
          <ul>{agencyServices.map((item) => <li key={item}>{item}</li>)}</ul>
          <p>We assist clients with property discovery, private viewings, rental reservations, purchase inquiries, and tailored investment recommendations.</p>
        </article>
        <article className="about-card">
          <h3>Major Project Representation</h3>
          <p>We act as agents and marketing partners for major real estate projects, including residential compounds, resort developments, branded residences, and high-end mixed-use projects.</p>
          <p>Our role includes presenting the project to qualified clients, explaining unit types and investment value, supporting inquiries, and helping developers reach buyers, investors, and rental operators.</p>
        </article>
        <article className="about-card">
          <h3>Real Estate Development Marketing</h3>
          <p>We provide marketing support for real estate development services, including:</p>
          <ul>{marketingServices.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
        <article className="about-card">
          <h3>Rental Management and Sale Listing Platform</h3>
          <p>We provide a reliable platform for owners who want to list their units with us for rental management or sale.</p>
          <p>Owners can submit their unit details, images, location, price, rental or sale objective, and preferred management arrangement. Our team reviews each listing, prepares it for presentation, and connects it with suitable renters, buyers, or investors.</p>
          <p>Our platform supports:</p>
          <ul>{platformServices.map((item) => <li key={item}>{item}</li>)}</ul>
        </article>
      </section>

      <section className="section about-website">
        <div className="section-heading">
          <p className="eyebrow">Website Services</p>
          <h2>The website offers:</h2>
        </div>
        <ul className="about-feature-list">{websiteServices.map((item) => <li key={item}>{item}</li>)}</ul>
      </section>

      <section className="section about-contact" id="contact-info">
        <div className="section-heading">
          <p className="eyebrow">Contact Information</p>
          <h2>Contact details will be completed later.</h2>
        </div>
        <dl>
          <div><dt>Company Name</dt><dd>_______________________________</dd></div>
          <div><dt>Phone / WhatsApp</dt><dd>_______________________________</dd></div>
          <div><dt>Email</dt><dd>_______________________________</dd></div>
          <div><dt>Website</dt><dd>_______________________________</dd></div>
          <div><dt>Office Address</dt><dd>_______________________________</dd></div>
          <div><dt>Social Media</dt><dd>_______________________________</dd></div>
        </dl>
      </section>
    </main>
  );
}

function AdminPage({
  properties,
  setProperties,
  settings,
  setSettings,
  onConfirmRequest,
}: {
  properties: Property[];
  setProperties: (properties: Property[]) => void;
  settings: SiteSettings;
  setSettings: (settings: SiteSettings) => void;
  onConfirmRequest: (label: string) => Promise<boolean>;
}) {
  const { t } = useLanguage();
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsUnlocked, setSettingsUnlocked] = useState(false);
  const [requests, setRequests] = useState<ManagedRequest[]>([]);

  const refreshRequests = async () => {
    const nextRequests = await getManagedRequests();
    setRequests(nextRequests.sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || ""))));
  };

  useEffect(() => {
    if (!isAdmin()) go("/auth");
    refreshRequests();
  }, []);

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

  async function changeRequestStatus(request: ManagedRequest, status: string) {
    if ((request.status || "new") === status) return;
    if (!(await onConfirmRequest(`status change to ${status}`))) return;
    const updated = await updateManagedRequestStatus(request, status);
    setRequests((current) => current.map((item) => (item.id === request.id ? { ...item, ...updated } : item)));
  }

  async function removeRequest(request: ManagedRequest) {
    if (!window.confirm("Delete this request from the admin inbox?")) return;
    await deleteManagedRequest(request);
    setRequests((current) => current.filter((item) => item.id !== request.id));
  }

  return (
    <main className="page-shell admin-page">
      <section className="section">
        <div className="section-heading"><h1>{settings.brandName} {t("controlRoom")}</h1></div>
        <div className="vault-dashboard admin-metrics">
          <div className="metric"><span><Icon name="building" />{t("totalListings")}</span><strong>{properties.length}</strong></div>
          <div className="metric"><span><Icon name="wallet" />{t("poaAssets")}</span><strong>{properties.filter((item) => item.priceLabel === "POA").length}</strong></div>
          <div className="metric"><span><Icon name="message" />{t("newRequests")}</span><strong>{requests.filter((item) => item.status === "new").length}</strong></div>
          <div className="metric"><span><Icon name="inbox" />{t("inbox")}</span><strong>{requests.length}</strong></div>
        </div>
      </section>
      <section className="section admin-grid admin-units-first">
        <div className="admin-listing-toolbar">
          <div />
          <button type="button" onClick={createUnit}><Icon name="plus" />{t("addNewUnit")}</button>
        </div>
        {properties.map((item) => (
          <article className="admin-listing" key={item.slug}>
            <img src={item.image} alt={item.name} />
            <div><span>{item.location}</span><h3>{item.name}</h3><p>{item.specs}</p></div>
            <dl><div><dt>{t("yield")}</dt><dd>{item.yield}</dd></div><div><dt>{t("occupancy")}</dt><dd>{item.occupancy}</dd></div><div><dt>{t("privacy")}</dt><dd>{item.privacy}</dd></div></dl>
            <button type="button" onClick={() => go(`/admin-unit/${item.slug}`)}><Icon name="edit" />{t("edit")}</button>
            <button type="button" onClick={() => go(`/detail/${item.slug}`)}><Icon name="external" />{t("open")}</button>
          </article>
        ))}
      </section>
      <section className="section admin-control-section">
        <div className="admin-panel">
          {!settingsUnlocked ? (
            <form className="admin-unlock" onSubmit={(event) => {
              event.preventDefault();
              const pass = String(new FormData(event.currentTarget).get("password"));
              setSettingsUnlocked(pass === "Admin123456");
              setSettingsMessage(pass === "Admin123456" ? t("settingsUnlocked") : t("wrongAdminPassword"));
            }}>
              <label>{t("adminPassword")}<input name="password" type="password" /></label>
              <button type="submit"><Icon name="lock" />{t("unlockSettings")}</button>
              <p className="auth-message">{settingsMessage}</p>
            </form>
          ) : (
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
              if (!(await onConfirmRequest("site settings save"))) return;
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
          )}
        </div>
      </section>
      <section className="section admin-panel admin-inbox">
        <div className="section-heading admin-inbox-toolbar">
          <button type="button" onClick={refreshRequests}><Icon name="refresh" />{t("refreshInbox")}</button>
        </div>
        <div className="admin-request-grid">
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
      </section>
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
  onConfirmRequest: (label: string) => Promise<boolean>;
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
    if (!isAdmin()) go("/auth");
  }, []);

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
    if (!(await onConfirmRequest("unit changes save"))) return;
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

  async function removeUnit() {
    if (!(await onConfirmRequest(`remove ${property.name}`))) return;
    const nextProperties = await deleteProperty(property.slug);
    setProperties(nextProperties);
    go("/admin");
  }

  async function resetDefaults() {
    if (!(await onConfirmRequest("restore default units"))) return;
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
            <button type="button" onClick={removeUnit}><Icon name="trash" />{t("removeUnit")}</button>
            <button type="button" onClick={resetDefaults}><Icon name="refresh" />{t("seedDefaults")}</button>
          </div>
          <p className="auth-message">{message}</p>
        </form>
      </section>
    </main>
  );
}

export default function App() {
  const [language, setLanguageState] = useState<Language>(() => getInitialLanguage());
  const [currentRoute, setCurrentRoute] = useState(route());
  const [transitioning, setTransitioning] = useState(false);
  const [user, setUser] = useState<Profile | null>(null);
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

  const confirmRequestSend = (label: string) =>
    new Promise<boolean>((resolve) => {
      setConfirmationRequest({ label, resolve });
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
    waitForAuth().then(setUser);
    getProperties().then(setProperties);
    getSiteSettings().then(setSettings);
    return () => {
      window.removeEventListener("hashchange", onHash);
      window.clearTimeout(transitionTimer);
    };
  }, []);

  useEffect(() => {
    document.title = `${settings.brandName} | ${t("privateGlobalResidences")}`;
  }, [settings.brandName, language]);

  const content =
    currentRoute.page === "auth" ? (
      <AuthPage onUser={setUser} />
    ) : currentRoute.page === "about" ? (
      <AboutPage id={currentRoute.id} />
    ) : currentRoute.page === "detail" ? (
      <DetailPage user={user} properties={properties} id={currentRoute.id} />
    ) : currentRoute.page === "profile" ? (
      <ProfilePage user={user} onUser={setUser} />
    ) : currentRoute.page === "admin-unit" ? (
      <UnitManagementPage
        properties={properties}
        setProperties={setProperties}
        id={currentRoute.id}
        onConfirmRequest={confirmRequestSend}
      />
    ) : currentRoute.page === "admin" ? (
      <AdminPage
        properties={properties}
        setProperties={setProperties}
        settings={settings}
        setSettings={setSettings}
        onConfirmRequest={confirmRequestSend}
      />
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
      <Header user={user} settings={settings} onNavigate={navigateSection} onContact={openContactPage} />
      <div className={`page-transition ${transitioning ? "leaving" : "entered"}`} key={`${currentRoute.page}-${currentRoute.id}`}>
        {content}
      </div>
      <GlobalFooter settings={settings} onNavigate={navigateSection} onAdvisor={openAdvisor} />
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
