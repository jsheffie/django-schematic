/**
 * Force-directed layout hook using d3-force.
 *
 * Runs a Barnes-Hut-style N-body simulation to produce the bouncing settle
 * animation on initial load — equivalent to vis-network's default physics.
 *
 * See: .claude/docs/vis-network-physics-and-d3-force-equivalent.md
 */
import { useEffect, useRef } from "react";
import { useReactFlow, type Node, type Edge } from "@xyflow/react";
import * as d3 from "d3-force";

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
}

export function useForceLayout(nodes: Node[], edges: Edge[], enabled: boolean) {
  const { setNodes } = useReactFlow();
  // Keep a stable ref to the simulation so we can stop/restart on changes
  const simRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);

  useEffect(() => {
    if (!enabled || nodes.length === 0) {
      simRef.current?.stop();
      return;
    }

    // Stop any running simulation before starting a new one
    simRef.current?.stop();

    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      // Re-use existing positions if available (preserves pinned nodes)
      x: n.position.x || Math.random() * 800,
      y: n.position.y || Math.random() * 600,
      // d3 convention: fx/fy fix a node in place
      fx: n.dragging === false && n.position.x ? n.position.x : undefined,
      fy: n.dragging === false && n.position.y ? n.position.y : undefined,
    }));

    const simLinks = edges.map((e) => ({ source: e.source, target: e.target }));

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .force(
        "link",
        d3
          .forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(180)
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(-400))
      .force("center", d3.forceCenter(400, 300))
      .force("collide", d3.forceCollide<SimNode>(80));

    simulation.on("tick", () => {
      setNodes((prev) =>
        prev.map((n) => {
          const sim = simNodes.find((s) => s.id === n.id);
          if (!sim) return n;
          return { ...n, position: { x: sim.x ?? 0, y: sim.y ?? 0 } };
        })
      );
    });

    simRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes.length, edges.length, setNodes, enabled]);

  /**
   * Pin a node at its current position and reheat the simulation
   * for the remaining free nodes. Call this from onNodeDragStop.
   */
  function pinNode(nodeId: string, x: number, y: number) {
    const sim = simRef.current;
    if (!sim) return;
    const simNode = sim.nodes().find((n) => n.id === nodeId);
    if (simNode) {
      simNode.fx = x;
      simNode.fy = y;
      sim.alpha(0.3).restart();
    }
  }

  /**
   * Release a pinned node back into the simulation.
   */
  function unpinNode(nodeId: string) {
    const sim = simRef.current;
    if (!sim) return;
    const simNode = sim.nodes().find((n) => n.id === nodeId);
    if (simNode) {
      simNode.fx = undefined;
      simNode.fy = undefined;
      sim.alpha(0.3).restart();
    }
  }

  return { pinNode, unpinNode };
}
