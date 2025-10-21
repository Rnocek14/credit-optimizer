import { useMemo, useState } from "react";
import { usePlanBasket } from "../state/usePlanBasket";
import { logEvent } from "@/lib/analytics";

type Num = number | undefined | null;

const clamp = (v: Num, min: number, max: number) =>
  typeof v === "number" ? Math.max(min, Math.min(max, v)) : v;

export default function ConstraintsPanel() {
  const constraints = usePlanBasket(s => s.constraints);
  const setConstraints = usePlanBasket(s => s.setConstraints);

  // Local UI state (prevents spammy writes)
  const [local, setLocal] = useState({
    max_budget_usd: constraints.max_budget_usd ?? undefined,
    target_graduation_date: constraints.target_graduation_date
      ? new Date(constraints.target_graduation_date)
      : undefined,
    max_weekly_hours: constraints.max_weekly_hours ?? 20,
    min_cri_score: constraints.min_cri_score ?? 0,
    max_ace_credits: constraints.max_ace_credits ?? 90,
    max_concurrent_courses: constraints.max_concurrent_courses ?? 2,
  });

  // Debounced commit
  const commit = useMemo(() => {
    let t: ReturnType<typeof setTimeout> | null = null;
    return (next: Partial<typeof local>) => {
      const prev = { ...local };
      const merged = { ...local, ...next };
      setLocal(merged);

      if (t) clearTimeout(t);
      t = setTimeout(() => {
        // sanitize
        const sanitized = {
          max_budget_usd:
            merged.max_budget_usd == null ? undefined : Math.max(0, merged.max_budget_usd),
          target_graduation_date: merged.target_graduation_date,
          max_weekly_hours: clamp(merged.max_weekly_hours, 0, 80),
          min_cri_score: clamp(merged.min_cri_score, 0, 100),
          max_ace_credits: clamp(merged.max_ace_credits, 0, 120),
          max_concurrent_courses: clamp(merged.max_concurrent_courses, 1, 6),
        };

        setConstraints(sanitized);

        // analytics (old → new)
        Object.entries(sanitized).forEach(([k, v]) => {
          const oldV = constraints[k as keyof typeof constraints];
          const changed =
            (oldV instanceof Date && v instanceof Date && oldV.getTime() !== v.getTime()) ||
            oldV !== v;
          if (changed) {
            logEvent("plan_constraint_changed", { key: k, oldValue: oldV, newValue: v });
          }
        });
      }, 300);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local, constraints, setConstraints]);

  return (
    <div className="space-y-6 rounded-2xl border p-4">
      <section className="space-y-2">
        <h3 className="text-sm font-medium">Budget & Timeline</h3>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Max Budget (USD)</span>
          <input
            type="number"
            min={0}
            className="w-40 rounded-md border px-2 py-1 text-right"
            value={local.max_budget_usd ?? ""}
            placeholder="—"
            onChange={e =>
              commit({ max_budget_usd: e.target.value === "" ? undefined : Number(e.target.value) })
            }
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">Target Graduation</span>
          <input
            type="date"
            className="w-40 rounded-md border px-2 py-1 text-right"
            value={local.target_graduation_date ? toDateInput(local.target_graduation_date) : ""}
            onChange={e =>
              commit({
                target_graduation_date: e.target.value ? new Date(e.target.value) : undefined,
              })
            }
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Max Weekly Hours <span className="opacity-60">({local.max_weekly_hours ?? 0})</span>
          </span>
          <input
            type="range"
            min={0}
            max={80}
            step={1}
            className="w-40"
            aria-label="Max Weekly Hours"
            value={local.max_weekly_hours ?? 0}
            onChange={e => commit({ max_weekly_hours: Number(e.target.value) })}
          />
        </label>
      </section>

      <section className="space-y-2">
        <h3 className="text-sm font-medium">Credit & Safety</h3>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Min CRI <span className="opacity-60">({local.min_cri_score ?? 0}%)</span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            className="w-40"
            aria-label="Min CRI"
            value={local.min_cri_score ?? 0}
            onChange={e => commit({ min_cri_score: Number(e.target.value) })}
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Max ACE Credits <span className="opacity-60">({local.max_ace_credits ?? 0})</span>
          </span>
          <input
            type="range"
            min={0}
            max={120}
            step={1}
            className="w-40"
            aria-label="Max ACE Credits"
            value={local.max_ace_credits ?? 0}
            onChange={e => commit({ max_ace_credits: Number(e.target.value) })}
          />
        </label>

        <label className="flex items-center justify-between gap-3">
          <span className="text-sm text-muted-foreground">
            Max Concurrent <span className="opacity-60">({local.max_concurrent_courses ?? 2})</span>
          </span>
          <input
            type="range"
            min={1}
            max={6}
            step={1}
            className="w-40"
            aria-label="Max Concurrent Courses"
            value={local.max_concurrent_courses ?? 2}
            onChange={e => commit({ max_concurrent_courses: Number(e.target.value) })}
          />
        </label>
      </section>
    </div>
  );
}

function toDateInput(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
