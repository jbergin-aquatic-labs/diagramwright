"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  useReactFlow,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  type Connection,
  type OnSelectionChangeParams,
  type NodeChange,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";

import { useDiagramStore } from "@/store/diagramStore";
import { CustomNode } from "./CustomNode";
import { DND_MIME } from "./Sidebar";
import type { DiagramNodeKind } from "@/types/diagram";

const nodeTypes = { diagram: CustomNode };

function toRfNode(
  n: { id: string; label: string; kind: DiagramNodeKind; position: { x: number; y: number } },
  selected: boolean,
): Node {
  return {
    id: n.id,
    type: "diagram",
    position: n.position,
    data: { label: n.label, kind: n.kind },
    selected,
  };
}

function toRfEdge(
  e: { id: string; source: string; target: string; label?: string },
  selected: boolean,
): Edge {
  return {
    id: e.id,
    source: e.source,
    target: e.target,
    label: e.label,
    selected,
    labelBgPadding: [6, 2],
    labelBgBorderRadius: 4,
  };
}

function CanvasInner() {
  const diagram = useDiagramStore((s) => s.diagram);
  const selectedNodeId = useDiagramStore((s) => s.selectedNodeId);
  const selectedEdgeId = useDiagramStore((s) => s.selectedEdgeId);
  const addNode = useDiagramStore((s) => s.addNode);
  const addEdge = useDiagramStore((s) => s.addEdge);
  const updateNodePosition = useDiagramStore((s) => s.updateNodePosition);
  const removeNodes = useDiagramStore((s) => s.removeNodes);
  const removeEdges = useDiagramStore((s) => s.removeEdges);
  const selectNode = useDiagramStore((s) => s.selectNode);
  const selectEdge = useDiagramStore((s) => s.selectEdge);

  const { screenToFlowPosition } = useReactFlow();
  const wrapperRef = useRef<HTMLDivElement>(null);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState<Node>([]);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Sync store -> React Flow whenever structure, labels, or selection change.
  // Positions are committed to the store on drag stop, so during a drag the
  // store reference is stable and this effect does not interrupt the drag.
  useEffect(() => {
    setRfNodes(diagram.nodes.map((n) => toRfNode(n, n.id === selectedNodeId)));
  }, [diagram.nodes, selectedNodeId, setRfNodes]);

  useEffect(() => {
    setRfEdges(diagram.edges.map((e) => toRfEdge(e, e.id === selectedEdgeId)));
  }, [diagram.edges, selectedEdgeId, setRfEdges]);

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      onNodesChange(changes);
      for (const change of changes) {
        if (
          change.type === "position" &&
          change.dragging === false &&
          change.position
        ) {
          updateNodePosition(change.id, change.position);
        }
      }
    },
    [onNodesChange, updateNodePosition],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      if (connection.source && connection.target) {
        addEdge(connection.source, connection.target);
      }
    },
    [addEdge],
  );

  const onSelectionChange = useCallback(
    (params: OnSelectionChangeParams) => {
      const node = params.nodes[0]?.id ?? null;
      const edge = params.edges[0]?.id ?? null;
      if (node) selectNode(node);
      else if (edge) selectEdge(edge);
      else {
        selectNode(null);
      }
    },
    [selectNode, selectEdge],
  );

  const onNodesDelete = useCallback(
    (deleted: Node[]) => removeNodes(deleted.map((n) => n.id)),
    [removeNodes],
  );

  const onEdgesDelete = useCallback(
    (deleted: Edge[]) => removeEdges(deleted.map((e) => e.id)),
    [removeEdges],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const kind = e.dataTransfer.getData(DND_MIME) as DiagramNodeKind;
      if (!kind) return;
      const position = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      addNode(kind, position);
    },
    [screenToFlowPosition, addNode],
  );

  const defaultEdgeOptions = useMemo(
    () => ({
      markerEnd: { type: MarkerType.ArrowClosed, width: 18, height: 18 },
    }),
    [],
  );

  return (
    <div ref={wrapperRef} className="h-full w-full">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onSelectionChange={onSelectionChange}
        onNodesDelete={onNodesDelete}
        onEdgesDelete={onEdgesDelete}
        onDrop={onDrop}
        onDragOver={onDragOver}
        defaultEdgeOptions={defaultEdgeOptions}
        deleteKeyCode={["Backspace", "Delete"]}
        fitView
        fitViewOptions={{ padding: 0.3, maxZoom: 1 }}
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
        <Controls className="!border-border !bg-surface !shadow-sm" />
        <MiniMap
          pannable
          zoomable
          className="!bg-surface"
          maskColor="rgba(100,116,139,0.2)"
          nodeColor="var(--color-accent)"
        />
      </ReactFlow>
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}
