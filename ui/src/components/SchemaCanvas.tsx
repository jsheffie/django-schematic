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
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  Panel,
  applyNodeChanges,
  type Edge,
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
import { edgeTypes } from "./EdgeTypes";
import { useForceLayout } from "../hooks/useForceLayout";
import { runDagreLayout } from "../hooks/useLayout";
import SettingsDrawer from "./SettingsDrawer";

const nodeTypes: NodeTypes = { model: ModelNode } as unknown as NodeTypes;

interface Props {
  schema: SchemaGraph;
}

export default function SchemaCanvas({ schema }: Props) {
  const visibleNodeIds = useSchemaStore((s) => s.visibleNodeIds);
  const pinnedPositions = useSchemaStore((s) => s.pinnedPositions);
  const activeLayout = useSchemaStore((s) => s.activeLayout);
  const setViewport = useSchemaStore((s) => s.setViewport);
  const pinNode = useSchemaStore((s) => s.pinNode);

  const edgeStyle = usePhysicsStore((s) => s.edgeStyle);
  const liveDragPhysics = usePhysicsStore((s) => s.liveDragPhysics);
  const forceParams = usePhysicsStore((s) => s.forceParams);
  const minimapVisible = usePhysicsStore((s) => s.minimapVisible);
  const setMinimapVisible = usePhysicsStore((s) => s.setMinimapVisible);

  const { getViewport, setNodes } = useReactFlow();

  // Build React Flow nodes from API data, filtered to visible set.
  // Positions here are only the initial/pinned values; the layout hooks
  // will override them via setNodes → onNodesChange → displayNodes.
  const rfNodes: ModelNodeData[] = useMemo(() => {
    return schema.nodes
      .filter((n) => visibleNodeIds.has(n.id))
      .map((n) => {
        const pinned = pinnedPositions.get(n.id);
        return {
          id: n.id,
          type: "model",
          position: pinned ?? { x: 0, y: 0 },
          data: {
            nodeId: n.id,
            name: n.name,
            appLabel: n.app_label,
            tags: n.tags,
            fields: n.fields,
          },
        };
      });
  }, [schema.nodes, visibleNodeIds, pinnedPositions]);

  // Build React Flow edges, passing edgeStyle through data so SchemaEdge can branch
  const rfEdges: Edge[] = useMemo(() => {
    const visibleSet = visibleNodeIds;
    return schema.edges
      .filter((e) => visibleSet.has(e.source) && visibleSet.has(e.target))
      .map((e) => ({
        id: `${e.source}->${e.target}:${e.field_name}`,
        source: e.source,
        target: e.target,
        type: "schema",
        data: {
          relation_type: e.relation_type,
          field_name: e.field_name,
          edgeStyle,
        },
        markerEnd: { type: "arrowclosed" as const, color: "#6b7280" },
      }));
  }, [schema.edges, visibleNodeIds, edgeStyle]);

  // displayNodes is the authoritative node list passed to <ReactFlow>.
  // It starts from rfNodes and is updated by layout algorithms and user drags.
  const [displayNodes, setDisplayNodes] = useState<ModelNodeData[]>(rfNodes);

  // When rfNodes changes (schema reload or visibility toggle), sync displayNodes.
  // Preserve positions for nodes already on canvas; new nodes start at {x:0,y:0}.
  useEffect(() => {
    setDisplayNodes((curr) => {
      const posMap = new Map(curr.map((n) => [n.id, n.position]));
      return rfNodes.map((n) => ({
        ...n,
        position: posMap.get(n.id) ?? n.position,
      }));
    });
  }, [rfNodes]);

  // Route React Flow position changes (drags, layout updates via setNodes) into
  // displayNodes so the controlled <ReactFlow nodes> prop stays current.
  const onNodesChange = useCallback(
    (changes: NodeChange<ModelNodeData>[]) =>
      setDisplayNodes((nds) => applyNodeChanges(changes, nds)),
    [],
  );

  // Force layout — only active when force layout is selected
  const { pinNode: simPinNode, reheat } = useForceLayout(
    rfNodes,
    rfEdges,
    activeLayout === "force",
    forceParams,
  );

  // Apply dagre layout whenever the layout mode or visible nodes/edges change
  useEffect(() => {
    if (activeLayout === "force") return;
    const direction = activeLayout === "dagre-lr" ? "LR" : "TB";
    const positioned = runDagreLayout(rfNodes, rfEdges, direction);
    setNodes(positioned);
  }, [activeLayout, rfNodes, rfEdges, setNodes]);

  // onNodeDragStop — always pins in Zustand + d3 sim
  const onNodeDragStop: OnNodeDrag<ModelNodeData> = useCallback(
    (_event, node) => {
      pinNode(node.id, node.position);
      simPinNode(node.id, node.position.x, node.position.y);
    },
    [pinNode, simPinNode],
  );

  // onNodeDrag — live physics: track dragged node in sim each frame
  const onNodeDrag: OnNodeDrag<ModelNodeData> = useCallback(
    (_event, node) => {
      if (!liveDragPhysics) return;
      simPinNode(node.id, node.position.x, node.position.y);
    },
    [liveDragPhysics, simPinNode],
  );

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
        onNodeDragStop={onNodeDragStop}
        onNodeDrag={onNodeDrag}
        onMoveEnd={onMoveEnd}
        proOptions={{ hideAttribution: true }}
        fitView
        minZoom={0.05}
        maxZoom={2}
      >
        <Background gap={20} color="#e5e7eb" />
        <Controls />
        {minimapVisible ? (
          <MiniMap
            nodeColor={(node) => {
              const data = node.data as ModelNodeData["data"];
              return appColor(data?.appLabel ?? "");
            }}
            maskColor="rgba(255,255,255,0.7)"
          />
        ) : (
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
      <SettingsDrawer onReheat={reheat} />
    </div>
  );
}
