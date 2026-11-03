import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import fs from 'fs';
import path from 'path';
import Resume from './Resume';
import { profile, experience } from '../data/profile';

jest.mock('../components/Layout', () => ({ children }) => <main>{children}</main>);
let mockSeoProps;
jest.mock('../components/Seo', () => props => { mockSeoProps = props; return null; });

const publicDir = path.join(__dirname, '..', '..', 'public');

test('shows the PDF resume with download and open-in-new-tab links', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  try {
    act(() => root.render(<Resume />));
    expect(mockSeoProps.title).toBe('Resume');
    expect(container.querySelector('h1').textContent).toBe('Resume');
    expect(container.querySelector('iframe.resume-iframe').getAttribute('src')).toMatch(/^\/CharltonResume\.pdf#page=1/);
    const [download, open] = container.querySelectorAll('.resume-actions a');
    expect(download.getAttribute('href')).toBe('/CharltonResume.pdf');
    expect(download.hasAttribute('download')).toBe(true);
    expect(open.getAttribute('href')).toBe('/CharltonResume.pdf');
    expect(open.getAttribute('target')).toBe('_blank');
    expect(container.textContent).not.toMatch(/[éÉ]/);
  } finally {
    act(() => root.unmount());
    container.remove();
  }
});

test('the PDF ships with the site and no redirect sends its URL elsewhere', () => {
  expect(profile.links.resume).toBe('/CharltonResume.pdf');
  expect(fs.existsSync(path.join(publicDir, profile.links.resume))).toBe(true);
  const redirects = fs.readFileSync(path.join(publicDir, '_redirects'), 'utf8').split(/\r?\n/);
  expect(redirects.filter(line => line.trim().startsWith(profile.links.resume + ' '))).toEqual([]);
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
