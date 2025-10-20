export const fmtCurrency = (
  amount: number,
  currency: string = 'USD',
  locale?: string
): string => {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const fmtCredits = (earned: number, required: number): string => {
  return `${earned}/${required} cr`;
};

export const fmtPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};
