// Private tax setup and owner-entered reminders. These records never create
// a filing, payment, or assumed tax obligation.
const PROFILE_FIELDS = new Set(['entity', 'startedOn', 'city', 'federalPlan', 'cityStatus']);
const ENTITIES = new Set(['unknown', 'sole-proprietor', 's-corp', 'c-corp', 'partnership']);
const FEDERAL_PLANS = new Set(['unknown', 'estimated', 'withholding', 'adviser']);
const CITY_STATUSES = new Set(['unknown', 'required', 'not-required']);
const REMINDER_FIELDS = new Set(['id', 'title', 'dueDate', 'category', 'notes', 'completed']);
const REMINDER_CATEGORIES = new Set(['city-tax', 'license', 'annual-filing', 'other']);
const RESERVED_IDS = new Set(['__proto__', 'constructor', 'prototype']);
const plainObject = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const text = (value, max, required = false) => typeof value === 'string'
  // Reject hidden control characters while allowing ordinary multiline notes.
  // eslint-disable-next-line no-control-regex
  && value.length <= max && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)
  && (!required || value.trim().length > 0);

function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const year = Number(value.slice(0, 4));
  if (year < 1900 || year > 2200) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validTaxProfile(profile) {
  return plainObject(profile) && Object.keys(profile).every(key => PROFILE_FIELDS.has(key))
    && ENTITIES.has(profile.entity) && (profile.startedOn === '' || validDate(profile.startedOn))
    && text(profile.city, 120) && FEDERAL_PLANS.has(profile.federalPlan) && CITY_STATUSES.has(profile.cityStatus);
}

function validTaxReminders(reminders) {
  return Array.isArray(reminders) && reminders.length <= 200
    && reminders.every(reminder => plainObject(reminder)
      && Object.keys(reminder).every(key => REMINDER_FIELDS.has(key))
      && text(reminder.id, 128, true) && !RESERVED_IDS.has(reminder.id.trim().toLowerCase())
      && text(reminder.title, 160, true) && validDate(reminder.dueDate)
      && REMINDER_CATEGORIES.has(reminder.category) && text(reminder.notes, 2000)
      && typeof reminder.completed === 'boolean')
    && new Set(reminders.map(reminder => reminder.id.trim())).size === reminders.length;
}

function validTaxWorkspace(data) {
  return plainObject(data)
    && (data.taxProfile === undefined || validTaxProfile(data.taxProfile))
    && (data.taxReminders === undefined || validTaxReminders(data.taxReminders));
}

module.exports = { validTaxProfile, validTaxReminders, validTaxWorkspace };
