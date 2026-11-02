import { BaseEdge, EdgeLabelRenderer, getSmoothStepPath, type EdgeProps } from "@xyflow/react";
import { memo } from "react";
import type { FlowEdge } from "./flow";

/** A smooth-step arrow whose label is HTML, so a note can sit under the label. */
export const LabeledEdge = memo(function LabeledEdge(props: EdgeProps<FlowEdge>) {
  const { id, sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, markerEnd, data, selected } = props;
  const [path, labelX, labelY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const label = data?.label;
  const note = data?.note;

  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} />
      {(label || note) && (
        <EdgeLabelRenderer>
          <div
            className={"edge-label" + (selected ? " is-selected" : "")}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          >
            {label && <span>{label}</span>}
            {note && <span className="edge-note">{note}</span>}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
});
