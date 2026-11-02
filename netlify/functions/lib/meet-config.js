// Booking rules for /meet. Hours are wall-clock times in `timezone`; the page
// shows each slot in the visitor's own zone.

module.exports = {
  ownerName: 'Charlton Smith',
  timezone: process.env.MEET_TIMEZONE || 'America/Los_Angeles',
  durationMinutes: 30,
  stepMinutes: 30,
  // Kept clear on both sides of anything already on a calendar.
  bufferMinutes: 15,
  minNoticeHours: 12,
  horizonDays: 14,
  // Doubles as the abuse ceiling: the page can never send more invites than this per day.
  maxPerDay: 3,
  // Luxon weekday (1 = Monday ... 7 = Sunday) -> open ranges, 24h "HH:mm".
  hours: {
    1: [['09:00', '17:00']],
    2: [['09:00', '17:00']],
    3: [['09:00', '17:00']],
    4: [['09:00', '17:00']],
    5: [['09:00', '17:00']],
  },
};
