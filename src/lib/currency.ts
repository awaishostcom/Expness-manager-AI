import { CurrencyCode } from '../types';

export const CURRENCIES: { code: CurrencyCode; symbol: string; name: string; rate: number }[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', rate: 1 },
  { code: 'PKR', symbol: 'Rs', name: 'Pakistani Rupee', rate: 278.5 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', rate: 83.3 },
  { code: 'SAR', symbol: 'SR', name: 'Saudi Riyal', rate: 3.75 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', rate: 151.8 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', rate: 7.23 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', rate: 32.4 },
  { code: 'EUR', symbol: '€', name: 'Euro', rate: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', rate: 0.79 },
];

export const formatCurrency = (amount: number, currencyCode: CurrencyCode = 'USD') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currencyCode,
    currencyDisplay: 'symbol',
  }).format(amount);
};

export const convertToUSD = (amount: number, fromCurrency: CurrencyCode) => {
  const currency = CURRENCIES.find(c => c.code === fromCurrency) || CURRENCIES[0];
  return amount / currency.rate;
};
