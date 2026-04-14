/**
 * Force-directed layout hook using d3-force.
 *
 * Runs a Barnes-Hut-style N-body simulation to produce the bouncing settle
 * animation on initial load — equivalent to vis-network's default physics.
 *
 * See: .claude/docs/vis-network-physics-and-d3-force-equivalent.md
 */
import { useCallback, useEffect, useRef } from "react";
import { useReactFlow, type Node, type Edge } from "@xyflow/react";
import * as d3 from "d3-force";
import { DEFAULT_FORCE_PARAMS, type ForceParams } from "../store/physicsStore";

interface SimNode extends d3.SimulationNodeDatum {
  id: string;
}

export function useForceLayout(
  nodes: Node[],
  edges: Edge[],
  enabled: boolean,
  params: ForceParams = DEFAULT_FORCE_PARAMS,
  importId: number = 0,
  physicsEnabled: boolean = true,
) {
  const { setNodes } = useReactFlow();
  const simRef = useRef<d3.Simulation<SimNode, undefined> | null>(null);
  const physicsEnabledRef = useRef(physicsEnabled);

  // Keep ref in sync so callbacks don't go stale
  useEffect(() => {
    physicsEnabledRef.current = physicsEnabled;
  }, [physicsEnabled]);

  useEffect(() => {
    if (!enabled || nodes.length === 0) {
      simRef.current?.stop();
      return;
    }

    simRef.current?.stop();

    const simNodes: SimNode[] = nodes.map((n) => ({
      id: n.id,
      x: n.position.x || Math.random() * 800,
      y: n.position.y || Math.random() * 600,
      fx: n.dragging === false && n.position.x ? n.position.x : undefined,
      fy: n.dragging === false && n.position.y ? n.position.y : undefined,
    }));

    const simLinks = edges.map((e) => ({ source: e.source, target: e.target }));

    // If nodes already have spread-out positions (e.g. switching from dagre),
    // start the simulation cool so nodes stay roughly where they are instead
    // of exploding. Only start at full alpha on a true first load (all at origin).
    const hasExistingPositions = nodes.some(
      (n) => Math.abs(n.position.x) > 1 || Math.abs(n.position.y) > 1,
    );
    const initialAlpha = hasExistingPositions ? 0.1 : 1.0;

    const simulation = d3
      .forceSimulation<SimNode>(simNodes)
      .alpha(initialAlpha)
      .alphaDecay(params.alphaDecay)
      .alphaMin(params.alphaMin)
      .velocityDecay(params.velocityDecay)
      .force(
        "link",
        d3
          .forceLink<SimNode, d3.SimulationLinkDatum<SimNode>>(simLinks)
          .id((d) => d.id)
          .distance(params.linkDistance),
      )
      .force("charge", d3.forceManyBody<SimNode>().strength(params.chargeStrength))
      .force("center", d3.forceCenter(400, 300))
      .force("collide", d3.forceCollide<SimNode>(params.collisionRadius));

    simulation.on("tick", () => {
      setNodes((prev) =>
        prev.map((n) => {
          const sim = simNodes.find((s) => s.id === n.id);
          if (!sim) return n;
          return { ...n, position: { x: sim.x ?? 0, y: sim.y ?? 0 } };
        }),
      );
    });

    simRef.current = simulation;

    return () => {
      simulation.stop();
    };
  }, [nodes.length, edges.length, setNodes, enabled, importId]);

  // Stop or restart the simulation when physicsEnabled changes.
  // Declared after the setup effect so it runs second on the same render.
  useEffect(() => {
    const sim = simRef.current;
    if (!sim) return;
    if (physicsEnabled) {
      sim.restart(); // resume from current alpha — no reheat, no explosion
    } else {
      sim.stop();
    }
  }, [physicsEnabled, enabled]);

  /**
   * Pin a node at a position and reheat the simulation for remaining free nodes.
   * Used by onNodeDragStop (permanent pin) and onNodeDrag (live tracking).
   */
  const pinNode = useCallback((nodeId: string, x: number, y: number) => {
    const sim = simRef.current;
    if (!sim) return;
    const simNode = sim.nodes().find((n) => n.id === nodeId);
    if (simNode) {
      simNode.fx = x;
      simNode.fy = y;
      if (physicsEnabledRef.current) {
        sim.alpha(0.3).restart();
      }
    }
  }, []);

  const unpinNode = useCallback((nodeId: string) => {
    const sim = simRef.current;
    if (!sim) return;
    const simNode = sim.nodes().find((n) => n.id === nodeId);
    if (simNode) {
      simNode.fx = undefined;
      simNode.fy = undefined;
      if (physicsEnabledRef.current) {
        sim.alpha(0.3).restart();
      }
    }
  }, []);

  /**
   * Apply new force parameters to the running simulation and reheat it.
   * Preserves all current node positions — does not restart from scratch.
   */
  const reheat = useCallback((newParams: ForceParams) => {
    const sim = simRef.current;
    if (!sim) return;
    (sim.force("charge") as d3.ForceManyBody<SimNode>)?.strength(newParams.chargeStrength);
    (sim.force("collide") as d3.ForceCollide<SimNode>)?.radius(newParams.collisionRadius);
    (sim.force("link") as d3.ForceLink<SimNode, d3.SimulationLinkDatum<SimNode>>)?.distance(
      newParams.linkDistance,
    );
    sim
      .alphaDecay(newParams.alphaDecay)
      .alphaMin(newParams.alphaMin)
      .velocityDecay(newParams.velocityDecay);
    if (physicsEnabledRef.current) {
      sim.alpha(0.5).restart();
    }
  }, []);

  return { pinNode, unpinNode, reheat };
}
