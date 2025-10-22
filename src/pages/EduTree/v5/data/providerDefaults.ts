export type ProviderDefaults = {
  aceNccrs?: boolean;
  proctored?: boolean;
  rep?: number; // optional provider reputation override (0-100)
};

export const PROVIDER_DEFAULTS: Record<string, ProviderDefaults> = {
  'edu':                      { aceNccrs: false, proctored: true,  rep: 85 }, // University courses (default)
  'sophia-learning':          { aceNccrs: true,  proctored: false, rep: 78 },
  'study-com':                { aceNccrs: true,  proctored: true,  rep: 80 },
  'asu-universal-learner':    { aceNccrs: true,  proctored: true,  rep: 90 },
  'arizona-state-university': { aceNccrs: true,  proctored: true,  rep: 92 },
  'clep-testing-center':      { aceNccrs: true,  proctored: true,  rep: 82 },
  'coursera':                 { aceNccrs: false, proctored: false, rep: 70 },
  'edx':                      { aceNccrs: false, proctored: false, rep: 72 },
  'udemy':                    { aceNccrs: false, proctored: false, rep: 60 },
  'straighterline':           { aceNccrs: true,  proctored: false, rep: 75 },
  'dantes':                   { aceNccrs: true,  proctored: true,  rep: 81 },
};
