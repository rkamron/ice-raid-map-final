/**
 * Format a date string in "Month Day, Year" format
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format a date string in "Month Day, Year at HH:MM AM/PM" format
 */
export function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Get a relative time string (e.g., "2 days ago")
 */
export function getRelativeTimeString(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffInMs = now.getTime() - date.getTime();
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
  
  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'just now' : `${diffInMinutes} minutes ago`;
    }
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  } else if (diffInDays === 1) {
    return 'yesterday';
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`;
  } else if (diffInDays < 30) {
    const diffInWeeks = Math.floor(diffInDays / 7);
    return diffInWeeks === 1 ? '1 week ago' : `${diffInWeeks} weeks ago`;
  } else {
    return formatDate(dateString);
  }
}

/**
 * Get a date string for a specific number of days ago
 */
export function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0]; // Format as YYYY-MM-DD
}

/**
 * Get an array of dates for filtering
 */
export const dateRangeOptions = [
  { label: 'Past 7 days', value: 'past7days', days: 7 },
  { label: 'Past 14 days', value: 'past14days', days: 14 },
  { label: 'Past 30 days', value: 'past30days', days: 30 },
  { label: 'Custom range', value: 'custom' }
];
