import { formatMoney, parseAmount } from '../../utils/formatMoney';
import { formatPostDate } from '../../utils/formatPostDate';

describe('formatMoney', () => {
  it('formats rupees with Indian grouping', () => {
    expect(formatMoney(2500)).toBe('₹2,500');
    expect(formatMoney(125000)).toBe('₹1,25,000');
  });
});

describe('parseAmount', () => {
  it('accepts plain and grouped numbers', () => {
    expect(parseAmount('1,200')).toBe(1200);
    expect(parseAmount('500.50')).toBe(500.5);
  });
  it('rejects empty, negative and text', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-5')).toBeNull();
    expect(parseAmount('abc')).toBeNull();
  });
});

describe('formatPostDate', () => {
  it('formats yyyy-MM-dd', () => {
    expect(formatPostDate('2026-10-17')).toBe('17 Oct 2026');
  });
  it('passes through other text', () => {
    expect(formatPostDate('soon')).toBe('soon');
  });
});
