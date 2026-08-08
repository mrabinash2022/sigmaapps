export function parseDeliveryReminderAt(deliveryTimeWindow, acceptedAt = new Date()) {
  const text = deliveryTimeWindow?.trim();
  if (!text) return null;

  const base = new Date(acceptedAt);
  const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i);
  if (!timeMatch) {
    return new Date(base.getTime() + 45 * 60 * 1000);
  }

  let hours = Number(timeMatch[1]);
  const minutes = Number(timeMatch[2] || 0);
  const meridiem = timeMatch[3]?.toLowerCase();
  if (meridiem === 'pm' && hours < 12) hours += 12;
  if (meridiem === 'am' && hours === 12) hours = 0;

  const target = new Date(base);
  target.setHours(hours, minutes, 0, 0);
  if (target <= base) target.setDate(target.getDate() + 1);

  return new Date(target.getTime() - 30 * 60 * 1000);
}
