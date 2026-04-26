import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query, limit, where } from 'firebase/firestore';
import { db } from '../../config/firebase';

/**
 * Small "Now" line between hero tagline and stats.
 *
 * Source priority:
 *   1. profile.currentlyBuilding (hand-edited override)
 *   2. Latest blog_published event in agent_activity (Scribe's title)
 *
 * Falls back to rendering nothing if neither is available.
 */
const CurrentlyBuilding = ({ profile }) => {
  const [latestPost, setLatestPost] = useState(null);

  const overrideText = profile?.currentlyBuilding || profile?.currentFocus;

  useEffect(() => {
    if (overrideText) return undefined;

    const q = query(
      collection(db, 'agent_activity'),
      where('type', '==', 'blog_published'),
      orderBy('timestamp', 'desc'),
      limit(1)
    );
    const unsub = onSnapshot(
      q,
      (snap) => {
        const doc = snap.docs[0];
        if (!doc) return;
        const data = doc.data();
        setLatestPost({
          title: data.title,
          slug: data.metadata?.slug,
        });
      },
      (err) => console.error('currently-building lookup failed', err)
    );
    return () => unsub();
  }, [overrideText]);

  let text = null;
  let href = null;

  if (overrideText) {
    text = overrideText;
  } else if (latestPost?.title) {
    text = latestPost.title;
    if (latestPost.slug) href = `/blog/${latestPost.slug}`;
  }

  if (!text) return null;

  const inner = (
    <>
      <span className="hero-now-pulse" aria-hidden="true" />
      <span className="hero-now-label">Now</span>
      <span className="hero-now-sep" aria-hidden="true">·</span>
      <span className="hero-now-text">{text}</span>
      {href && <span className="hero-now-arrow" aria-hidden="true">→</span>}
    </>
  );

  return href ? (
    <Link to={href} className="hero-now hero-now--link" aria-label={`Now: ${text}`}>
      {inner}
    </Link>
  ) : (
    <div className="hero-now" aria-label={`Now: ${text}`}>
      {inner}
    </div>
  );
};

export default CurrentlyBuilding;
