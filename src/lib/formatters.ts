export const fmtCurrency = (amount: number): string => {
  return `$${amount.toLocaleString('en-US')}`;
};

export const fmtCredits = (earned: number, required: number): string => {
  return `${earned}/${required} cr`;
};

export const fmtPercentage = (value: number): string => {
  return `${Math.round(value)}%`;
};
