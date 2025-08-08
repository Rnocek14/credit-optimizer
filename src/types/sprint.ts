export interface SprintTask {
  id: string;
  title: string; // e.g., "Career Co-Pilot Route"
  priorityEmoji: string; // e.g., "🚨"
  owner: string; // e.g., "FE", "BE", "Integration" or combos
  eta: string; // e.g., "Day 1"
  description: string; // Keep exactly as written from the task title
  why: string; // The "Why" text
  subtasks: string[]; // Bullet points under Sub-tasks
  definitionOfDone: string; // From the "Done:" line
}

export interface SprintColumn {
  id: string;
  title: string; // e.g., "Day 1 — Blockers"
  tasks: SprintTask[];
}

export interface SprintBoard {
  columns: SprintColumn[];
}
