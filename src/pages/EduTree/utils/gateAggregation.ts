export type MPInfo = { optionsCount: number; hasAceCredit: boolean; hasClep: boolean };
export type MPMap = Map<string, MPInfo>;

export function aggregateGateMarketplaceData(
  childBlockIds: string[],
  mp: MPMap
): MPInfo {
  let maxOptions = 0, anyAce = false, anyClep = false;
  for (const id of childBlockIds) {
    const r = mp.get(id);
    if (!r) continue;
    maxOptions = Math.max(maxOptions, r.optionsCount);
    anyAce ||= r.hasAceCredit;
    anyClep ||= r.hasClep;
  }
  return { optionsCount: maxOptions, hasAceCredit: anyAce, hasClep: anyClep };
}