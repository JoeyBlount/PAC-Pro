/**
 * Year range utilities for dropdowns across the site.
 * Provides dynamic year ranges that include 1 year forward and extend back
 * to either 10 years or the earliest year with data (whichever is earlier).
 */

import { useState, useEffect, useCallback } from 'react';
import { apiUrl } from './api';
import { auth } from '../config/firebase-config';

/**
 * Get the default year range (1 year forward + 10 years back) without API call.
 * Use this for immediate rendering before API data is available.
 * @returns {number[]} Array of years from next year down to 10 years ago
 */
export function getDefaultYearRange() {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  const earliestDefault = currentYear - 10;
  
  const years = [];
  for (let y = nextYear; y >= earliestDefault; y--) {
    years.push(y);
  }
  return years;
}

/**
 * Get current year
 * @returns {number} Current year
 */
export function getCurrentYear() {
  return new Date().getFullYear();
}

/**
 * Get next year (for future projections)
 * @returns {number} Next year
 */
export function getNextYear() {
  return new Date().getFullYear() + 1;
}

/**
 * Fetch the earliest year with data from the backend API.
 * @param {string} storeId - The store ID to check for data
 * @returns {Promise<{earliestYear: number, currentYear: number, nextYear: number}>}
 */
export async function fetchEarliestYear(storeId) {
  const currentYear = new Date().getFullYear();
  const defaults = {
    earliestYear: currentYear - 10,
    currentYear: currentYear,
    nextYear: currentYear + 1
  };

  if (!storeId) {
    return defaults;
  }

  try {
    const token = await auth.currentUser?.getIdToken();
    const response = await fetch(apiUrl(`/api/pac/system/earliest-year/${storeId}`), {
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      console.warn(`Failed to fetch earliest year for store ${storeId}: ${response.status}`);
      return defaults;
    }

    const data = await response.json();
    return {
      earliestYear: data.earliest_year || defaults.earliestYear,
      currentYear: data.current_year || defaults.currentYear,
      nextYear: data.next_year || defaults.nextYear
    };
  } catch (error) {
    console.warn('Error fetching earliest year:', error);
    return defaults;
  }
}

/**
 * Generate year array from next year down to earliest year.
 * @param {number} earliestYear - The earliest year to include
 * @returns {number[]} Array of years in descending order
 */
export function generateYearRange(earliestYear) {
  const currentYear = new Date().getFullYear();
  const nextYear = currentYear + 1;
  
  const years = [];
  for (let y = nextYear; y >= earliestYear; y--) {
    years.push(y);
  }
  return years;
}

/**
 * React hook for dynamic year range based on store data.
 * 
 * @param {string} storeId - The store ID to fetch earliest year for
 * @returns {{
 *   years: number[],
 *   loading: boolean,
 *   error: Error | null,
 *   earliestYear: number,
 *   currentYear: number,
 *   nextYear: number,
 *   refetch: () => void
 * }}
 */
export function useYearRange(storeId) {
  const [years, setYears] = useState(getDefaultYearRange);
  const [earliestYear, setEarliestYear] = useState(() => new Date().getFullYear() - 10);
  const [currentYear] = useState(() => new Date().getFullYear());
  const [nextYear] = useState(() => new Date().getFullYear() + 1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchYears = useCallback(async () => {
    if (!storeId) {
      // No store selected, use defaults
      setYears(getDefaultYearRange());
      setEarliestYear(new Date().getFullYear() - 10);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await fetchEarliestYear(storeId);
      const yearArray = generateYearRange(data.earliestYear);
      setYears(yearArray);
      setEarliestYear(data.earliestYear);
    } catch (err) {
      console.error('Error in useYearRange:', err);
      setError(err);
      // Keep using default years on error
      setYears(getDefaultYearRange());
      setEarliestYear(new Date().getFullYear() - 10);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  useEffect(() => {
    fetchYears();
  }, [fetchYears]);

  return {
    years,
    loading,
    error,
    earliestYear,
    currentYear,
    nextYear,
    refetch: fetchYears
  };
}

/**
 * Generate year options for Select components (with value/label format).
 * Includes an optional "All Years" option.
 * 
 * @param {number[]} years - Array of years
 * @param {boolean} includeAllOption - Whether to include "All Years" option
 * @returns {{value: string, label: string}[]}
 */
export function generateYearOptions(years, includeAllOption = false) {
  const options = years.map(y => ({
    value: String(y),
    label: String(y)
  }));

  if (includeAllOption) {
    return [{ value: '', label: 'All Years' }, ...options];
  }

  return options;
}

/**
 * React hook for year options formatted for Select components.
 * 
 * @param {string} storeId - The store ID to fetch earliest year for
 * @param {boolean} includeAllOption - Whether to include "All Years" option
 * @returns {{
 *   yearOptions: {value: string, label: string}[],
 *   years: number[],
 *   loading: boolean,
 *   error: Error | null
 * }}
 */
export function useYearOptions(storeId, includeAllOption = false) {
  const { years, loading, error, ...rest } = useYearRange(storeId);
  
  const yearOptions = generateYearOptions(years, includeAllOption);

  return {
    yearOptions,
    years,
    loading,
    error,
    ...rest
  };
}

