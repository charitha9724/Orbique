import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

import type { Category, Condition } from '@/constants/listings';
import { supabase } from '@/lib/supabase';

// Everything the app does with listings in the database lives here.

const BUCKET = 'listing-photos';

export type FeedItem = {
  id: string;
  seller_id: string;
  seller_name: string;
  title: string;
  price: number;
  category: Category;
  condition: Condition;
  photos: string[];
  area: string | null;
  created_at: string;
  distance_km: number;
};

export type ListingDetails = {
  id: string;
  seller_id: string;
  title: string;
  description: string;
  price: number;
  category: Category;
  condition: Condition;
  photos: string[];
  status: 'active' | 'sold' | 'removed';
  lat: number | null;
  lng: number | null;
  area: string | null;
  created_at: string;
  seller: { display_name: string } | null;
};

export type FeedSort = 'newest' | 'nearest' | 'price_low' | 'price_high';

export type FeedFilters = {
  search?: string;
  category?: Category | null;
  sort?: FeedSort;
  minPrice?: number | null;
  maxPrice?: number | null;
};

/** A photo in the post/edit form: either already uploaded, or just picked from the device. */
export type FormPhoto = { kind: 'stored'; path: string } | { kind: 'new'; uri: string };

/** Items for sale near the logged-in person (distance comes from their profile). */
export async function fetchFeed({ search, category, sort, minPrice, maxPrice }: FeedFilters): Promise<FeedItem[]> {
  const args: Record<string, unknown> = {
    search_text: search?.trim() || null,
    category_filter: category ?? null,
  };
  // Only send sort/price when used, so the feed still works before that database update is run.
  if (sort && sort !== 'newest') args.sort_by = sort;
  if (minPrice != null) args.min_price = minPrice;
  if (maxPrice != null) args.max_price = maxPrice;
  const { data, error } = await supabase.rpc('nearby_listings', args);
  if (error) throw new Error(error.message);
  return (data ?? []) as FeedItem[];
}

/** One listing with its seller's name. */
export async function fetchListing(id: string): Promise<ListingDetails | null> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, seller_id, title, description, price, category, condition, photos, status, lat, lng, area, created_at, seller:profiles(display_name)',
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data as ListingDetails | null;
}

/** The logged-in person's own listings (any status). */
export async function fetchMyListings(userId: string): Promise<ListingDetails[]> {
  const { data, error } = await supabase
    .from('listings')
    .select(
      'id, seller_id, title, description, price, category, condition, photos, status, lat, lng, area, created_at, seller:profiles(display_name)',
    )
    .eq('seller_id', userId)
    .neq('status', 'removed')
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as ListingDetails[];
}

export async function setListingStatus(id: string, status: 'active' | 'sold' | 'removed') {
  const { error } = await supabase.from('listings').update({ status }).eq('id', id);
  if (error) throw new Error(error.message);
}

/** Straight-line distance in km between two map positions. */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a =
    Math.sin(rad(lat2 - lat1) / 2) ** 2 +
    Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(a));
}

/** Web address of a stored photo. */
export function photoUrl(path: string): string {
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}

/** Shrink a picked photo to about 1200 px wide, as JPEG bytes ready to upload. */
export async function shrinkPhoto(uri: string): Promise<ArrayBuffer> {
  const small = await manipulateAsync(uri, [{ resize: { width: 1200 } }], {
    compress: 0.75,
    format: SaveFormat.JPEG,
  });
  return (await fetch(small.uri)).arrayBuffer();
}

/** Shrink a picked photo and upload it. Returns its storage path. */
async function uploadPhoto(userId: string, uri: string): Promise<string> {
  const body = await shrinkPhoto(uri);
  const path = `${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.jpg`;
  const { error } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: 'image/jpeg',
    upsert: false,
  });
  if (error) throw new Error(`Photo upload failed: ${error.message}`);
  return path;
}

/**
 * Save changes to one of your items. New photos are uploaded first; photos you
 * removed are deleted from storage after the item is saved.
 */
export async function updateListing(
  userId: string,
  listingId: string,
  values: { title: string; description: string; price: number; category: Category; condition: Condition },
  photos: FormPhoto[],
  previousPaths: string[],
): Promise<void> {
  const uploaded: string[] = [];
  try {
    const finalPaths: string[] = [];
    for (const p of photos) {
      if (p.kind === 'stored') finalPaths.push(p.path);
      else {
        const path = await uploadPhoto(userId, p.uri);
        uploaded.push(path);
        finalPaths.push(path);
      }
    }
    const { error } = await supabase
      .from('listings')
      .update({ ...values, photos: finalPaths })
      .eq('id', listingId)
      .eq('seller_id', userId);
    if (error) throw new Error(error.message);
    const removed = previousPaths.filter((p) => !finalPaths.includes(p));
    if (removed.length) await supabase.storage.from(BUCKET).remove(removed);
  } catch (e) {
    if (uploaded.length) await supabase.storage.from(BUCKET).remove(uploaded);
    throw e;
  }
}

export type NewListing = {
  title: string;
  description: string;
  price: number;
  category: Category;
  condition: Condition;
  /** Local photo addresses from the photo picker. */
  photoUris: string[];
};

/** Upload the photos, then save the listing. Returns the new listing's id. */
export async function createListing(userId: string, listing: NewListing): Promise<string> {
  const photos: string[] = [];
  try {
    for (const uri of listing.photoUris) photos.push(await uploadPhoto(userId, uri));
    const { data, error } = await supabase
      .from('listings')
      .insert({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        category: listing.category,
        condition: listing.condition,
        photos,
      })
      .select('id')
      .single();
    if (error) throw new Error(error.message);
    return data.id as string;
  } catch (e) {
    // Don't leave orphan photos behind if saving failed.
    if (photos.length) await supabase.storage.from(BUCKET).remove(photos);
    throw e;
  }
}
