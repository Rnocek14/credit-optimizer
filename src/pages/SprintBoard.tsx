import React from "react";
import { Helmet } from "react-helmet-async";
import { sprintBoardData } from "@/data/sprintBoard";

function TaskCard({
  title,
  priorityEmoji,
  owner,
  eta,
  description,
  why,
  subtasks,
  definitionOfDone,
}: {
  title: string;
  priorityEmoji: string;
  owner: string;
  eta: string;
  description: string;
  why: string;
  subtasks: string[];
  definitionOfDone: string;
}) {
  return (
    <article className="rounded-lg border bg-card text-card-foreground shadow-sm p-4 space-y-3">
      <header className="flex items-center justify-between">
        <h3 className="text-base font-semibold">
          <span className="mr-2" aria-hidden>
            {priorityEmoji}
          </span>
          {title} <span className="text-muted-foreground">({owner})</span>
        </h3>
        <span className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">{eta}</span>
      </header>

      <section>
        <h4 className="text-sm font-medium">Description</h4>
        <p className="text-sm text-muted-foreground">{description}</p>
      </section>

      <section>
        <h4 className="text-sm font-medium">Why it matters</h4>
        <p className="text-sm text-muted-foreground">{why}</p>
      </section>

      <section>
        <h4 className="text-sm font-medium">Sub-tasks</h4>
        <ul className="list-disc pl-5 space-y-1">
          {subtasks.map((s, i) => (
            <li key={i} className="text-sm">{s}</li>
          ))}
        </ul>
      </section>

      <section>
        <h4 className="text-sm font-medium">Definition of Done</h4>
        <p className="text-sm text-muted-foreground">{definitionOfDone}</p>
      </section>
    </article>
  );
}

const SprintBoard: React.FC = () => {
  const day1Done = (typeof window !== 'undefined') && localStorage.getItem('day1_done') === 'true';
  return (
    <div>
      <Helmet>
        <title>Life Path Sprint Board | Export Ready</title>
        <meta name="description" content="Life Path Sprint Board with Day 1-3 tasks, owners, ETAs. Track blockers, high-impact, polish for export readiness." />
        <link rel="canonical" href="/sprint-board" />
      </Helmet>

      <header className="container mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold">Life Path — 72-Hour Export Sprint Board</h1>
        <p className="text-muted-foreground mt-1">Three columns: Day 1 — Blockers, Day 2 — High-Impact, Day 3 — Polish & Demo Readiness.</p>
      </header>

      <main className="container mx-auto px-4 pb-10">
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {sprintBoardData.columns.map((col) => {
            const tasks = col.id === 'day1' && day1Done
              ? col.tasks.map((t) => ({ ...t, title: `${t.title} — Done` }))
              : col.tasks;
            return (
              <div key={col.id} className="space-y-3" aria-labelledby={`${col.id}-title`}>
                <h2 id={`${col.id}-title`} className="text-lg font-semibold">{col.title}</h2>
                {tasks.map((t) => (
                  <TaskCard key={t.id} {...t} />
                ))}
              </div>
            );
          })}
        </section>
      </main>
    </div>
  );
};

export default SprintBoard;
