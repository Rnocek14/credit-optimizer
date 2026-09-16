import { useCallback, useEffect, useRef, useState } from "react";
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

  // Debounced commit.
  //
  // The timer and the latest values live in refs, NOT in a closure rebuilt by
  // useMemo. The previous version held `t` inside a useMemo keyed on [local,
  // constraints, setConstraints], and the first thing every commit did was
  // setLocal(...) — which changed `local`, re-ran the memo, and handed back a
  // brand new closure with `t = null`. The clearTimeout therefore never saw the
  // pending timer, so dragging a slider scheduled one write per tick instead of
  // one per drag: a burst of setConstraints calls, a plan_constraint_changed
  // analytics event for every intermediate value, and — because each timer
  // sanitised its OWN captured snapshot — no guarantee that the value the user
  // actually left the slider on was the one written last.
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mirror the latest render values so the callback can stay stable.
  const localRef = useRef(local);
  localRef.current = local;
  const constraintsRef = useRef(constraints);
  constraintsRef.current = constraints;

  useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  }, []);

  const commit = useCallback(
    (next: Partial<typeof local>) => {
      // Merge off the ref, not off `local`: within one debounce window several
      // commits run before React re-renders, and each must build on the last.
      const merged = { ...localRef.current, ...next };
      localRef.current = merged;
      setLocal(merged);

      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        timerRef.current = null;

        const latest = localRef.current;
        // sanitize
        const sanitized = {
          max_budget_usd:
            latest.max_budget_usd == null ? undefined : Math.max(0, latest.max_budget_usd),
          target_graduation_date: latest.target_graduation_date,
          max_weekly_hours: clamp(latest.max_weekly_hours, 0, 80),
          min_cri_score: clamp(latest.min_cri_score, 0, 100),
          max_ace_credits: clamp(latest.max_ace_credits, 0, 120),
          max_concurrent_courses: clamp(latest.max_concurrent_courses, 1, 6),
        };

        const previous = constraintsRef.current;
        setConstraints(sanitized);

        // analytics (old → new)
        Object.entries(sanitized).forEach(([k, v]) => {
          const oldV = previous[k as keyof typeof previous];
          const changed =
            (oldV instanceof Date && v instanceof Date && oldV.getTime() !== v.getTime()) ||
            oldV !== v;
          if (changed) {
            logEvent("plan_constraint_changed", { key: k, oldValue: oldV, newValue: v });
          }
        });
      }, 300);
    },
    [setConstraints],
  );

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
