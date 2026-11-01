// Mirrors the Python dataclasses in schematic/schema.py

export interface FieldInfo {
  name: string;
  field_type: string;    // Python class name, e.g. "AutoCreatedField"; what the UI shows
  is_relation: boolean;
  null: boolean;
  unique: boolean;
  primary_key: boolean;
  internal_type: string; // Django's get_internal_type(), e.g. "DateTimeField" for a custom subclass
  column: string | null; // database column, e.g. "company_id"; null for a ManyToManyField (issue #135)
}

export interface NodeInfo {
  id: string;       // e.g. "myapp.Order"
  name: string;     // e.g. "Order"
  app_label: string;
  app_name: string; // e.g. "django.contrib.auth" (full dotted module path)
  tags: string[];   // "abstract", "proxy"
  fields: FieldInfo[];
  db_table: string | null; // database table (Meta.db_table); null for abstract models (issue #135)
}

export interface EdgeInfo {
  source: string;
  target: string;
  relation_type: "fk" | "o2o" | "m2m" | "subclass" | "proxy";
  field_name: string;
  related_name: string | null;
  target_field: string | null; // remote pk / to_field name; null for subclass/proxy edges and unrecognized relation types
  through_db_table: string | null; // m2m edges: the table holding the links; null for every other relation (issue #135)
}

export interface SchemaGraph {
  nodes: NodeInfo[];
  edges: EdgeInfo[];
  app_labels: string[];
  app_names: Record<string, string>; // app_label → full dotted name
}
