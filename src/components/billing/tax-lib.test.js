import { defaultData } from './billing-lib';
import { federalRows, periodStatus, taxYears } from './tax-lib';

test('budget percentages never establish a required federal payment or an all-clear state', () => {
  const data = defaultData();
  data.taxSettings = { ...data.taxSettings, setAsidePct: 10, priorYearTax: 20000 };
  data.invoices = [{ id: 'paid', status: 'paid', paidDate: '2020-01-20', total: 1000, tax: 0 }];
  const first = federalRows(data, '2020')[0];
  expect(first).toMatchObject({ rough: 100, safe: 5000, target: null, paid: 0, status: 'review' });
  expect(federalRows(data, '2020')[1]).toMatchObject({ rough: 0, target: null, status: 'review' });
});

test('any recorded payment is distinct from proof of payment sufficiency', () => {
  const period = { start: '2020-01-01', end: '2020-03-31', due: '2020-04-15' };
  expect(periodStatus(period, 1000, 1)).toBe('recorded');
  expect(periodStatus(period, 1000, 1000)).toBe('recorded');
  expect(periodStatus(period, 0, 0)).toBe('review');
});

test('January payments keep their prior tax year available for records and exports', () => {
  const data = defaultData();
  data.taxPayments = [{ date: '2021-01-15', period: '2020-Q4', amount: 100 }];
  expect(taxYears(data)).toEqual(expect.arrayContaining(['2020', '2021']));
});
