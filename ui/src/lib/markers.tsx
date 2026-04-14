/**
 * Semantic SVG marker definitions for ORM relationship edges.
 *
 * Each relation type maps to marker IDs for markerStart/markerEnd.
 * `MarkerDefs` must be rendered as a child of `<ReactFlow>` (not a sibling)
 * so that html-to-image captures the <defs> block during PNG export.
 */

export const RELATION_MARKERS: Record<
  "fk" | "o2o" | "m2m" | "subclass" | "proxy",
  { markerStart?: string; markerEnd?: string }
> = {
  fk:       { markerStart: "crow-many-gray",   markerEnd: "crow-one-gray"       },
  o2o:      { markerStart: "bar-blue",         markerEnd: "bar-blue"            },
  m2m:      { markerStart: "crow-many-purple", markerEnd: "crow-many-purple"    },
  subclass: {                                   markerEnd: "triangle-open-green" },
  proxy:    {                                   markerEnd: "triangle-open-amber" },
};

/** Shared marker attributes */
const MARKER_PROPS = {
  viewBox: "0 0 10 10",
  refX: "9",
  refY: "5",
  markerWidth: "8",
  markerHeight: "8",
  markerUnits: "strokeWidth" as const,
};

/**
 * Hidden SVG containing all marker <defs>. Render as a direct child of
 * <ReactFlow> so the defs are inside the `.react-flow` DOM subtree and
 * therefore captured by html-to-image during PNG export.
 */
export function MarkerDefs() {
  return (
    <svg
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      aria-hidden="true"
    >
      <defs>
        {/* Crow's foot "many" — three lines fanning to tip — gray (FK target) */}
        <marker
          id="crow-many-gray"
          {...MARKER_PROPS}
          orient="auto-start-reverse"
        >
          <line x1="0" y1="0"  x2="9" y2="5" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="0" y1="5"  x2="9" y2="5" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="0" y1="10" x2="9" y2="5" stroke="#6b7280" strokeWidth="1.5" />
        </marker>

        {/* Double-bar "one" — two vertical bars — gray (FK source) */}
        <marker
          id="crow-one-gray"
          {...MARKER_PROPS}
          orient="auto-start-reverse"
        >
          <line x1="9" y1="0" x2="9" y2="10" stroke="#6b7280" strokeWidth="1.5" />
          <line x1="6" y1="0" x2="6" y2="10" stroke="#6b7280" strokeWidth="1.5" />
        </marker>

        {/* Single bar — blue (O2O both ends) */}
        <marker
          id="bar-blue"
          {...MARKER_PROPS}
          orient="auto-start-reverse"
        >
          <line x1="9" y1="0" x2="9" y2="10" stroke="#2563eb" strokeWidth="1.5" />
        </marker>

        {/* Crow's foot "many" — purple (M2M both ends) */}
        <marker
          id="crow-many-purple"
          {...MARKER_PROPS}
          orient="auto-start-reverse"
        >
          <line x1="0" y1="0"  x2="9" y2="5" stroke="#7c3aed" strokeWidth="1.5" />
          <line x1="0" y1="5"  x2="9" y2="5" stroke="#7c3aed" strokeWidth="1.5" />
          <line x1="0" y1="10" x2="9" y2="5" stroke="#7c3aed" strokeWidth="1.5" />
        </marker>

        {/* Hollow triangle — green (subclass / UML inheritance at target) */}
        <marker
          id="triangle-open-green"
          {...MARKER_PROPS}
          orient="auto"
        >
          <path d="M 0 0 L 9 5 L 0 10 Z" fill="white" stroke="#059669" strokeWidth="1.5" />
        </marker>

        {/* Hollow triangle — amber (proxy / UML realization at target) */}
        <marker
          id="triangle-open-amber"
          {...MARKER_PROPS}
          orient="auto"
        >
          <path d="M 0 0 L 9 5 L 0 10 Z" fill="white" stroke="#d97706" strokeWidth="1.5" />
        </marker>
      </defs>
    </svg>
  );
}
