import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import Resume from './Resume';
import { profile, experience, education, awards, skills } from '../data/profile';
import { bookingCta } from '../data/consulting';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
let mockSeoProps;
jest.mock('../components/Seo', () => props => { mockSeoProps = props; return null; });

test('renders the résumé as HTML from profile.js, printable, with the consulting PDF labeled as such', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Resume />));
    expect(mockSeoProps.title).toBe('Résumé');
    expect(mockSeoProps.noindex).toBeFalsy();
    expect(container.querySelector('iframe')).toBeNull();
    expect(container.querySelector('h1').textContent).toBe(profile.name);
    expect(container.querySelector('.resume-tagline').textContent).toContain('Principal software engineer');

    const [print, pdf] = container.querySelectorAll('.resume-actions .resume-cta');
    expect(print.tagName).toBe('BUTTON');
    expect(print.textContent).toBe('Print or save as PDF');
    window.print = jest.fn();
    act(() => print.click());
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(pdf.getAttribute('href')).toBe(profile.links.resume);
    expect(pdf.textContent).toContain('Consulting summary (PDF)');
    expect(container.querySelector('a[download]')).toBeNull();

    const headings = [...container.querySelectorAll('.resume-section > h2')].map(h => h.textContent);
    expect(headings).toEqual(['Summary', 'Experience', 'Education', 'Awards', 'Skills']);
    expect(container.querySelectorAll('.resume-entries')[0].children).toHaveLength(experience.length);
    expect(container.querySelectorAll('.resume-entries')[1].children).toHaveLength(education.length);
    expect(container.querySelector('.resume-awards').children).toHaveLength(awards.length);
    expect(container.querySelectorAll('.resume-skills dt')).toHaveLength(Object.keys(skills).length);
    expect(container.textContent).toContain('Capital One');
    expect(container.querySelector('.resume-closing a.resume-cta').getAttribute('href')).toBe(bookingCta.to);
    expect(container.textContent).not.toMatch(/any size|open to work|job search/i);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test('every experience entry has what both About and the résumé need', () => {
  const ids = new Set();
  for (const job of experience) {
    expect(['role', 'project']).toContain(job.kind);
    expect(job.title && job.company && job.period && job.summary).toBeTruthy();
    expect(job.highlights.length).toBeGreaterThan(0);
    expect(ids.has(job.id)).toBe(false);
    ids.add(job.id);
    for (const link of job.links || []) expect(link.to || link.href).toBeTruthy();
  }
  expect(experience.find(job => job.id === 'dustbunny').kind).toBe('project');
});
