export {};

declare global {
  interface Window {
    __warnOnce?: Set<string>;
    __mpCacheVersion?: string;
    __mpWarned?: Set<string>;
    __lastReqIds?: string[];
    __mpCandidateKeys?: string[];
    __mpResultNodeIds?: string[];
    __evidenceWarned?: Set<string>;
  }
}
