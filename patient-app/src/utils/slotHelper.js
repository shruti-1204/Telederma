/**
 * Helper to dynamically parse doctor availableSlots into selectable appointment slot objects.
 * Handles comma-separated strings, JSON arrays, array of strings, or array of objects.
 */
export const parseDoctorSlots = (rawSlots) => {
  if (!rawSlots) {
    return [
      { id: 's1', time: '10:00 AM', available: true },
      { id: 's2', time: '11:30 AM', available: true },
      { id: 's3', time: '04:00 PM', available: true },
      { id: 's4', time: '05:30 PM', available: true },
    ];
  }

  // If already array of objects with time property
  if (
    Array.isArray(rawSlots) &&
    rawSlots.length > 0 &&
    typeof rawSlots[0] === 'object' &&
    rawSlots[0]?.time
  ) {
    return rawSlots;
  }

  let list = [];
  if (Array.isArray(rawSlots)) {
    list = rawSlots;
  } else if (typeof rawSlots === 'string') {
    const trimmed = rawSlots.trim();
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        list = parsed;
      } else {
        list = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } catch (_) {
      // If JSON.parse fails, strip wrapping brackets and quotes
      const cleaned = trimmed
        .replace(/^\[|\]$/g, '')
        .replace(/\\"/g, '')
        .replace(/"/g, '')
        .replace(/'/g, '');
      list = cleaned.split(',').map((s) => s.trim()).filter(Boolean);
    }
  }

  if (!list || list.length === 0) {
    return [
      { id: 's1', time: '10:00 AM', available: true },
      { id: 's2', time: '11:30 AM', available: true },
      { id: 's3', time: '04:00 PM', available: true },
      { id: 's4', time: '05:30 PM', available: true },
    ];
  }

  return list.map((item, idx) => {
    if (typeof item === 'object' && item?.time) {
      return item;
    }
    const timeStr = String(item)
      .replace(/^\[|\]$/g, '')
      .replace(/^["']|["']$/g, '')
      .trim();
    const cleanId = timeStr.replace(/[^a-zA-Z0-9]/g, '');
    return {
      id: `slot-${idx}-${cleanId}`,
      time: timeStr,
      available: true,
    };
  });
};
