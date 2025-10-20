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

export const fmtDuration = (months: number): string => {
  if (months === 1) return '1 month';
  if (months < 12) return `${months} months`;
  
  const years = Math.floor(months / 12);
  const remainingMonths = months % 12;
  
  if (remainingMonths === 0) {
    return years === 1 ? '1 year' : `${years} years`;
  }
  
  return `${years}yr ${remainingMonths}mo`;
};
