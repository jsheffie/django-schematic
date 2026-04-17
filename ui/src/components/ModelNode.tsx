import { memo, useState } from "react";
import { Handle, Position, useReactFlow, type Node, type NodeProps } from "@xyflow/react";
import { useSchemaStore } from "../store/schemaStore";
import { usePhysicsStore } from "../store/physicsStore";
import { appColors } from "../lib/colors";
import type { FieldInfo } from "../lib/types";

export type ModelNodeData = Node<{
  nodeId: string;
  name: string;
  appLabel: string;
  tags: string[];
  fields: FieldInfo[];
}, 'model'>;

function FieldRow({ field }: { field: FieldInfo }) {
  return (
    <div
      className={`flex items-center gap-2 px-2 py-0.5 text-xs ${
        field.is_relation ? "text-blue-700 font-medium" : "text-gray-600"
      }`}
    >
      <span className="flex-1 truncate">{field.name}</span>
      <span className="text-gray-400 shrink-0">{field.field_type}</span>
      {field.null && <span className="text-gray-300">null</span>}
    </div>
  );
}

export const ModelNode = memo(function ModelNode({
  data,
}: NodeProps<ModelNodeData>) {
  const [showHidePrompt, setShowHidePrompt] = useState(false);

  const isExpanded = useSchemaStore((s) => s.expandedNodeIds.has(data.nodeId));
  const toggleFieldExpansion = useSchemaStore((s) => s.toggleFieldExpansion);
  const hideNodeFromCanvas = useSchemaStore((s) => s.hideNodeFromCanvas);
  const colorPalette = usePhysicsStore((s) => s.colorPalette);
  const { getNode } = useReactFlow();

  const { border: borderColor, bg: bgColor } = appColors(data.appLabel, colorPalette);

  const isAbstract = data.tags.includes("abstract");
  const isProxy = data.tags.includes("proxy");

  return (
    <div
      className="relative rounded shadow-sm min-w-36 text-sm"
      style={{
        border: `2px solid ${borderColor}`,
        borderStyle: isAbstract ? "dashed" : "solid",
        backgroundColor: isProxy ? "#fff" : bgColor,
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* Double-click hide confirmation */}
      {showHidePrompt && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 rounded bg-white/95 p-2">
          <span className="text-xs font-medium text-gray-700">Hide this model?</span>
          <div className="flex gap-1.5">
            <button
              className="rounded bg-gray-700 px-2.5 py-1 text-xs text-white hover:bg-gray-900"
              onClick={() => {
              const pos = getNode(data.nodeId)?.position ?? { x: 0, y: 0 };
              hideNodeFromCanvas(data.nodeId, pos);
              setShowHidePrompt(false);
            }}
            >
              Hide
            </button>
            <button
              className="rounded bg-gray-100 px-2.5 py-1 text-xs text-gray-700 hover:bg-gray-200"
              onClick={() => setShowHidePrompt(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Header */}
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer select-none"
        style={{ borderBottom: isExpanded ? `1px solid ${borderColor}` : "none" }}
        onClick={() => toggleFieldExpansion(data.nodeId)}
        onDoubleClick={(e) => { e.stopPropagation(); setShowHidePrompt(true); }}
      >
        <span className="font-semibold flex-1 truncate">{data.name}</span>
        {isAbstract && (
          <span className="text-xs text-gray-400 shrink-0">abstract</span>
        )}
        {isProxy && (
          <span className="text-xs text-gray-400 shrink-0">proxy</span>
        )}
        <span className="text-xs shrink-0" style={{ color: borderColor }}>
          {data.appLabel}
        </span>
      </div>

      {/* Field list */}
      {isExpanded && (
        <div className="py-1">
          {data.fields.length === 0 ? (
            <div className="px-2 py-0.5 text-xs text-gray-400">no fields</div>
          ) : (
            data.fields.map((f) => <FieldRow key={f.name} field={f} />)
          )}
        </div>
      )}

      <Handle type="source" position={Position.Right} />
    </div>
  );
});
