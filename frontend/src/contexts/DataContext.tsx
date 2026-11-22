import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import * as vendorService from '@/services/vendorService';
import * as menuService from '@/services/menuService';
import * as offerService from '@/services/offerService';
import * as eventService from '@/services/eventService';
import * as foodTrailService from '@/services/foodTrailService';
import type { Vendor, MenuItem, Offer, EventItem, FoodTrail } from '@/types';

interface NewVendorInput { name: string; phone: string; area: string; address: string; lat: number; lng: number; }
interface DataContextValue {
  vendors: Vendor[];
  getVendorById: (id: string) => Vendor | undefined;
  getSimilarVendors: (vendor: Vendor, limit?: number) => Vendor[];
  offers: Offer[];
  events: EventItem[];
  foodTrails: FoodTrail[];
  addVendor: (input: NewVendorInput) => Promise<Vendor>;
  updateVendorSettings: (vendorId: string, updates: Record<string, unknown>) => Promise<void>;
  addMenuItem: (vendorId: string, item: Omit<MenuItem, 'id'>) => Promise<void>;
  // atomic update instead of delete-then-create
  updateMenuItem: (vendorId: string, itemId: string, updates: Partial<Omit<MenuItem, 'id'>>) => Promise<void>;
  deleteMenuItem: (vendorId: string, itemId: string) => Promise<void>;
  addOffer: (offer: Omit<Offer, 'id'>) => Promise<void>;
  deleteOffer: (offerId: string) => Promise<void>;
  addEvent: (input: Record<string, unknown>) => Promise<EventItem>;
  updateEvent: (id: string, updates: Record<string, unknown>) => Promise<EventItem>;
  deleteEvent: (id: string) => Promise<void>;
  addFoodTrail: (input: Record<string, unknown>) => Promise<FoodTrail>;
  updateFoodTrail: (id: string, updates: Record<string, unknown>) => Promise<FoodTrail>;
  deleteFoodTrail: (id: string) => Promise<void>;
  remoteLoading: boolean;
  remoteError: Error | null;
  reloadVendors: () => Promise<void>;
  fetchVendor: (id: string) => Promise<Vendor | undefined>;
}

const DataContext = createContext<DataContextValue | undefined>(undefined);

// Page size per request (server MAX_LIMIT is 50). The context now
// loops through every page instead of fetching once and silently
// truncating at 50 — see loadAllVendorPages() below.
const VENDOR_PAGE_SIZE = 50;
// Safety cap so a runaway pagination bug can never spin forever.
const MAX_VENDOR_PAGES = 20;

/**
 * Fetches every page of vendors (up to MAX_VENDOR_PAGES) and merges
 * them into one array, instead of the old single `limit=50` fetch that
 * silently dropped any vendor beyond the first 50 from Explore, Search,
 * Map, and admin counts.
 */
async function loadAllVendorPages(): Promise<Vendor[]> {
  const first = await vendorService.listVendors(`limit=${VENDOR_PAGE_SIZE}&page=1`);
  const all = [...first.vendors];
  const totalPages = first.pagination?.totalPages ?? 1;
  const pagesToFetch = Math.min(totalPages, MAX_VENDOR_PAGES);

  if (pagesToFetch > 1) {
    const rest = await Promise.all(
      Array.from({ length: pagesToFetch - 1 }, (_, i) =>
        vendorService.listVendors(`limit=${VENDOR_PAGE_SIZE}&page=${i + 2}`),
      ),
    );
    for (const page of rest) all.push(...page.vendors);
  }
  return all;
}

// The last successful load is kept in the browser so a return visit shows
// the whole site instantly while fresh data is fetched in the background.
const CACHE_KEY = 'streetside:data:v1';
interface CachedData { vendors: Vendor[]; offers: Offer[]; events: EventItem[]; foodTrails: FoodTrail[] }

function readCache(): CachedData | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CachedData;
    return Array.isArray(data.vendors) && data.vendors.length > 0 ? data : null;
  } catch {
    return null;
  }
}

export function DataProvider({ children }: { children: ReactNode }) {
  const [cached] = useState(readCache);
  const [vendors, setVendors] = useState<Vendor[]>(cached?.vendors ?? []);
  const [offers, setOffers] = useState<Offer[]>(cached?.offers ?? []);
  const [events, setEvents] = useState<EventItem[]>(cached?.events ?? []);
  const [foodTrails, setFoodTrails] = useState<FoodTrail[]>(cached?.foodTrails ?? []);
  const [remoteLoading, setRemoteLoading] = useState(!cached);
  const [remoteError, setRemoteError] = useState<Error | null>(null);

  const loadRemoteData = useCallback(async () => {
    // Don't blank the page with a spinner if there is already data on screen.
    setRemoteLoading((current) => current && !cached);
    setRemoteError(null);
    try {
      // Vendors are the core of nearly every page, so a failure there is
      // surfaced as the page-level error. Offers/events/trails are
      // secondary — if one of those fails, degrade to an empty list for
      // that feature rather than blocking the whole app on it.
      const [vendorList, offerList, eventList, trailList] = await Promise.all([
        loadAllVendorPages(),
        offerService.listOffers().catch(() => []),
        eventService.listEvents().catch(() => []),
        foodTrailService.listFoodTrails().catch(() => []),
      ]);
      setVendors(vendorList);
      setOffers(offerList);
      setEvents(eventList);
      setFoodTrails(trailList);
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify({ vendors: vendorList, offers: offerList, events: eventList, foodTrails: trailList }));
      } catch { /* storage full or blocked: the cache is optional */ }
    } catch (err) {
      setRemoteError(err instanceof Error ? err : new Error('Failed to load StreetSide data'));
    } finally {
      setRemoteLoading(false);
    }
  }, [cached]);

  useEffect(() => {
    loadRemoteData();
  }, [loadRemoteData]);

  const getVendorById = useCallback((id: string) => vendors.find((vendor) => vendor.id === id), [vendors]);

  const fetchVendor = useCallback(async (id: string): Promise<Vendor | undefined> => {
    const cached = vendors.find((vendor) => vendor.id === id);
    if (cached) return cached;
    try {
      const vendor = await vendorService.getVendor(id);
      setVendors((current) => (current.some((v) => v.id === vendor.id) ? current : [...current, vendor]));
      return vendor;
    } catch {
      return undefined;
    }
  }, [vendors]);

  const getSimilarVendors = useCallback((vendor: Vendor, limit = 3) => vendors
    .filter((candidate) => candidate.id !== vendor.id && (candidate.cuisine === vendor.cuisine || candidate.categories.some((category) => vendor.categories.includes(category))))
    .slice(0, limit), [vendors]);

  const addVendor = useCallback(async (input: NewVendorInput) => {
    const created = await vendorService.createVendor({
      name: input.name, phone: input.phone, cuisine: 'Street Food', categories: [],
      description: `${input.name} on StreetSide.`,
      image: 'https://images.pexels.com/photos/2696064/pexels-photo-2696064.jpeg?auto=compress&cs=tinysrgb&w=800',
      // The vendor's own picked map location (see VendorRegisterPage) —
      // no fallback to a fixed coordinate here.
      location: { address: input.address || input.area, area: input.area, lat: input.lat, lng: input.lng },
      hours: { open: '09:00', close: '21:00' }, veg: 'both',
    });
    setVendors((current) => [...current, created]);
    return created;
  }, []);

  const updateVendorSettings = useCallback(async (vendorId: string, updates: Record<string, unknown>) => {
    const updated = await vendorService.updateVendor(vendorId, updates);
    setVendors((current) => current.map((vendor) => {
      if (vendor.id !== vendorId) return vendor;
      // If the server response is missing/empty menu (e.g. an
      // older backend build, or populate failing), preserve the
      // previously-known menu instead of silently wiping it to [].
      const menu = (Array.isArray(updated.menu) && updated.menu.length > 0)
        ? updated.menu
        : vendor.menu;
      return { ...updated, menu };
    }));
  }, []);

  const addMenuItem = useCallback(async (vendorId: string, item: Omit<MenuItem, 'id'>) => {
    const created = await menuService.addMenuItem(vendorId, item);
    setVendors((current) => current.map((vendor) => vendor.id === vendorId ? { ...vendor, menu: [...vendor.menu, created] } : vendor));
  }, []);

  // Atomic update via existing PUT /menu/:id — replaces the old
  // delete-then-create flow that lost the item's id and had no error
  // handling (a failed create meant the item vanished entirely).
  const updateMenuItem = useCallback(async (
    vendorId: string,
    itemId: string,
    updates: Partial<Omit<MenuItem, 'id'>>,
  ) => {
    const updated = await menuService.updateMenuItem(itemId, updates);
    setVendors((current) => current.map((vendor) =>
      vendor.id === vendorId
        ? { ...vendor, menu: vendor.menu.map((item) => (item.id === itemId ? updated : item)) }
        : vendor,
    ));
  }, []);

  const deleteMenuItem = useCallback(async (vendorId: string, itemId: string) => {
    await menuService.deleteMenuItem(itemId);
    setVendors((current) => current.map((vendor) => vendor.id === vendorId ? { ...vendor, menu: vendor.menu.filter((item) => item.id !== itemId) } : vendor));
  }, []);

  const addOffer = useCallback(async (offer: Omit<Offer, 'id'>) => {
    const created = await offerService.createOffer(offer);
    setOffers((current) => [...current, created]);
  }, []);

  const deleteOffer = useCallback(async (offerId: string) => {
    await offerService.deleteOffer(offerId);
    setOffers((current) => current.filter((offer) => offer.id !== offerId));
  }, []);

  const addEvent = useCallback(async (input: Record<string, unknown>) => {
    const created = await eventService.createEvent(input);
    setEvents((current) => [...current, created as EventItem]);
    return created as EventItem;
  }, []);

  const updateEvent = useCallback(async (id: string, updates: Record<string, unknown>) => {
    const updated = await eventService.updateEvent(id, updates);
    setEvents((current) => current.map((event) => (event.id === id ? (updated as EventItem) : event)));
    return updated as EventItem;
  }, []);

  const deleteEvent = useCallback(async (id: string) => {
    await eventService.deleteEvent(id);
    setEvents((current) => current.filter((event) => event.id !== id));
  }, []);

  const addFoodTrail = useCallback(async (input: Record<string, unknown>) => {
    const created = await foodTrailService.createFoodTrail(input);
    setFoodTrails((current) => [...current, created]);
    return created;
  }, []);

  const updateFoodTrail = useCallback(async (id: string, updates: Record<string, unknown>) => {
    const updated = await foodTrailService.updateFoodTrail(id, updates);
    setFoodTrails((current) => current.map((trail) => (trail.id === id ? updated : trail)));
    return updated;
  }, []);

  const deleteFoodTrail = useCallback(async (id: string) => {
    await foodTrailService.deleteFoodTrail(id);
    setFoodTrails((current) => current.filter((trail) => trail.id !== id));
  }, []);

  const value = useMemo(() => ({
    vendors, getVendorById, getSimilarVendors, offers, events, foodTrails,
    addVendor, updateVendorSettings, addMenuItem, updateMenuItem, deleteMenuItem, addOffer, deleteOffer,
    addEvent, updateEvent, deleteEvent, addFoodTrail, updateFoodTrail, deleteFoodTrail,
    remoteLoading, remoteError, reloadVendors: loadRemoteData, fetchVendor,
  }), [vendors, getVendorById, getSimilarVendors, offers, events, foodTrails, addVendor, updateVendorSettings, addMenuItem, updateMenuItem, deleteMenuItem, addOffer, deleteOffer, addEvent, updateEvent, deleteEvent, addFoodTrail, updateFoodTrail, deleteFoodTrail, remoteLoading, remoteError, loadRemoteData, fetchVendor]);

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

export function useData() {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData must be used within DataProvider');
  return context;
}
