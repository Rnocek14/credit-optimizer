import { useEffect, useMemo } from "react";
import { ReactFlowProvider } from "@xyflow/react";
import { EduTreeCanvasV2 } from "./EduTreeCanvasV2";

export default function EduTreeV2Page() {
  // Enable the feature for this tab/session (optional convenience)
  useEffect(() => {
    localStorage.setItem("eduTree", "true");
  }, []);

  const params = useMemo(() => new URLSearchParams(window.location.search), []);
  const track =
    (params.get("track") as "se" | "ds" | "compare" | null) ?? "compare";

  // Flags via query params (explicit)
  const url = new URL(window.location.href);
  if (!url.searchParams.has("eduTreeV2Grid")) url.searchParams.set("eduTreeV2Grid", "true");
  if (!url.searchParams.has("eduTreeLayoutMode")) url.searchParams.set("eduTreeLayoutMode", "manual_v1");
  // Do NOT reload here; we'll rely on EduTreeCanvasV2 reading flags directly.

  return (
    <div className="h-[calc(100vh-64px)] w-full">
      <ReactFlowProvider>
        <EduTreeCanvasV2 trackFilter={track} />
      </ReactFlowProvider>
    </div>
  );
}