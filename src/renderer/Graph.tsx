import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { Intent, Action } from '../types'

interface Node extends d3.SimulationNodeDatum {
  id: string;
  label: string;
  type: 'intent' | 'action' | 'goal';
  completed?: string;
  explanation?: string;
}

interface Link {
  source: string | Node;
  target: string | Node;
  relationType?: string;
  reasoning?: string;
}

interface GraphProps {
  data: Intent[] | Action[];
  mode: 'intent' | 'action';
}

// Type guard to check if an item is an Action
function isAction(item: Intent | Action): item is Action {
  return 'completed' in item && 'explanation' in item;
}

export const Graph = ({ data, mode }: GraphProps) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Process data into nodes and links
    const nodes: Node[] = [];
    const links: Link[] = [];
    const goalMap = new Map<string, Node>();

    data.forEach((item, index) => {
      // Add intent/action node
      const itemNode: Node = {
        id: `${mode}-${index}`,
        label: item.action,
        type: mode,
      };

      // Add completion info if it's an Action
      if (isAction(item)) {
        itemNode.completed = item.completed;
        itemNode.explanation = item.explanation;
      }

      nodes.push(itemNode);

      // Process goal relations
      item.goal_relations.forEach(relation => {
        // Add or get goal node
        if (!goalMap.has(relation.goal_name)) {
          const goalNode: Node = {
            id: `goal-${relation.goal_name}`,
            label: relation.goal_name,
            type: 'goal' as const
          };
          goalMap.set(relation.goal_name, goalNode);
          nodes.push(goalNode);
        }

        // Add link
        links.push({
          source: itemNode.id,
          target: `goal-${relation.goal_name}`,
          relationType: relation.relation_type,
          reasoning: relation.reasoning
        });
      });
    });

    // Set up SVG
    const container = containerRef.current;
    const width = container?.clientWidth!;
    const height = container?.clientHeight! - 80; // Account for legend and instructions
    const svg = d3.select(svgRef.current!);
    svg.selectAll("*").remove();

    const g = svg.append("g");

    // Add zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.5, 3])
      .on("zoom", (event) => {
        g.attr("transform", event.transform);
      });

    svg.call(zoom);

    // Create force simulation
    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).distance(150))
      .force("charge", d3.forceManyBody().strength(-400))
      .force("center", d3.forceCenter(width / 2, height / 2))
      .force("collision", d3.forceCollide().radius(60));

    // Create arrow markers for links
    svg.append("defs").selectAll("marker")
      .data(["positive"])
      .enter().append("marker")
      .attr("id", d => `arrow-${d}`)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
      .append("path")
      .attr("fill", "#22c55e")
      .attr("d", "M0,-5L10,0L0,5");

    // Create links
    const link = g.append("g")
      .selectAll("line")
      .data(links)
      .enter().append("line")
      .attr("stroke", "#22c55e")
      .attr("stroke-width", 2)
      .attr("marker-end", "url(#arrow-positive)")
      .attr("opacity", 0.6);

    // Create nodes
    const node = g.append("g")
      .selectAll("g")
      .data(nodes)
      .enter().append("g")
      .call(d3.drag<SVGGElement, Node>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended));

    // Add circles to nodes - color based on completion status for actions
    node.append("circle")
      .attr("r", d => d.type === 'goal' ? 25 : 20)
      .attr("fill", d => {
        if (d.type === 'goal') return "#3b82f6";
        if (d.type === 'action') {
          if (d.completed === 'yes') return "#22c55e";
          if (d.completed === 'partial') return "#f59e0b";
          return "#ef4444";
        }
        return "#8b5cf6"; // intent
      })
      .attr("stroke", "#fff")
      .attr("stroke-width", 2);

    // Add labels to nodes
    node.append("text")
      .text(d => {
        const maxLength = 30;
        return d.label.length > maxLength ? d.label.substring(0, maxLength) + "..." : d.label;
      })
      .attr("text-anchor", "middle")
      .attr("dy", 35)
      .attr("font-size", "12px")
      .attr("fill", "#1f2937")
      .each(function(d) {
        const text = d3.select(this);
        const words = d.label.split(/\s+/);
        text.text(null);
        
        let line: string[] = [];
        let lineNumber = 0;
        const lineHeight = 1.1;
        const y = 35;
        
        words.forEach(word => {
          line.push(word);
          const testLine = line.join(" ");
          if (testLine.length > 25 && line.length > 1) {
            line.pop();
            text.append("tspan")
              .attr("x", 0)
              .attr("y", y)
              .attr("dy", lineNumber * lineHeight + "em")
              .text(line.join(" "));
            line = [word];
            lineNumber++;
          }
        });
        
        if (line.length > 0) {
          text.append("tspan")
            .attr("x", 0)
            .attr("y", y)
            .attr("dy", lineNumber * lineHeight + "em")
            .text(line.join(" "));
        }
      });

    // Add tooltips
    const tooltip = d3.select("body").append("div")
      .attr("class", "tooltip")
      .style("position", "absolute")
      .style("visibility", "hidden")
      .style("background-color", "white")
      .style("border", "1px solid #ddd")
      .style("border-radius", "4px")
      .style("padding", "10px")
      .style("box-shadow", "0 2px 4px rgba(0,0,0,0.1)")
      .style("max-width", "300px")
      .style("font-size", "14px")
      .style("z-index", "1000");

    node.on("mouseover", function(event, d) {
      let content = `<strong>${d.type === 'goal' ? 'Goal' : d.type === 'action' ? 'Action' : 'Intent'}:</strong><br/>${d.label}`;
      
      if (d.type === 'action' && d.completed) {
        const statusLabel = d.completed === 'yes' ? 'Completed' : d.completed === 'partial' ? 'Partially Completed' : 'Not Completed';
        content += `<br/><br/><strong>Status:</strong> ${statusLabel}`;
        if (d.explanation) {
          content += `<br/><strong>Note:</strong> ${d.explanation}`;
        }
      }
      
      tooltip.style("visibility", "visible").html(content);
    })
    .on("mousemove", function(event) {
      tooltip.style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

    link.on("mouseover", function(event, d) {
      tooltip.style("visibility", "visible")
        .html(`<strong>${d.relationType}</strong><br/>${d.reasoning}`);
    })
    .on("mousemove", function(event) {
      tooltip.style("top", (event.pageY - 10) + "px")
        .style("left", (event.pageX + 10) + "px");
    })
    .on("mouseout", function() {
      tooltip.style("visibility", "hidden");
    });

    // Update positions on tick
    simulation.on("tick", () => {
      link
        .attr("x1", d => (d.source as Node).x!)
        .attr("y1", d => (d.source as Node).y!)
        .attr("x2", d => (d.target as Node).x!)
        .attr("y2", d => (d.target as Node).y!);

      node.attr("transform", d => `translate(${d.x},${d.y})`);
    });

    // Drag functions
    function dragstarted(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event: d3.D3DragEvent<SVGGElement, Node, Node>, d: Node) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Cleanup
    return () => {
      tooltip.remove();
    };
  }, [data, mode]);

  return (
    <div ref={containerRef} className="w-full h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="mb-4 flex gap-6 text-sm">
        <div className="flex items-center gap-2">
          <div className={`w-4 h-4 rounded-full ${mode === 'intent' ? 'bg-purple-500' : 'bg-gray-400'}`}></div>
          <span>{mode === 'intent' ? 'Intents' : 'Actions (Intent)'}</span>
        </div>
        {mode === 'action' && (
          <>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-500"></div>
              <span>Completed</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-500"></div>
              <span>Partial</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-red-500"></div>
              <span>Not Done</span>
            </div>
          </>
        )}
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span>Goals</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-0.5 bg-green-500"></div>
          <span>Positively Impacts</span>
        </div>
      </div>
      <svg ref={svgRef} height={1000} width={800} className="flex-1 w-full border border-gray-300 bg-white rounded-lg shadow-sm"></svg>
      <p className="mt-4 text-sm text-gray-600">Drag nodes to reposition • Hover for details • Scroll to zoom</p>
    </div>
  );
};

export default Graph;