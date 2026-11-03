import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import keepNamesTogether from './keepNamesTogether';

test('leaves other text, and anything that is not text, as it is', () => {
  expect(keepNamesTogether('Capital One and OLI Fitness')).toBe('Capital One and OLI Fitness');
  expect(keepNamesTogether(undefined)).toBeUndefined();
  expect(keepNamesTogether(42)).toBe(42);
});

test('keeps every T-Mobile on one line without changing the text', () => {
  global.IS_REACT_ACT_ENVIRONMENT = true;
  const text = 'Built for the T-Mobile Big Data Hackathon, then an engineer at T-Mobile.';
  const container = document.createElement('div');
  const root = createRoot(container);
  try {
    act(() => root.render(<p>{keepNamesTogether(text)}</p>));
    expect(container.textContent).toBe(text);
    const spans = [...container.querySelectorAll('span')];
    expect(spans.map((span) => span.textContent)).toEqual(['T-Mobile', 'T-Mobile']);
    expect(spans.every((span) => span.style.whiteSpace === 'nowrap')).toBe(true);
  } finally {
    act(() => root.unmount());
  }
});
