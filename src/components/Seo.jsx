import React from 'react';

// Per-route <head> management using React 19's native metadata hoisting.
// Link-preview crawlers (LinkedIn, Slack, Twitter/X) don't run JS, so they read
// the og:* tags in public/index.html, which netlify/edge-functions/site-og.js
// rewrites for the main routes. This component's job is the JS-rendered surface:
// the browser-tab title, per-page description + canonical for Google's rendered
// pass, and an optional noindex. Kept intentionally to that clean set so we
// don't emit duplicate/ conflicting og tags against the static defaults.

const SITE = 'Charlton Smith';
const HOME_TITLE = 'Charlton Smith · Principal software engineer';
const BASE_URL = 'https://azoni.ai';

// "Book a call with Charlton Smith" already names the site; don't repeat it.
export const pageTitle = (title) => {
  if (!title) return HOME_TITLE;
  return title.includes(SITE) ? title : `${title} · ${SITE}`;
};

const Seo = ({ title, description, path = '', noIndex = false }) => (
  <>
    <title>{pageTitle(title)}</title>
    {description && <meta name="description" content={description} />}
    {/* A noindex page shouldn't name a canonical; the 404 used to point at the home page. */}
    {!noIndex && <link rel="canonical" href={`${BASE_URL}${path}`} />}
    {noIndex && <meta name="robots" content="noindex, nofollow" />}
  </>
);

export default Seo;
