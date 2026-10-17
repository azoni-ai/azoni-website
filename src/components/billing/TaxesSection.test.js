import React, { act } from 'react';
import { createRoot } from 'react-dom/client';
import TaxesSection from './TaxesSection';
import { defaultData, todayISO } from './billing-lib';

describe('payment record workflow', () => {
  let container;
  let root;
  let data;
  let props;
  const render = () => act(() => root.render(<TaxesSection data={data} mutate={mutate} {...props} />));
  const mutate = (update) => { data = update(data); render(); };
  const click = (label) => {
    const button = [...container.querySelectorAll('button')].find((item) => item.textContent === label);
    expect(button).toBeTruthy();
    act(() => button.click());
  };
  const field = (label) => [...container.querySelectorAll('label')].find((item) => item.textContent.startsWith(label)).querySelector('input, select');
  const change = (label, value) => {
    const element = field(label);
    const prototype = element.tagName === 'SELECT' ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
    act(() => {
      Object.getOwnPropertyDescriptor(prototype, 'value').set.call(element, value);
      element.dispatchEvent(new Event(element.tagName === 'SELECT' ? 'change' : 'input', { bubbles: true }));
    });
  };
  beforeEach(() => {
    global.IS_REACT_ACT_ENVIRONMENT = true;
    data = defaultData();
    props = {};
    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });
  afterEach(() => {
    act(() => root.unmount());
    container.remove();
    jest.restoreAllMocks();
    delete global.IS_REACT_ACT_ENVIRONMENT;
  });

  test('opens with records, with planning and year-end details collapsed', () => {
    render();
    expect(container.querySelector('h3').textContent).toBe('Payment records');
    expect(container.querySelector('.tax-payment-empty').textContent).toContain('No payments recorded');
    expect(container.querySelector('#tax-payment-form')).toBeNull();
    expect([...container.querySelectorAll('details')].every((item) => !item.open)).toBe(true);
    expect(container.querySelector('.tax-payment-intro').textContent).toContain('does not send money');
  });

  test('agency shortcut prefills a new record; add, edit, and delete preserve other data', () => {
    props = { focusAgency: 'wa' };
    data.taxSettings.waFrequency = 'quarterly';
    render();
    expect(field('Agency').value).toBe('wa');
    const year = String(new Date().getFullYear());
    change('Tax period', `${year}-Q3`);
    change('Amount paid', '123.45');
    change('Confirmation number', 'SYNTHETIC-ONLY');
    act(() => container.querySelector('#tax-payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(data.taxPayments).toHaveLength(1);
    const id = data.taxPayments[0].id;
    expect(data.taxPayments[0]).toMatchObject({ agency: 'wa', period: `${year}-Q3`, amount: 123.45, confirmation: 'SYNTHETIC-ONLY' });
    expect(data.dorFilings).toEqual([]);
    expect(container.querySelector('#tax-payment-form')).toBeNull();
    click('Edit');
    change('Amount paid', '234.56');
    act(() => container.querySelector('#tax-payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(data.taxPayments).toHaveLength(1);
    expect(data.taxPayments[0]).toMatchObject({ id, amount: 234.56 });
    jest.spyOn(window, 'confirm').mockReturnValue(true);
    click('Delete');
    expect(data.taxPayments).toEqual([]);
    expect(data.dorFilings).toEqual([]);
  });

  test('IRS agenda shortcut selects the tax year and quarter without inventing a payment', () => {
    props = { focusAgency: 'irs', focusPeriod: '2025-Q4' };
    render();
    expect(field('Year').value).toBe('2025');
    expect(field('Tax period').value).toBe('2025-Q4');
    expect(field('Date paid').value).toBe(todayISO());
    expect(field('Date paid').max).toBe(todayISO());
    expect(field('Amount paid').value).toBe('');
    expect(data.taxPayments).toEqual([]);
    props = { focusAgency: 'irs', focusPeriod: '2026-Q3' };
    render();
    expect(field('Year').value).toBe('2026');
    expect(field('Tax period').value).toBe('2026-Q3');
    expect(field('Date paid').value).toBe(todayISO());
  });

  test.each(['2025-Q5', '2025 annual', '9999-Q1', '2025-Q1 extra'])('ignores invalid federal shortcut period %s', (focusPeriod) => {
    props = { focusAgency: 'irs', focusPeriod };
    render();
    expect(field('Year').value).toBe(String(new Date().getFullYear()));
    expect(field('Tax period').value).toBe('');
    expect(data.taxPayments).toEqual([]);
  });

  test('does not apply federal shortcut quarters to another agency or record future payments', () => {
    props = { focusAgency: 'wa', focusPeriod: '2025-Q4' };
    data.taxSettings.waFrequency = 'quarterly';
    render();
    expect(field('Tax period').value).toBe('');
    change('Tax period', `${new Date().getFullYear()}-Q1`);
    change('Amount paid', '100');
    change('Date paid', '2200-01-01');
    act(() => container.querySelector('#tax-payment-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })));
    expect(data.taxPayments).toEqual([]);
  });
});
