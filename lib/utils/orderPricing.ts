/**
 * Utility functions for handling order actual_price from staff input details
 */

export interface StaffInputDetail {
  staff_member: string;
  staff_role: 'Washer' | 'Folder' | 'Fumigator';
  items?: number;
  weight_kg?: number;
  description?: string;
  actual_price?: number | null;
  status_recorded?: string;
  recorded_at?: string;
}

/**
 * Extract the latest actual_price from staff_input_details array
 * Returns the most recently recorded price by any staff member
 */
export function getLatestActualPrice(
  staffInputDetails?: StaffInputDetail[] | null
): number | null {
  if (!staffInputDetails || staffInputDetails.length === 0) {
    return null;
  }

  // Find the entry with actual_price set and most recent recorded_at
  let latestEntry: StaffInputDetail | null = null;

  for (const detail of staffInputDetails) {
    if (detail.actual_price !== undefined && detail.actual_price !== null) {
      if (
        !latestEntry ||
        !latestEntry.recorded_at ||
        !detail.recorded_at ||
        new Date(detail.recorded_at) > new Date(latestEntry.recorded_at)
      ) {
        latestEntry = detail;
      }
    }
  }

  return latestEntry?.actual_price ?? null;
}

/**
 * Get staff member info who set the actual_price
 */
export function getActualPriceStaffInfo(
  staffInputDetails?: StaffInputDetail[] | null
): { staffMember: string; role: string; recordedAt: string } | null {
  if (!staffInputDetails || staffInputDetails.length === 0) {
    return null;
  }

  let latestEntry: StaffInputDetail | null = null;

  for (const detail of staffInputDetails) {
    if (detail.actual_price !== undefined && detail.actual_price !== null) {
      if (
        !latestEntry ||
        !latestEntry.recorded_at ||
        !detail.recorded_at ||
        new Date(detail.recorded_at) > new Date(latestEntry.recorded_at)
      ) {
        latestEntry = detail;
      }
    }
  }

  if (!latestEntry) {
    return null;
  }

  return {
    staffMember: latestEntry.staff_member,
    role: latestEntry.staff_role,
    recordedAt: latestEntry.recorded_at || '',
  };
}

/**
 * Format actual price for display
 */
export function formatActualPrice(price: number | string | null | undefined): string {
  if (!price) {
    return 'Not set';
  }

  const numPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numPrice)) {
    return 'Not set';
  }

  return `KSh ${numPrice.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
}
