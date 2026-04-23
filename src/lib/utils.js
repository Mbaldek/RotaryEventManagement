import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
} 


export const isIframe = window.self !== window.top;

// Default capacity used when a table has no explicit seat_count.
const DEFAULT_PRESIDENTIAL_SEATS = 12;
const DEFAULT_TABLE_SEATS = 8;

export function getTableCapacity(table) {
  if (!table) return DEFAULT_TABLE_SEATS;
  if (typeof table.seat_count === "number" && table.seat_count > 0) {
    return table.seat_count;
  }
  return table.is_presidential ? DEFAULT_PRESIDENTIAL_SEATS : DEFAULT_TABLE_SEATS;
}

export const SEAT_COUNT_MIN = 4;
export const SEAT_COUNT_MAX = 16;
