/**
 * Formats requirement IDs for URL usage
 * Converts spaces to hyphens and makes lowercase
 * Example: "UR 378" -> "ur-378"
 */
export function formatIdForUrl(id: string): string {
  return id.toLowerCase().replace(/\s+/g, '-')
}

/**
 * Parses URL-formatted IDs back to original format
 * Converts hyphens to spaces and makes uppercase
 * Example: "ur-378" -> "UR 378"
 */
export function parseIdFromUrl(urlId: string): string {
  return urlId.toUpperCase().replace(/-/g, ' ')
}

/**
 * Formats a date string or Date object to a human-readable format
 * Example: "2024-01-15T10:30:00Z" -> "Jan 15, 2024, 10:30 AM"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) {return '-';}

  const dateObj = typeof date === 'string' ? new Date(date) : date;

  if (isNaN(dateObj.getTime())) {return '-';}

  return dateObj.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Formats a date to relative time (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(date: string | Date | null | undefined): string {
  if (!date) {return '-';}

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - dateObj.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 7) {
    return formatDate(date);
  } else if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else if (diffMins > 0) {
    return `${diffMins} minute${diffMins === 1 ? '' : 's'} ago`;
  } else {
    return 'Just now';
  }
}