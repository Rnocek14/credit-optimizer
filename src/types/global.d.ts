export {};

declare global {
  interface Window {
    __warnOnce?: Set<string>;
    __mpCacheVersion?: string;
    __mpWarned?: Set<string>;
    __mpZeroWarned?: Set<string>;  // Track blocks with zero course options
    __mpSlugBackfills?: Set<string>;  // Track seed IDs using reverse map
    __lastReqIds?: string[];
    __mpCandidateKeys?: string[];
    __mpResultNodeIds?: string[];
    __evidenceWarned?: Set<string>;
  }
}
