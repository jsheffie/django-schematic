/**
 * Main canvas component. Converts the SchemaGraph API response into React Flow
 * nodes and edges, applies the active layout, and renders the graph.
 *
 * Position update flow (React Flow v12 controlled mode):
 *   setNodes() from useReactFlow() → BatchContext queue → onNodesChange()
 *   → setDisplayNodes() → re-render → StoreUpdater syncs RF store → display
 *
 * Without onNodesChange the queue handler has nowhere to send changes
 * (it only calls the internal store setter in *uncontrolled* mode), so
 * every force-layout tick and every dagre call would be silently dropped.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  type Edge,
  type EdgeChange,
  type NodeChange,
  type NodeTypes,
  type OnNodeDrag,
  useReactFlow,
} from "@xyflow/react";
import type { SchemaGraph } from "../lib/types";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { appColor } from "../lib/colors";
import { ModelNode, type ModelNodeData } from "./ModelNode";
import { TextBlockNode, DEFAULT_NOTE_COLOR, type TextBlockNodeData } from "./TextBlockNode";
import { AnchorNode, type AnchorNodeData } from "./AnchorNode";
import ArrowDrawLayer from "./ArrowDrawLayer";
import { edgeTypes } from "./EdgeTypes";
import type { ArrowEdgeData } from "./ArrowEdge";
import { RELATION_MARKERS, MarkerDefs } from "../lib/markers";
import {
  ANCHOR_SIZE,
  anchorNodeId,
  arrowEndNodeId,
  isArrowVisible,
  isAttached,
  type ArrowEnd,
} from "../lib/annotations";
import { mergeDisplayNodes } from "../lib/mergeDisplayNodes";
import { useForceLayout } from "../hooks/useForceLayout";
import { useAnnotationActions } from "../hooks/useAnnotationActions";
import { runDagreLayout } from "../hooks/useLayout";
import { runElkLayout } from "../hooks/useElkLayout";
import SettingsDrawer from "./SettingsDrawer";

// Model tables, text blocks, and invisible anchors for the free ends of arrows.
type CanvasNode = ModelNodeData | TextBlockNodeData | AnchorNodeData;

const nodeTypes: NodeTypes = {
  model: ModelNode,
  text: TextBlockNode,
  anchor: AnchorNode,
} as unknown as NodeTypes;

interface Props {
  schema: SchemaGraph;
}

export default function SchemaCanvas({ schema }: Props) {
  const visibleNodeIds = useSchemaStore((s) => s.visibleNodeIds);
  const schemaInitialized = useSchemaStore((s) => s.schemaInitialized);
  const pinnedPositions = useSchemaStore((s) => s.pinnedPositions);
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const layoutVersion = useSchemaStore((s) => s.layoutVersion);
  const setViewport = useSchemaStore((s) => s.setViewport);
  const pinNode = useSchemaStore((s) => s.pinNode);
  const importId = useSchemaStore((s) => s.importId);
  const canvasLayoutSuppressVersion = useSchemaStore((s) => s.canvasLayoutSuppressVersion);
  const textBlocks = useSchemaStore((s) => s.textBlocks);
  const arrows = useSchemaStore((s) => s.arrows);
  const updateTextBlock = useSchemaStore((s) => s.updateTextBlock);
  const removeTextBlock = useSchemaStore((s) => s.removeTextBlock);
  const updateArrow = useSchemaStore((s) => s.updateArrow);
  const removeArrow = useSchemaStore((s) => s.removeArrow);

  const edgeStyle = usePhysicsStore((s) => s.edgeStyle);
  const liveDragPhysics = usePhysicsStore((s) => s.liveDragPhysics);
  const physicsEnabled = usePhysicsStore((s) => s.physicsEnabled);
  const setPhysicsEnabled = usePhysicsStore((s) => s.setPhysicsEnabled);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const minimapVisible = usePhysicsStore((s) => s.minimapVisible);
  const setMinimapVisible = usePhysicsStore((s) => s.setMinimapVisible);
  const colorPalette = usePhysicsStore((s) => s.colorPalette);
  const backgroundStyle = usePhysicsStore((s) => s.backgroundStyle);
  const annotationTool = usePhysicsStore((s) => s.annotationTool);
  const setAnnotationTool = usePhysicsStore((s) => s.setAnnotationTool);
  const selectedArrowId = usePhysicsStore((s) => s.selectedArrowId);
  const setSelectedArrow = usePhysicsStore((s) => s.setSelectedArrow);
  const { addTextBlockAtCenter, toggleArrowTool } = useAnnotationActions();

  const { getViewport, setNodes, fitView } = useReactFlow();

  // Until the store is intentionally populated (by schema load or config import),
  // treat all schema nodes as visible so the default browser experience is unchanged.
  const effectiveVisibleIds = useMemo(
    () => schemaInitialized ? visibleNodeIds : new Set(schema.nodes.map((n) => n.id)),
    [schemaInitialized, visibleNodeIds, schema.nodes],
  );

  // Arrows whose attached ends exist and are visible; hidden with their model.
  const visibleArrows = useMemo(() => {
    const blockIds = new Set(textBlocks.keys());
    return [...arrows].filter(([, a]) => isArrowVisible(a, effectiveVisibleIds, blockIds));
  }, [arrows, textBlocks, effectiveVisibleIds]);

  // Build React Flow nodes: visible models plus annotation nodes. Model
  // positions here are only the initial/pinned values; the layout hooks
  // override them via setNodes → onNodesChange → displayNodes. Text blocks
  // and anchors carry their own positions and are never laid out.
  const rfNodes: CanvasNode[] = useMemo(() => {
    const models: ModelNodeData[] = schema.nodes
      .filter((n) => effectiveVisibleIds.has(n.id))
      .map((n) => {
        const pinned = pinnedPositions.get(n.id);
        return {
          id: n.id,
          type: "model",
          position: pinned ?? { x: 0, y: 0 },
          deletable: false, // Backspace never removes a table
          data: {
            nodeId: n.id,
            name: n.name,
            appLabel: n.app_label,
            tags: n.tags,
            fields: n.fields,
          },
        };
      });

    const texts: TextBlockNodeData[] = [...textBlocks].map(([id, b]) => ({
      id,
      type: "text",
      position: { x: b.x, y: b.y },
      width: b.width,
      deletable: true,
      data: { blockId: id },
    }));

    const anchors: AnchorNodeData[] = [];
    for (const [arrowId, a] of visibleArrows) {
      for (const end of ["from", "to"] as ArrowEnd[]) {
        const ep = a[end];
        if (isAttached(ep)) continue;
        anchors.push({
          id: anchorNodeId(arrowId, end),
          type: "anchor",
          position: { x: ep.x - ANCHOR_SIZE / 2, y: ep.y - ANCHOR_SIZE / 2 },
          width: ANCHOR_SIZE,
          height: ANCHOR_SIZE,
          selectable: false,
          deletable: false,
          focusable: false,
          zIndex: 1001, // stays grabbable above elevated nodes
          data: { arrowId, end },
        });
      }
    }

    return [...models, ...texts, ...anchors];
  }, [schema.nodes, effectiveVisibleIds, pinnedPositions, textBlocks, visibleArrows]);

  // Relation edges plus annotation arrows. Edge selection is controlled, so
  // the arrow's `selected` flag is merged in from the store.
  const rfEdges: Edge[] = useMemo(() => {
    const relations: Edge[] = schema.edges
      .filter((e) => effectiveVisibleIds.has(e.source) && effectiveVisibleIds.has(e.target))
      .map((e) => ({
        id: `${e.source}->${e.target}:${e.field_name}`,
        source: e.source,
        target: e.target,
        type: "schema",
        deletable: false,
        data: {
          relation_type: e.relation_type,
          field_name: e.field_name,
          related_name: e.related_name,
          target_field: e.target_field,
          edgeStyle,
        },
        markerEnd:   RELATION_MARKERS[e.relation_type as keyof typeof RELATION_MARKERS]?.markerEnd,
        markerStart: RELATION_MARKERS[e.relation_type as keyof typeof RELATION_MARKERS]?.markerStart,
      }));

    const arrowEdges: ArrowEdgeData[] = visibleArrows.map(([arrowId, a]) => ({
      id: arrowId,
      type: "arrow",
      source: arrowEndNodeId(arrowId, "from", a.from),
      target: arrowEndNodeId(arrowId, "to", a.to),
      deletable: true,
      interactionWidth: 20,
      selected: selectedArrowId === arrowId,
      data: { arrowId, edgeStyle },
    }));

    return [...relations, ...arrowEdges];
  }, [schema.edges, effectiveVisibleIds, edgeStyle, visibleArrows, selectedArrowId]);

  // displayNodes is the authoritative node list passed to <ReactFlow>.
  // It starts from rfNodes and is updated by layout algorithms and user drags.
  const [displayNodes, setDisplayNodes] = useState<CanvasNode[]>(rfNodes);

  // True once React Flow has measured at least one node after the first paint.
  // Used to defer the initial layout until node heights are known.
  const [nodesMeasured, setNodesMeasured] = useState(false);

  // When the canvas empties (hide-all), re-arm the measurement gate.
  useEffect(() => {
    if (rfNodes.length === 0) setNodesMeasured(false);
  }, [rfNodes.length]);

  // Keep a ref to displayNodes so the layout effect can read current measured
  // node sizes without adding displayNodes to the effect's dependency array
  // (which would cause runaway re-layouts on every position tick).
  const displayNodesRef = useRef(displayNodes);
  useEffect(() => { displayNodesRef.current = displayNodes; }, [displayNodes]);

  // Refs for rfNodes/rfEdges so the dagre/ELK layout effect can read their
  // current values without having them as dependencies. This prevents visibility
  // toggles from re-triggering a full layout recalc (which would snap dragged nodes back).
  const rfNodesRef = useRef(rfNodes);
  useEffect(() => { rfNodesRef.current = rfNodes; }, [rfNodes]);
  const rfEdgesRef = useRef(rfEdges);
  useEffect(() => { rfEdgesRef.current = rfEdges; }, [rfEdges]);

  // Track the last import we've applied so we can detect a fresh import.
  const lastAppliedImportIdRef = useRef(importId);
  // Separate ref for the layout effect — prevents dagre/elk from overwriting imported positions.
  const lastLayoutImportIdRef = useRef(importId);

  // Skip fitView on the very first layout application (initial page load).
  const isFirstLayoutRef = useRef(true);
  // Track canvas-initiated suppress version so layout effect can skip recalc.
  const lastSuppressVersionRef = useRef(canvasLayoutSuppressVersion);
  const layoutRunRef = useRef(0);

  // When rfNodes changes (schema reload, visibility toggle, annotation edit),
  // sync displayNodes; see mergeDisplayNodes for what is kept and why.
  useEffect(() => {
    const isImport = importId !== lastAppliedImportIdRef.current;
    if (isImport) lastAppliedImportIdRef.current = importId;
    setDisplayNodes((curr) => mergeDisplayNodes(curr, rfNodes, isImport));
  }, [rfNodes, importId]);

  // Route React Flow position changes (drags, layout updates via setNodes) into
  // displayNodes so the controlled <ReactFlow nodes> prop stays current.
  // Also detect when React Flow has measured node dimensions after the first paint.
  const onNodesChange = useCallback(
    (changes: NodeChange<CanvasNode>[]) => {
      setDisplayNodes((nds) => {
        const next = applyNodeChanges(changes, nds);
        if (!nodesMeasured && next.some((n) => n.measured?.height)) {
          setNodesMeasured(true);
        }
        return next;
      });
    },
    [nodesMeasured],
  );

  // Force layout — only active when force layout is selected.
  // Pass displayNodes (not rfNodes) so the hook can read node.measured dimensions.
  const { pinNode: simPinNode, reheat } = useForceLayout(
    displayNodes,
    rfEdges,
    activeLayout === "organic",
    forceParams,
    importId,
    physicsEnabled,
    () => fitView({ duration: 300 }),
  );

  // Build a size map from the current displayNodes using React Flow's post-paint
  // measurements. Falls back to 220×60 for any node not yet measured (first paint).
  const buildSizeMap = useCallback(() => {
    return new Map(
      displayNodesRef.current.map((n) => [
        n.id,
        { width: n.measured?.width ?? 220, height: n.measured?.height ?? 60 },
      ])
    );
  }, []);

  // Auto-reheat the force simulation when forceParams change (e.g. toolbar spacing
  // slider or SettingsDrawer sliders). Debounced 150ms so rapid slider drags don't
  // fire a reheat on every tick.
  useEffect(() => {
    if (activeLayout !== "organic") return;
    const timer = setTimeout(() => reheat(forceParams), 150);
    return () => clearTimeout(timer);
  }, [forceParams, activeLayout, reheat]);

  // Apply dagre or elk layout whenever the layout mode or visible nodes/edges change.
  // After positioning, always fitView so all nodes are visible.
  // Skip on a fresh import: imported positions already encode the saved layout, so
  // rerunning the algorithm would overwrite them.
  // Wait for nodesMeasured before running the initial layout so ELK/dagre receive
  // actual node heights rather than the 220×60 fallback (avoids zooming too far out).
  useEffect(() => {
    if (!nodesMeasured) return;
    const run = ++layoutRunRef.current;

    if (importId !== lastLayoutImportIdRef.current) {
      lastLayoutImportIdRef.current = importId;
      isFirstLayoutRef.current = false;
      return;
    }

    if (canvasLayoutSuppressVersion !== lastSuppressVersionRef.current) {
      lastSuppressVersionRef.current = canvasLayoutSuppressVersion;
      return;
    }

    // schedules viewport re-fit - "zoom/pan so all visible nodes fit on screen"
    if (activeLayout === "organic") {
      setTimeout(() => fitView({ duration: 300 }), 0);
      return;
    }

    const sizeMap = buildSizeMap();
    isFirstLayoutRef.current = false;

    if (activeLayout === "elk") {
      runElkLayout(rfNodesRef.current, rfEdgesRef.current, sizeMap)
        .then((positioned) => {
          if (run !== layoutRunRef.current) return; // superseded by a newer layout pass
          setNodes(positioned);
          setTimeout(() => fitView({ duration: 300 }), 0);
        })
        .catch((err: unknown) => {
          // ELK is lazy-loaded; the chunk fetch can fail (offline, stale deploy).
          console.error("[schematic] ELK layout 'Auto' failed", err);
        });
      return;
    }
    const direction = activeLayout === "dagre-lr" ? "LR" : "TB";
    const positioned = runDagreLayout(rfNodesRef.current, rfEdgesRef.current, direction, sizeMap);
    setNodes(positioned);
    setTimeout(() => fitView({ duration: 300 }), 0);
  }, [activeLayout, layoutVersion, importId, canvasLayoutSuppressVersion, nodesMeasured, setNodes, fitView, buildSizeMap]);

  // onNodeDragStop — model nodes pin (and reheat the sim when physics is on);
  // annotation nodes commit their new place to the store.
  const onNodeDragStop: OnNodeDrag<CanvasNode> = useCallback(
    (_event, node) => {
      if (node.type === "text") {
        updateTextBlock(node.id, { x: node.position.x, y: node.position.y });
        return;
      }
      if (node.type === "anchor") {
        const { arrowId, end } = node.data;
        updateArrow(arrowId, {
          [end]: { x: node.position.x + ANCHOR_SIZE / 2, y: node.position.y + ANCHOR_SIZE / 2 },
        });
        // A node drag deselects edges; keep the arrow selected.
        setSelectedArrow(arrowId);
        return;
      }
      pinNode(node.id, node.position);
      if (physicsEnabled) simPinNode(node.id, node.position.x, node.position.y);
    },
    [pinNode, simPinNode, physicsEnabled, updateTextBlock, updateArrow, setSelectedArrow],
  );

  // onNodeDrag — live physics: track dragged model node in sim each frame
  const onNodeDrag: OnNodeDrag<CanvasNode> = useCallback(
    (_event, node) => {
      if (node.type !== "model") return;
      if (!liveDragPhysics || !physicsEnabled) return;
      simPinNode(node.id, node.position.x, node.position.y);
    },
    [liveDragPhysics, physicsEnabled, simPinNode],
  );

  // Controlled edge selection: reported here, read back from rfEdges.
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      for (const c of changes) {
        if (c.type !== "select") continue;
        const current = usePhysicsStore.getState().selectedArrowId;
        if (c.selected) setSelectedArrow(c.id);
        else if (current === c.id) setSelectedArrow(null);
      }
    },
    [setSelectedArrow],
  );

  // Only annotations arrive here: models and relation edges are not deletable.
  const onNodesDelete = useCallback(
    (deleted: CanvasNode[]) => {
      for (const n of deleted) if (n.type === "text") removeTextBlock(n.id);
    },
    [removeTextBlock],
  );
  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => {
      for (const e of deleted) {
        if (e.type !== "arrow") continue;
        if (usePhysicsStore.getState().selectedArrowId === e.id) setSelectedArrow(null);
        removeArrow(e.id);
      }
    },
    [removeArrow, setSelectedArrow],
  );

  // Shortcuts (ignored in form fields and while a dialog is open):
  //   T add a text block, A toggle draw-arrow mode, Esc leave it,
  //   Space pause/resume physics in the Organic layout.
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (["INPUT", "TEXTAREA", "SELECT", "BUTTON"].includes(target.tagName)) return;
      if (target.isContentEditable) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector("[data-dialog-backdrop]")) return;

      if (e.key === "Escape") {
        if (annotationTool) setAnnotationTool(null);
        return;
      }
      if (e.key === "t" || e.key === "T") {
        e.preventDefault();
        addTextBlockAtCenter("note");
        return;
      }
      if (e.key === "a" || e.key === "A") {
        e.preventDefault();
        toggleArrowTool();
        return;
      }
      if (e.code === "Space" && activeLayout === "organic") {
        e.preventDefault();
        setPhysicsEnabled(!physicsEnabled);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    activeLayout,
    physicsEnabled,
    setPhysicsEnabled,
    annotationTool,
    setAnnotationTool,
    addTextBlockAtCenter,
    toggleArrowTool,
  ]);

  const onMoveEnd = useCallback(() => {
    setViewport(getViewport());
  }, [getViewport, setViewport]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={displayNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        deleteKeyCode={["Backspace", "Delete"]}
        onNodeDragStop={onNodeDragStop}
        onNodeDrag={onNodeDrag}
        onMoveEnd={onMoveEnd}
        proOptions={{ hideAttribution: true }}
        minZoom={0.05}
        maxZoom={2}
      >
        <MarkerDefs />

        {backgroundStyle !== "none" && (
          <Background
            variant={backgroundStyle === "lines" ? BackgroundVariant.Lines : BackgroundVariant.Dots}
            gap={backgroundStyle === "lines" ? 24 : 20}
            color={backgroundStyle === "lines" ? "#e5e7eb" : "#d1d5db"}
            size={backgroundStyle === "lines" ? 1 : 1.5}
          />
        )}

        {/* Zoom controls — bottom-left */}
        <Panel position="bottom-left">
          <Controls showInteractive={false} />
        </Panel>

        {minimapVisible && (
          <MiniMap
            nodeColor={(node) => {
              if (node.type === "anchor") return "transparent";
              if (node.type === "text") return textBlocks.get(node.id)?.color ?? DEFAULT_NOTE_COLOR;
              const data = node.data as ModelNodeData["data"];
              return appColor(data?.appLabel ?? "", colorPalette);
            }}
            maskColor="rgba(255,255,255,0.7)"
          />
        )}

        {!minimapVisible && (
          <Panel position="bottom-right">
            <button
              className="px-2 py-1 text-xs bg-white border border-gray-200 rounded shadow hover:bg-gray-50 text-gray-600"
              onClick={() => setMinimapVisible(true)}
              title="Show minimap"
            >
              Map
            </button>
          </Panel>
        )}
      </ReactFlow>

      {/* × button overlaid on the minimap's top-right corner.
          MiniMap renders at bottom: 8px, right: 8px, size ~200×150px. */}
      {minimapVisible && (
        <button
          onClick={() => setMinimapVisible(false)}
          title="Hide minimap"
          className="minimap-close absolute z-10 bg-white/90 border border-gray-200 rounded text-gray-400 hover:text-gray-600 hover:bg-white leading-none"
          style={{ bottom: 150, right: 10, width: 16, height: 16, fontSize: 11, padding: 0 }}
        >
          ×
        </button>
      )}

      <ArrowDrawLayer />
      <SettingsDrawer schema={schema} onReheat={reheat} />
    </div>
  );
}
