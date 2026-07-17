"use client";

import { useEffect, useState } from "react";
import { runStorageSmokeTest, type StorageSmokeResult } from "@/lib/storage/smoke-test";

export function StorageSmokePanel() {
  const [visible, setVisible] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<StorageSmokeResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setVisible(new URLSearchParams(window.location.search).get("smoke") === "storage");
  }, []);

  if (!visible) {
    return null;
  }

  const handleRun = async () => {
    setRunning(true);
    setResult(null);
    setError(null);

    try {
      setResult(await runStorageSmokeTest());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Storage smoke test failed.");
    } finally {
      setRunning(false);
    }
  };

  return (
    <aside className="storage-smoke-panel" aria-label="IndexedDB smoke test">
      <strong>IndexedDB Smoke</strong>
      <p>验证 preferences、projects、snapshots 的浏览器态读写。</p>
      <button className="secondary-button" type="button" onClick={handleRun} disabled={running}>
        {running ? "运行中..." : "运行 smoke test"}
      </button>
      {result && (
        <ul>
          {result.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ul>
      )}
      {error && <p className="smoke-error">{error}</p>}
    </aside>
  );
}
