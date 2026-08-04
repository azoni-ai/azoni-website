// Per-tab identity for chat logging, so one visitor's turns group into one
// conversation in the admin panel instead of fragmenting on every page load.
//
// journeyId: one id per browser tab (sessionStorage), shared by the hero widget
// and the full chat page. It dies with the tab — deliberately NOT localStorage,
// to stay consistent with /privacy ("logs aren't tied to a name"; no cross-visit
// tracking). sessionIds keep their surface prefixes (home_/session_) because the
// server uses the prefix to decide which side writes the chatLogs row.

const randomId = (prefix) =>
  `${prefix}${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const memory = {};

const getOrCreate = (storageKey, prefix) => {
  try {
    const existing = sessionStorage.getItem(storageKey);
    if (existing) return existing;
    const id = randomId(prefix);
    sessionStorage.setItem(storageKey, id);
    return id;
  } catch {
    // Storage blocked (private mode etc.) — fall back to per-page-load memory.
    if (!memory[storageKey]) memory[storageKey] = randomId(prefix);
    return memory[storageKey];
  }
};

export const getJourneyId = () => getOrCreate('azoni_chat_journey', 'j_');
export const getHeroSessionId = () => getOrCreate('azoni_hero_session', 'home_');
export const getChatSessionId = () => getOrCreate('azoni_chat_session', 'session_');
