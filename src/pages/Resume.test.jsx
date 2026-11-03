import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import Resume from './Resume';
import { resume, resumePdf } from '../data/resume';
import { profile, experience } from '../data/profile';

jest.mock('react-router-dom', () => ({ Link: ({ to, children, ...props }) => <a href={to} {...props}>{children}</a> }), { virtual: true });
jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
let mockSeoProps;
jest.mock('../components/Seo', () => props => { mockSeoProps = props; return null; });

const publicDir = path.join(__dirname, '..', '..', 'public');

function renderResume() {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => root.render(<Resume />));
  return { container, cleanup: () => { act(() => root.unmount()); container.remove(); } };
}

test('shows the PDF resume as a page, in the PDF order, with a Download PDF button', () => {
  const { container, cleanup } = renderResume();
  try {
    expect(mockSeoProps.title).toBe('Resume');
    expect(container.querySelector('h1').textContent).toBe('Charlton Smith');
    expect(container.querySelector('.resume-tagline').textContent).toBe(resume.headline);
    expect([...container.querySelectorAll('.resume-section > h2')].map(h => h.textContent))
      .toEqual(['Summary', 'Technical skills', 'Professional experience', 'Selected projects', 'Education']);
    expect(container.querySelectorAll('.resume-section')[2].querySelectorAll('.resume-entry')).toHaveLength(8);

    const download = container.querySelector('.resume-actions a');
    expect(download.textContent).toContain('Download PDF');
    expect(download.getAttribute('href')).toBe(resumePdf);
    expect(download.hasAttribute('download')).toBe(true);
    expect(container.querySelector('iframe')).toBeNull();

    const projectLinks = [...container.querySelectorAll('.resume-projects a')].map(a => [a.textContent, a.getAttribute('href')]);
    expect(projectLinks).toEqual([
      ['FaB Stats', '/projects/fab-stats'], ['Azoni AI / azoni.ai', '/projects/azoni-ai'], ['Old Ways Today', '/projects/old-ways-today'],
      ['BenchPressOnly', '/projects/bench-only'], ['RowCrew', '/projects/row-crew'],
    ]);
    expect(container.querySelector('a[href="mailto:charlton@azoni.ai"]')).not.toBeNull();
  } finally {
    cleanup();
  }
});

test('every piece of text in data/resume.js appears on the page, and nothing private does', () => {
  const { container, cleanup } = renderResume();
  try {
    const page = container.textContent.replace(/\s+/g, ' ');
    const texts = [
      resume.name, resume.headline, resume.location, resume.summary,
      ...resume.contacts.map(c => c.label),
      ...resume.skills.flatMap(s => [s.label, s.value]),
      ...resume.experience.flatMap(j => [j.title, j.org, j.place, j.dates, ...j.bullets]),
      ...resume.projects.flatMap(p => [...p.names.map(([label]) => label), p.text]),
      ...resume.education.flatMap(e => [e.degree, e.school, e.note, e.year]),
    ];
    for (const text of texts) expect(page).toContain(text);
    expect(page).not.toMatch(/gmail|\(360\)|349-1661|[éÉ]/i);
  } finally {
    cleanup();
  }
});

test('the PDF ships with the site and no redirect sends its URL elsewhere', () => {
  expect(resumePdf).toBe(profile.links.resume);
  expect(fs.existsSync(path.join(publicDir, resumePdf))).toBe(true);
  const redirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8').split(/\r?\n/);
  expect(redirects.filter(line => line.trim().startsWith(resumePdf + ' '))).toEqual([]);
});

test('every experience entry in profile.js is complete', () => {
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
