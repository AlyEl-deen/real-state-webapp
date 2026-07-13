import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import {
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  type User,
} from "firebase/auth";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  getFirestore,
  setDoc,
} from "firebase/firestore";
import { getDownloadURL, getStorage, ref, uploadBytes } from "firebase/storage";
import { defaultProperties, defaultSiteSettings } from "./data";
import type { AdvisorRequest, ExploreLead, ManagedRequest, Profile, Property, RentalRequest, SiteSettings } from "./types";

const firebaseApiKey = import.meta.env.VITE_FIREBASE_API_KEY as string | undefined;
const firebaseConfig = {
  apiKey: firebaseApiKey ?? "AIzaSyC1Wr1Vx4el6gE6-r-joY8LT_He0EjGpg0",
  authDomain: "real-state-2ad86.firebaseapp.com",
  projectId: "real-state-2ad86",
  storageBucket: "real-state-2ad86.firebasestorage.app",
  messagingSenderId: "739106929711",
  appId: "1:739106929711:web:b3f3d7c2695eaff5d9dada",
  measurementId: "G-PJSG6NWSGH",
};

const app = initializeApp(firebaseConfig);
isSupported().then((supported) => {
  if (supported) getAnalytics(app);
});

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
const FIRESTORE_TIMEOUT_MS = 10000;
const SITE_SETTINGS_KEY = "auraSiteSettings";

const readJson = <T,>(key: string, fallback: T): T => {
  try {
    return JSON.parse(localStorage.getItem(key) || "null") || fallback;
  } catch {
    return fallback;
  }
};

const writeJson = (key: string, value: unknown) => localStorage.setItem(key, JSON.stringify(value));

export const getCachedSiteSettings = () => readJson<SiteSettings>(SITE_SETTINGS_KEY, defaultSiteSettings);

const withFirestoreTimeout = async <T,>(operation: Promise<T>): Promise<T> => {
  let timeoutId: number | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = window.setTimeout(() => {
      reject(new Error("Firestore request timed out. Local fallback data was saved."));
    }, FIRESTORE_TIMEOUT_MS);
  });

  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timeoutId) window.clearTimeout(timeoutId);
  }
};

const tryFirestoreWrite = async (operation: Promise<unknown>) => {
  try {
    await withFirestoreTimeout(operation);
    return true;
  } catch (error) {
    console.warn(error instanceof Error ? error.message : "Firestore write failed; local data was saved.");
    return false;
  }
};

const profileFromUser = (user: User, extra?: Partial<Profile>): Profile => ({
  uid: user.uid,
  email: user.email || "",
  name: user.displayName || extra?.name || user.email || "Client",
  intent: extra?.intent || "",
  photoURL: user.photoURL || extra?.photoURL || "",
  emailVerified: user.emailVerified || Boolean(extra?.emailVerified),
  isAdmin: extra?.isAdmin === true,
});

const profileFromAccount = async (user: User): Promise<Profile> => {
  try {
    const snapshot = await withFirestoreTimeout(getDoc(doc(db, "users", user.uid)));
    const account = snapshot.exists() ? snapshot.data() : {};
    return profileFromUser(user, {
      name: typeof account.name === "string" ? account.name : undefined,
      intent: typeof account.intent === "string" ? account.intent : undefined,
      photoURL: typeof account.photoURL === "string" ? account.photoURL : undefined,
      isAdmin: account.isAdmin === true,
    });
  } catch {
    return profileFromUser(user);
  }
};

export const getLocalSession = () => readJson<Profile | null>("auraUserSession", null);

export const setLocalSession = (profile: Profile | null) => {
  if (profile) writeJson("auraUserSession", profile);
  else localStorage.removeItem("auraUserSession");
};

export const waitForAuth = () =>
  new Promise<Profile | null>((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      unsubscribe();
      if (!user) {
        setLocalSession(null);
        resolve(null);
        return;
      }
      const profile = await profileFromAccount(user);
      setLocalSession(profile);
      resolve(profile);
    });
  });

const authMessage = (error: unknown) => {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code?: string }).code) : "";
  const message = typeof error === "object" && error && "message" in error ? String((error as { message?: string }).message) : "";
  const messages: Record<string, string> = {
    "auth/configuration-not-found":
      "Firebase Authentication is not configured. Open Firebase Console, start Authentication, and enable Email/Password.",
    "auth/invalid-credential": "Invalid email or password, or the Firebase user does not exist.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication.",
    "auth/email-already-in-use": "This email already exists.",
    "auth/too-many-requests": "Firebase blocked verification emails temporarily because of too many requests. Please wait a few minutes and try again.",
    "auth/unauthorized-continue-uri":
      "Firebase could not send the verification email because this site URL is not authorized in Firebase Authentication settings.",
  };
  if (code.includes("requests-to-this-api") || message.includes("requests-to-this-api")) {
    return "Firebase sign-in was blocked by the configured API key. The site configuration has been repaired; refresh the page and try again.";
  }
  return messages[code] || message || "Firebase Authentication failed.";
};

export async function signIn(login: string, password: string) {
  try {
    const credential = await signInWithEmailAndPassword(auth, login, password);
    await credential.user.reload();
    const profile = await profileFromAccount(credential.user);
    setLocalSession(profile);
    if (!credential.user.emailVerified) return { role: "verify" as const, email: credential.user.email || login };
    return { role: profile.isAdmin ? "admin" as const : "user" as const };
  } catch (error) {
    throw new Error(authMessage(error));
  }
}

export async function signUp(profile: { name: string; email: string; password: string; intent: string }) {
  const credential = await createUserWithEmailAndPassword(auth, profile.email, profile.password);
  await updateProfile(credential.user, { displayName: profile.name });
  let verificationSent = false;
  let verificationError = "";
  try {
    await sendEmailVerification(credential.user);
    verificationSent = true;
  } catch (error) {
    verificationError = authMessage(error);
  }
  await tryFirestoreWrite(
    setDoc(doc(db, "users", credential.user.uid), {
      name: profile.name,
      email: profile.email,
      intent: profile.intent,
      photoURL: "",
      verified: false,
      role: "client",
      createdAt: new Date().toISOString(),
    })
  );
  setLocalSession({
    uid: credential.user.uid,
    email: profile.email,
    name: profile.name,
    intent: profile.intent,
    photoURL: "",
    emailVerified: false,
    isAdmin: false,
  });
  return { requiresVerification: true, email: profile.email, verificationSent, verificationError };
}

export async function sendCurrentUserVerificationEmail() {
  if (!auth.currentUser) throw new Error("Create an account or sign in before requesting a verification email.");
  await sendEmailVerification(auth.currentUser);
  return auth.currentUser.email || "";
}

export async function logout() {
  await signOut(auth);
  setLocalSession(null);
}

export async function getProperties(): Promise<Property[]> {
  try {
    const snapshot = await withFirestoreTimeout(getDocs(collection(db, "properties")));
    const properties = snapshot.docs.map((item) => ({ slug: item.id, ...item.data() }) as Property);
    return properties.length ? properties : readJson("auraProperties", defaultProperties);
  } catch {
    return readJson("auraProperties", defaultProperties);
  }
}

export async function saveProperty(property: Property) {
  const properties = (await getProperties()).filter((item) => item.slug !== property.slug).concat(property);
  writeJson("auraProperties", properties);
  await tryFirestoreWrite(setDoc(doc(db, "properties", property.slug), { ...property, updatedAt: new Date().toISOString() }));
  return properties;
}

export async function uploadPropertyImage(file: File, propertySlug: string) {
  if (!auth.currentUser || !isAdmin(getLocalSession())) {
    throw new Error("An isAdmin account is required before uploading unit images.");
  }
  if (!file.type.startsWith("image/")) throw new Error("Only image files can be uploaded for unit galleries.");

  const safeName = file.name.toLowerCase().replace(/[^a-z0-9.]+/g, "-");
  const imageRef = ref(storage, `property-images/${propertySlug}/${Date.now()}-${safeName}`);
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type,
    customMetadata: {
      originalName: file.name,
      propertySlug,
    },
  });

  return getDownloadURL(snapshot.ref);
}

export async function deleteProperty(slug: string) {
  const user = auth.currentUser;
  if (!user || !isAdmin(getLocalSession())) {
    throw new Error("An authenticated isAdmin account is required to remove units.");
  }
  await user.getIdToken(true);
  const properties = (await getProperties()).filter((item) => item.slug !== slug);
  try {
    await withFirestoreTimeout(deleteDoc(doc(db, "properties", slug)));
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Firestore rejected the deletion.";
    throw new Error(`The unit was not deleted from Firestore. ${detail}`);
  }
  writeJson("auraProperties", properties);
  return properties;
}

export async function seedDefaults() {
  await tryFirestoreWrite(Promise.all(defaultProperties.map((property) => setDoc(doc(db, "properties", property.slug), property))));
  writeJson("auraProperties", defaultProperties);
  return defaultProperties;
}

export async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const snap = await withFirestoreTimeout(getDoc(doc(db, "siteSettings", "main")));
    if (snap.exists()) {
      const settings = { ...defaultSiteSettings, ...snap.data() } as SiteSettings;
      writeJson(SITE_SETTINGS_KEY, settings);
      return settings;
    }
    return getCachedSiteSettings();
  } catch {
    return getCachedSiteSettings();
  }
}

export async function saveSiteSettings(settings: SiteSettings) {
  writeJson(SITE_SETTINGS_KEY, settings);
  await tryFirestoreWrite(setDoc(doc(db, "siteSettings", "main"), settings));
  return settings;
}

export async function submitRentalRequest(request: RentalRequest) {
  const payload = { ...request, createdAt: new Date().toISOString(), status: "new" };
  const local = readJson<RentalRequest[]>("auraRentalRequests", []);
  writeJson("auraRentalRequests", local.concat(payload));
  const synced = await tryFirestoreWrite(addDoc(collection(db, "rentalRequests"), payload));
  return { synced, payload };
}

export async function submitAdvisorRequest(request: AdvisorRequest) {
  const user = auth.currentUser;
  if (!user) throw new Error("Sign in before sending a private advisor request.");

  const payload: AdvisorRequest = {
    ...request,
    userId: user.uid,
    userEmail: user.email || request.email,
    firebaseCollection: "advisorRequests",
    createdAt: new Date().toISOString(),
    status: "new",
  };

  const local = readJson<AdvisorRequest[]>("auraAdvisorRequests", []);
  writeJson("auraAdvisorRequests", local.concat(payload));
  const synced = await tryFirestoreWrite(addDoc(collection(db, "advisorRequests"), payload));
  return { synced, payload };
}

export async function submitExploreLead(lead: ExploreLead) {
  const payload: ExploreLead = {
    ...lead,
    userId: lead.userId || auth.currentUser?.uid || "guest",
    userEmail: lead.userEmail || auth.currentUser?.email || "",
    createdAt: new Date().toISOString(),
    status: "new",
  };

  const local = readJson<ExploreLead[]>("auraExploreMapLeads", []);
  writeJson("auraExploreMapLeads", local.concat(payload));

  const crmEndpoint = import.meta.env.VITE_CRM_LEAD_ENDPOINT as string | undefined;
  if (crmEndpoint) {
    try {
      await fetch(crmEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } catch (error) {
      console.warn(error instanceof Error ? error.message : "CRM lead post failed; local lead was saved.");
    }
  }

  const synced = await tryFirestoreWrite(addDoc(collection(db, "exploreMapLeads"), payload));
  return { synced, payload };
}

export async function getManagedRequests(): Promise<ManagedRequest[]> {
  const localAdvisor = readJson<AdvisorRequest[]>("auraAdvisorRequests", []).map((item, index) => ({
    ...item,
    id: item.id || `local-advisor-${index + 1}`,
    collection: "advisorRequests" as const,
  }));
  const localRental = readJson<RentalRequest[]>("auraRentalRequests", []).map((item, index) => ({
    ...item,
    id: `local-rental-${index + 1}`,
    collection: "rentalRequests" as const,
  }));

  try {
    const [advisorSnapshot, rentalSnapshot] = await Promise.all([
      withFirestoreTimeout(getDocs(collection(db, "advisorRequests"))),
      withFirestoreTimeout(getDocs(collection(db, "rentalRequests"))),
    ]);

    return [
      ...advisorSnapshot.docs.map((item) => ({
        id: item.id,
        collection: "advisorRequests" as const,
        ...item.data(),
      })),
      ...rentalSnapshot.docs.map((item) => ({
        id: item.id,
        collection: "rentalRequests" as const,
        ...item.data(),
      })),
    ] as ManagedRequest[];
  } catch {
    return [...localAdvisor, ...localRental];
  }
}

export async function updateManagedRequestStatus(request: ManagedRequest, status: string) {
  const updated = { ...request, status, updatedAt: new Date().toISOString() };
  if (!request.id.startsWith("local-")) {
    await tryFirestoreWrite(setDoc(doc(db, request.collection, request.id), updated, { merge: true }));
  }
  return updated;
}

export async function deleteManagedRequest(request: ManagedRequest) {
  if (!request.id.startsWith("local-")) {
    await withFirestoreTimeout(deleteDoc(doc(db, request.collection, request.id)));
  }

  const cacheKey = request.collection === "advisorRequests" ? "auraAdvisorRequests" : "auraRentalRequests";
  const cached = readJson<(AdvisorRequest | RentalRequest)[]>(cacheKey, []);
  const filtered = cached.filter((item, index) => {
    const localId = request.collection === "advisorRequests"
      ? ("id" in item && item.id) || `local-advisor-${index + 1}`
      : `local-rental-${index + 1}`;
    const sameCreatedAt = Boolean(request.createdAt && item.createdAt === request.createdAt);
    const sameContact = (item.email || "") === (request.email || request.userEmail || "");
    return localId !== request.id && !(sameCreatedAt && sameContact);
  });
  writeJson(cacheKey, filtered);
}

export async function uploadProfileImage(file: File) {
  if (!auth.currentUser) throw new Error("Sign in before uploading a profile image.");
  if (!file.type.startsWith("image/")) throw new Error("Choose a valid image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Profile images must be smaller than 5 MB.");

  const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const imageRef = ref(storage, `profile-images/${auth.currentUser.uid}/avatar-${Date.now()}.${extension}`);
  const snapshot = await uploadBytes(imageRef, file, {
    contentType: file.type,
    cacheControl: "public,max-age=31536000,immutable",
    customMetadata: { ownerId: auth.currentUser.uid },
  });
  return getDownloadURL(snapshot.ref);
}

export async function updateProfileData(profile: Pick<Profile, "name" | "intent" | "photoURL">) {
  if (!auth.currentUser) throw new Error("Sign in before updating your profile.");
  await updateProfile(auth.currentUser, { displayName: profile.name, photoURL: profile.photoURL || "" });
  await tryFirestoreWrite(
    setDoc(
      doc(db, "users", auth.currentUser.uid),
      {
        name: profile.name,
        email: auth.currentUser.email,
        intent: profile.intent || "",
        photoURL: profile.photoURL || "",
        verified: auth.currentUser.emailVerified,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    )
  );
  const updated = profileFromUser(auth.currentUser, { ...profile, isAdmin: getLocalSession()?.isAdmin === true });
  setLocalSession(updated);
  return updated;
}

export const hasPrivateAccess = (profile: Profile | null) =>
  Boolean(profile?.emailVerified);

export const isAdmin = (profile: Profile | null | undefined) => profile?.isAdmin === true;
