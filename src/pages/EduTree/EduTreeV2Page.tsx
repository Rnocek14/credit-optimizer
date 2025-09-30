import { useEffect, useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import EduTreeCanvasV2 from "./EduTreeCanvasV2";
import { type FilterMode } from "./data/seedDataV2";

export default function EduTreeV2Page() {
  // Enable features for this tab/session
  useEffect(() => {
    localStorage.setItem("eduTree", "true");
    localStorage.setItem("mp", "1"); // Enable marketplace feature
    console.log('[EduTreeV2Page] Feature flags enabled:', {
      eduTree: localStorage.getItem("eduTree"),
      mp: localStorage.getItem("mp")
    });
  }, []);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const trackParam = params.get("track") as "se" | "ds" | "compare" | null;
  
  // Map legacy track filter to new filter mode
  const filterMode: FilterMode = useMemo(() => {
    if (trackParam === "compare") return "compare-tracks";
    return trackParam;
  }, [trackParam]);

  // Flags via query params (explicit)
  const url = new URL(window.location.href);
  if (!url.searchParams.has("eduTreeV2Grid")) url.searchParams.set("eduTreeV2Grid", "true");
  if (!url.searchParams.has("eduTreeLayoutMode")) url.searchParams.set("eduTreeLayoutMode", "manual_v1");
  
  // WRITE BACK to the address bar without reload:
  if (window.location.href !== url.toString()) {
    window.history.replaceState(null, "", url.toString());
  }

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <ReactFlowProvider>
        <EduTreeCanvasV2 filterMode={filterMode} />
      </ReactFlowProvider>
    </div>
  );
}