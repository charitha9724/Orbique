// Fixed choices for listings. These must match the checks in
// supabase/migrations/0003_listings.sql.
export const CATEGORIES = ['Books', 'Electronics', 'Furniture', 'Clothing', 'Other'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS = {
  Books: 'book-outline',
  Electronics: 'laptop-outline',
  Furniture: 'bed-outline',
  Clothing: 'shirt-outline',
  Other: 'cube-outline',
} as const satisfies Record<Category, string>;

export const CONDITIONS = ['New', 'Like new', 'Good', 'Fair'] as const;
export type Condition = (typeof CONDITIONS)[number];

export const MAX_PHOTOS = 5;

/** 1500 -> "₹1,500"; 0 -> "Free". */
export function formatPrice(rupees: number): string {
  if (rupees === 0) return 'Free';
  return `₹${rupees.toLocaleString('en-IN')}`;
}

/** 0.4 -> "under 1 km away"; 3.27 -> "3 km away". */
export function formatDistance(km: number | null | undefined): string {
  if (km == null) return '';
  if (km < 1) return 'under 1 km away';
  return `${Math.round(km)} km away`;
}

/** "5 min ago", "3 h ago", "2 days ago". */
export function timeAgo(iso: string): string {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
