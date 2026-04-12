import { memo } from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { useSchemaStore } from "../store/schemaStore";
import { appColor, appColorBg } from "../lib/colors";
import type { FieldInfo } from "../lib/types";

export interface ModelNodeData extends Record<string, unknown> {
  nodeId: string;
  name: string;
  appLabel: string;
  tags: string[];
  fields: FieldInfo[];
}

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
  const isExpanded = useSchemaStore((s) => s.expandedNodeIds.has(data.nodeId));
  const toggleFieldExpansion = useSchemaStore((s) => s.toggleFieldExpansion);
  const borderColor = appColor(data.appLabel);
  const bgColor = appColorBg(data.appLabel);

  const isAbstract = data.tags.includes("abstract");
  const isProxy = data.tags.includes("proxy");

  return (
    <div
      className="rounded shadow-sm min-w-36 text-sm"
      style={{
        border: `2px solid ${borderColor}`,
        borderStyle: isAbstract ? "dashed" : "solid",
        backgroundColor: isProxy ? "#fff" : bgColor,
      }}
    >
      <Handle type="target" position={Position.Left} />

      {/* Header */}
      <div
        className="flex items-center gap-1 px-2 py-1 cursor-pointer select-none"
        style={{ borderBottom: isExpanded ? `1px solid ${borderColor}` : "none" }}
        onClick={() => toggleFieldExpansion(data.nodeId)}
      >
        <span className="font-semibold flex-1 truncate">{data.name}</span>
        {isAbstract && (
          <span className="text-xs text-gray-400 shrink-0">abstract</span>
        )}
        {isProxy && (
          <span className="text-xs text-gray-400 shrink-0">proxy</span>
        )}
        <span
          className="text-xs text-gray-400 shrink-0"
          style={{ color: borderColor }}
        >
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
