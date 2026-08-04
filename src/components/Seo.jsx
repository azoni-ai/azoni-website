import React from 'react';

// Per-route <head> management using React 19's native metadata hoisting.
// Link-preview crawlers (LinkedIn, Slack, Twitter/X) don't run JS, so the
// static og:* card in public/index.html is what they render for every share.
// This component's job is the JS-rendered surface: the browser-tab title,
// per-page description + canonical for Google's rendered pass, and an optional
// noindex for owner-only routes. Kept intentionally to that clean set so we
// don't emit duplicate/ conflicting og tags against the static defaults.

const SITE = 'Azoni';
const BASE_URL = 'https://azoni.ai';

const Seo = ({ title, description, path = '', noIndex = false }) => {
  const fullTitle = title ? `${title} · ${SITE}` : `${SITE} — Charlton Smith, Software Engineer & AI Builder`;
  const canonical = `${BASE_URL}${path}`;

  return (
    <>
      <title>{fullTitle}</title>
      {description && <meta name="description" content={description} />}
      <link rel="canonical" href={canonical} />
      {noIndex && <meta name="robots" content="noindex, nofollow" />}
    </>
  );
};

export default Seo;
