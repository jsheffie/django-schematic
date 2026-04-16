// Mirrors the Python dataclasses in schema_graph/schema.py

export interface FieldInfo {
  name: string;
  field_type: string;
  is_relation: boolean;
  null: boolean;
  unique: boolean;
}

export interface NodeInfo {
  id: string;       // e.g. "myapp.Order"
  name: string;     // e.g. "Order"
  app_label: string;
  app_name: string; // e.g. "django.contrib.auth" (full dotted module path)
  tags: string[];   // "abstract", "proxy"
  fields: FieldInfo[];
}

export interface EdgeInfo {
  source: string;
  target: string;
  relation_type: "fk" | "o2o" | "m2m" | "subclass" | "proxy";
  field_name: string;
  related_name: string | null;
}

export interface SchemaGraph {
  nodes: NodeInfo[];
  edges: EdgeInfo[];
  app_labels: string[];
  app_names: Record<string, string>; // app_label → full dotted name
}
