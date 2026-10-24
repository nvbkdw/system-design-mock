// Conversions between the saved diagram model and React Flow's node/edge objects.
import { MarkerType, type Edge, type Node } from "@xyflow/react";
import type { Diagram, DiagramEdge, DiagramNode, EdgeStyle, NodeShape } from "./types";

export type BoxData = { label: string; shape: NodeShape };
export type BoxNode = Node<BoxData, "box">;
export type FlowEdge = Edge<{ style: EdgeStyle }>;

export const newId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 9)}`;

export function toFlowNode(node: DiagramNode): BoxNode {
  return { id: node.id, type: "box", position: { x: node.x, y: node.y }, data: { label: node.label, shape: node.shape } };
}

export function toFlowEdge(edge: DiagramEdge): FlowEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    type: "smoothstep",
    label: edge.label || undefined,
    labelBgPadding: [6, 3],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    className: edge.style === "async" ? "edge-async" : undefined,
    data: { style: edge.style },
  };
}

export function toDiagramEdge(edge: FlowEdge): DiagramEdge {
  return {
    id: edge.id,
    source: edge.source,
    target: edge.target,
    ...(edge.sourceHandle && { sourceHandle: edge.sourceHandle }),
    ...(edge.targetHandle && { targetHandle: edge.targetHandle }),
    label: typeof edge.label === "string" ? edge.label : "",
    style: edge.data?.style ?? "sync",
  };
}

export function fromFlow(nodes: BoxNode[], edges: FlowEdge[]): Diagram {
  return {
    nodes: nodes.map((n) => ({
      id: n.id,
      shape: n.data.shape,
      label: n.data.label,
      // Whole pixels keep saved data small and stop sub-pixel drags from counting as edits.
      x: Math.round(n.position.x),
      y: Math.round(n.position.y),
    })),
    edges: edges.map(toDiagramEdge),
  };
}
