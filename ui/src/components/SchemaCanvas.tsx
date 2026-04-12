/**
 * Main canvas component. Converts the SchemaGraph API response into React Flow
 * nodes and edges, applies the active layout, and renders the graph.
 */
import { useCallback, useEffect, useMemo } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Edge,
  type NodeTypes,
  type OnNodeDrag,
  useReactFlow,
} from "@xyflow/react";
import type { SchemaGraph } from "../lib/types";
import { useSchemaStore } from "../store/schemaStore";
import { appColor } from "../lib/colors";
import { ModelNode, type ModelNodeData } from "./ModelNode";
import { edgeTypes } from "./EdgeTypes";
import { useForceLayout } from "../hooks/useForceLayout";
import { runDagreLayout } from "../hooks/useLayout";

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
  const { getViewport, setNodes } = useReactFlow();

  // Build React Flow nodes from API data, filtered to visible set
  const rfNodes: ModelNodeData[] = useMemo(() => {
    return schema.nodes
      .filter((n) => visibleNodeIds.has(n.id))
      .map((n) => {
        const pinned = pinnedPositions.get(n.id);
        return {
          id: n.id,
          type: "model",
          position: pinned ?? { x: 0, y: 0 }, // d3-force will override unpinned
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

  // Build React Flow edges
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
        },
        markerEnd: { type: "arrowclosed" as const, color: "#6b7280" },
      }));
  }, [schema.edges, visibleNodeIds]);

  // Run d3-force simulation — only when force layout is active
  const { pinNode: simPinNode } = useForceLayout(rfNodes, rfEdges, activeLayout === "force");

  // Apply dagre layout whenever the layout mode or visible nodes/edges change
  useEffect(() => {
    if (activeLayout === "force") return;
    const direction = activeLayout === "dagre-lr" ? "LR" : "TB";
    const positioned = runDagreLayout(rfNodes, rfEdges, direction);
    setNodes(positioned);
  }, [activeLayout, rfNodes, rfEdges, setNodes]);

  const onNodeDragStop: OnNodeDrag<ModelNodeData> = useCallback(
    (_event, node) => {
      // Pin in both Zustand state and d3 simulation
      pinNode(node.id, node.position);
      simPinNode(node.id, node.position.x, node.position.y);
    },
    [pinNode, simPinNode]
  );

  const onMoveEnd = useCallback(() => {
    setViewport(getViewport());
  }, [getViewport, setViewport]);

  return (
    <ReactFlow
      nodes={rfNodes}
      edges={rfEdges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onNodeDragStop={onNodeDragStop}
      onMoveEnd={onMoveEnd}
      fitView
      minZoom={0.05}
      maxZoom={2}
    >
      <Background gap={20} color="#e5e7eb" />
      <Controls />
      <MiniMap
        nodeColor={(node) => {
          const data = node.data as ModelNodeData['data'];
          return appColor(data?.appLabel ?? "");
        }}
        maskColor="rgba(255,255,255,0.7)"
      />
    </ReactFlow>
  );
}
