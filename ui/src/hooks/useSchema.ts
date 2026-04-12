import { useEffect, useState } from "react";
import type { SchemaGraph } from "../lib/types";
import { useSchemaStore } from "../store/schemaStore";

declare global {
  interface Window {
    __SCHEMA_API_URL__: string;
  }
}

export function useSchema() {
  const [schema, setSchema] = useState<SchemaGraph | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const setAllVisible = useSchemaStore((s) => s.setAllVisible);

  useEffect(() => {
    const url = window.__SCHEMA_API_URL__ ?? "/schema/api/";
    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<SchemaGraph>;
      })
      .then((data) => {
        setSchema(data);
        // All nodes visible by default
        setAllVisible(data.nodes.map((n) => n.id));
        setLoading(false);
      })
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : String(err));
        setLoading(false);
      });
  }, [setAllVisible]);

  return { schema, loading, error };
}
