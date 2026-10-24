// The drawing surface (React Flow). Loaded lazily by DiagramPanel.
import {
  addEdge,
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Connection,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { useCallback, useEffect, useRef } from "react";
import { BoxNode } from "./BoxNode";
import { fromFlow, newId, toDiagramEdge, toFlowEdge, toFlowNode, type BoxData, type BoxNode as BoxNodeType, type FlowEdge } from "./flow";
import { EDGE_STYLES, SHAPE_ORDER, SHAPES, type Diagram, type DiagramEdge, type EdgeStyle, type NodeShape } from "./types";
import "./diagram.css";

const nodeTypes = { box: BoxNode };

interface DiagramCanvasProps {
  initial: Diagram;
  onChange(diagram: Diagram): void;
}

export default function DiagramCanvas(props: DiagramCanvasProps) {
  return (
    <ReactFlowProvider>
      <Canvas {...props} />
    </ReactFlowProvider>
  );
}

function Canvas({ initial, onChange }: DiagramCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState<BoxNodeType>(initial.nodes.map(toFlowNode));
  const [edges, setEdges, onEdgesChange] = useEdgesState<FlowEdge>(initial.edges.map(toFlowEdge));
  const { screenToFlowPosition, deleteElements } = useReactFlow<BoxNodeType, FlowEdge>();
  const wrapper = useRef<HTMLDivElement>(null);
  const labelInput = useRef<HTMLInputElement>(null);
  const addedCount = useRef(0);
  const lastSaved = useRef(JSON.stringify(initial));

  // Report real edits only; selection and measuring changes don't alter the diagram.
  useEffect(() => {
    const diagram = fromFlow(nodes, edges);
    const json = JSON.stringify(diagram);
    if (json === lastSaved.current) return;
    lastSaved.current = json;
    onChange(diagram);
  }, [nodes, edges, onChange]);

  const focusLabel = () => requestAnimationFrame(() => labelInput.current?.select());

  const select = useCallback(
    (id: string, kind: "node" | "edge") => {
      setNodes((ns) => ns.map((n) => ({ ...n, selected: kind === "node" && n.id === id })));
      setEdges((es) => es.map((e) => ({ ...e, selected: kind === "edge" && e.id === id })));
      focusLabel();
    },
    [setNodes, setEdges],
  );

  function addNode(shape: NodeShape) {
    const rect = wrapper.current?.getBoundingClientRect();
    if (!rect) return;
    // Place new boxes on a 3×3 grid around the view's center so repeated clicks don't overlap.
    const slot = addedCount.current++ % 9;
    const dx = ((slot % 3) - 1) * 180;
    const dy = (Math.floor(slot / 3) - 1) * 110;
    const position = screenToFlowPosition({ x: rect.left + rect.width / 2 - 60 + dx, y: rect.top + rect.height / 2 - 24 + dy });
    const node: BoxNodeType = { ...toFlowNode({ id: newId("n"), shape, label: SHAPES[shape].label, ...position }), selected: true };
    setNodes((ns) => [...ns.map((n) => ({ ...n, selected: false })), node]);
    setEdges((es) => es.map((e) => ({ ...e, selected: false })));
    focusLabel();
  }

  const onConnect = useCallback(
    (c: Connection) => {
      if (c.source === c.target) return;
      const edge: DiagramEdge = {
        id: newId("e"),
        source: c.source,
        target: c.target,
        sourceHandle: c.sourceHandle ?? undefined,
        targetHandle: c.targetHandle ?? undefined,
        label: "",
        style: "sync",
      };
      setEdges((es) => addEdge(toFlowEdge(edge), es));
    },
    [setEdges],
  );

  function updateNode(id: string, patch: Partial<BoxData>) {
    setNodes((ns) => ns.map((n) => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)));
  }

  function updateEdge(id: string, patch: Partial<DiagramEdge>) {
    setEdges((es) => es.map((e) => (e.id === id ? { ...toFlowEdge({ ...toDiagramEdge(e), ...patch }), selected: e.selected } : e)));
  }

  const selectedNode = nodes.find((n) => n.selected);
  const selectedEdge = selectedNode ? undefined : edges.find((e) => e.selected);

  return (
    <div className="diagram-flow" ref={wrapper}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeDoubleClick={(_, node) => select(node.id, "node")}
        onEdgeDoubleClick={(_, edge) => select(edge.id, "edge")}
        connectionMode={ConnectionMode.Loose}
        deleteKeyCode={["Backspace", "Delete"]}
        zoomOnDoubleClick={false}
        snapToGrid
        snapGrid={[12, 12]}
        minZoom={0.3}
        fitView={initial.nodes.length > 0}
        fitViewOptions={{ maxZoom: 1, padding: 0.2 }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} />
        <Controls showInteractive={false} />

        <Panel position="top-left" className="diagram-palette" aria-label="Add a box">
          {SHAPE_ORDER.map((shape) => (
            <button key={shape} type="button" className="palette-btn" title={`Add ${SHAPES[shape].label}: ${SHAPES[shape].hint}`} onClick={() => addNode(shape)}>
              <span className={`palette-icon icon-${shape}`} aria-hidden="true" />
              {SHAPES[shape].label}
            </button>
          ))}
        </Panel>

        <Panel position="bottom-center" className="diagram-inspector">
          {selectedNode ? (
            <>
              <input
                ref={labelInput}
                className="input"
                aria-label="Box label"
                value={selectedNode.data.label}
                onChange={(e) => updateNode(selectedNode.id, { label: e.target.value })}
              />
              <select
                className="input"
                aria-label="Box shape"
                value={selectedNode.data.shape}
                onChange={(e) => updateNode(selectedNode.id, { shape: e.target.value as NodeShape })}
              >
                {SHAPE_ORDER.map((shape) => (
                  <option key={shape} value={shape}>
                    {SHAPES[shape].label}
                  </option>
                ))}
              </select>
              <button type="button" className="btn btn-ghost" onClick={() => deleteElements({ nodes: [{ id: selectedNode.id }] })}>
                Delete
              </button>
            </>
          ) : selectedEdge ? (
            <>
              <input
                ref={labelInput}
                className="input"
                aria-label="Arrow label"
                placeholder="Label, e.g. writes"
                value={typeof selectedEdge.label === "string" ? selectedEdge.label : ""}
                onChange={(e) => updateEdge(selectedEdge.id, { label: e.target.value })}
              />
              <select
                className="input"
                aria-label="Arrow style"
                value={selectedEdge.data?.style ?? "sync"}
                onChange={(e) => updateEdge(selectedEdge.id, { style: e.target.value as EdgeStyle })}
              >
                {(Object.keys(EDGE_STYLES) as EdgeStyle[]).map((style) => (
                  <option key={style} value={style}>
                    {EDGE_STYLES[style].label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() =>
                  updateEdge(selectedEdge.id, {
                    source: selectedEdge.target,
                    target: selectedEdge.source,
                    sourceHandle: selectedEdge.targetHandle ?? undefined,
                    targetHandle: selectedEdge.sourceHandle ?? undefined,
                  })
                }
              >
                Reverse
              </button>
              <button type="button" className="btn btn-ghost" onClick={() => deleteElements({ edges: [{ id: selectedEdge.id }] })}>
                Delete
              </button>
            </>
          ) : (
            <p className="diagram-hint">
              {nodes.length === 0
                ? "Add a box from the toolbar to start."
                : "Drag from a dot to connect · double-click to rename · Delete removes the selection"}
            </p>
          )}
        </Panel>
      </ReactFlow>
    </div>
  );
}
