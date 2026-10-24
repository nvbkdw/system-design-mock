import { Handle, Position, type NodeProps } from "@xyflow/react";
import { memo } from "react";
import type { BoxNode as BoxNodeType } from "./flow";
import { SHAPES } from "./types";

const SIDES = [
  ["t", Position.Top],
  ["r", Position.Right],
  ["b", Position.Bottom],
  ["l", Position.Left],
] as const;

/** Shapes CSS can't draw with borders are drawn as a stretched SVG outline. */
function Outline({ shape }: { shape: BoxNodeType["data"]["shape"] }) {
  if (shape === "database") {
    return (
      <svg className="box-outline" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <path d="M1 9 A49 8 0 0 1 99 9 V51 A49 8 0 0 1 1 51 Z" />
        <path d="M1 9 A49 8 0 0 0 99 9" fill="none" />
      </svg>
    );
  }
  if (shape === "queue") {
    return (
      <svg className="box-outline" viewBox="0 0 100 60" preserveAspectRatio="none" aria-hidden="true">
        <polygon points="12,1 88,1 99,30 88,59 12,59 1,30" />
      </svg>
    );
  }
  return null;
}

export const BoxNode = memo(function BoxNode({ data, selected }: NodeProps<BoxNodeType>) {
  return (
    <div className={`box box-${data.shape}${selected ? " is-selected" : ""}`} title={SHAPES[data.shape].label}>
      <Outline shape={data.shape} />
      <span className="box-label">{data.label || SHAPES[data.shape].label}</span>
      {SIDES.map(([id, position]) => (
        <Handle key={id} id={id} type="source" position={position} className="box-handle" />
      ))}
    </div>
  );
});
