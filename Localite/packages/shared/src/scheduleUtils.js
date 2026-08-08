export const SCHEDULE_OPTIONS = [
  { key: 'asap', label: 'As soon as possible', window: null },
  { key: 'today_pm', label: 'Today 4–6 PM', window: 'Today 4-6 PM' },
  { key: 'tomorrow_am', label: 'Tomorrow 9–11 AM', window: 'Tomorrow 9-11 AM' },
  { key: 'tomorrow_pm', label: 'Tomorrow 4–6 PM', window: 'Tomorrow 4-6 PM' },
];

export function parseScheduledFor(scheduledWindow, scheduledFor) {
  if (scheduledFor) {
    const date = new Date(scheduledFor);
    if (!Number.isNaN(date.getTime())) return date;
  }
  if (!scheduledWindow?.trim()) return null;

  const now = new Date();
  const target = new Date(now);
  const text = scheduledWindow.toLowerCase();

  if (text.includes('tomorrow')) {
    target.setDate(target.getDate() + 1);
  }

  const match = scheduledWindow.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (match) {
    let hours = Number(match[1]);
    const minutes = Number(match[2] || 0);
    const meridiem = match[3]?.toLowerCase();
    if (meridiem === 'pm' && hours < 12) hours += 12;
    if (meridiem === 'am' && hours === 12) hours = 0;
    target.setHours(hours, minutes, 0, 0);
    if (target <= now && !text.includes('tomorrow')) {
      target.setDate(target.getDate() + 1);
    }
    return target;
  }

  return null;
}

export function buildScheduledFields({ scheduledWindow, scheduledFor }) {
  const window = scheduledWindow?.trim() || null;
  if (!window) {
    return { isScheduled: false, scheduledWindow: null, scheduledFor: null };
  }
  return {
    isScheduled: true,
    scheduledWindow: window,
    scheduledFor: parseScheduledFor(window, scheduledFor),
  };
}

export function formatStarRating(avgRating) {
  if (avgRating == null || Number.isNaN(Number(avgRating))) return null;
  return Number(Number(avgRating).toFixed(1));
}
