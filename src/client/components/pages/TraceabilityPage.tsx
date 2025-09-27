import { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppLayout } from '../templates';
import { Spinner, Text } from '../atoms';
import { tracesApi } from '../../services/api';
import * as d3 from 'd3';

interface Trace {
  id: string;
  fromId: string;
  toId: string;
  fromType: 'user' | 'system' | 'testcase';
  toType: 'user' | 'system' | 'testcase';
  fromTitle: string;
  toTitle: string;
  fromStatus: string;
  toStatus: string;
  createdAt: string;
  createdByName: string;
  isSystemGenerated: boolean;
}

export function TraceabilityPage() {
  const [traces, setTraces] = useState<Trace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const svgRef = useRef<globalThis.SVGSVGElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchTraces();
  }, []);

  const fetchTraces = async () => {
    try {
      setLoading(true);
      const response = await tracesApi.getAllTraces();
      setTraces(response.traces);
    } catch (err) {
      console.error('Failed to fetch traces:', err);
      setError('Failed to load traces');
    } finally {
      setLoading(false);
    }
  };

  const getLinkPath = (id: string, type: string) => {
    switch (type) {
      case 'user':
        return `/user-requirements/${id}`;
      case 'system':
        return `/system-requirements/${id}`;
      case 'testcase':
        return `/test-cases/${id}`;
      default:
        return '#';
    }
  };

  const processedData = useMemo(() => {
    if (!traces.length) {return null;}

    const nodes = new Map<string, { id: string; type: string; title: string; status: string }>();

    traces.forEach(trace => {
      const fromKey = `${trace.fromType}:${trace.fromId}`;
      const toKey = `${trace.toType}:${trace.toId}`;

      if (!nodes.has(fromKey)) {
        nodes.set(fromKey, {
          id: trace.fromId,
          type: trace.fromType,
          title: trace.fromTitle,
          status: trace.fromStatus
        });
      }
      if (!nodes.has(toKey)) {
        nodes.set(toKey, {
          id: trace.toId,
          type: trace.toType,
          title: trace.toTitle,
          status: trace.toStatus
        });
      }
    });

    const nodeArray = Array.from(nodes.entries()).map(([key, value]) => ({
      key,
      ...value
    }));

    return { nodes: nodeArray, edges: traces };
  }, [traces]);

  const drawSankeyDiagram = () => {
    if (!svgRef.current || !processedData) {return;}

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const userNodes = processedData.nodes.filter(n => n.type === 'user');
    const systemNodes = processedData.nodes.filter(n => n.type === 'system');
    const testNodes = processedData.nodes.filter(n => n.type === 'testcase');

    const nodeHeight = 30;
    const nodeGap = 5;
    const marginTop = 60;
    const marginBottom = 60;
    const width = 1400;
    const nodeWidth = 280;
    const layerWidth = (width - 200) / 3;

    // Position nodes to align with their connected nodes
    const positionNodes = () => {
      const positions: { [key: string]: number } = {};
      let currentY = marginTop;
      let maxY = marginTop;

      // First pass: position user requirements
      userNodes.forEach((node) => {
        const key = `${node.type}:${node.id}`;
        positions[key] = currentY + nodeHeight / 2;
        currentY += nodeHeight + nodeGap;
        maxY = Math.max(maxY, positions[key] + nodeHeight / 2);
      });

      // Second pass: position system requirements aligned with their connected user requirements
      const positionedSR = new Set<string>();
      let srBottomY = currentY;  // Track the bottom position for unconnected SRs
      const srPositions: number[] = []; // Track all SR positions to avoid overlaps

      userNodes.forEach(urNode => {
        const urKey = `${urNode.type}:${urNode.id}`;
        const urY = positions[urKey];

        // Find all system requirements connected to this user requirement
        const connectedSRs = systemNodes.filter(srNode => {
          const srKey = `${srNode.type}:${srNode.id}`;
          return !positionedSR.has(srKey) && processedData.edges.some(e =>
            (e.fromId === urNode.id && e.fromType === 'user' &&
             e.toId === srNode.id && e.toType === 'system')
          );
        });

        if (connectedSRs.length > 0) {
          // Start positioning from the UR's Y position
          let localY = urY - (connectedSRs.length - 1) * (nodeHeight + nodeGap) / 2;

          connectedSRs.forEach(srNode => {
            const srKey = `${srNode.type}:${srNode.id}`;

            // Check for overlaps with already positioned SRs
            let finalY = localY;
            let attempts = 0;
            while (attempts < 50) { // Prevent infinite loops
              let hasOverlap = false;
              for (const existingY of srPositions) {
                if (Math.abs(finalY - existingY) < nodeHeight + nodeGap - 1) {
                  hasOverlap = true;
                  break;
                }
              }
              if (!hasOverlap) {
                break;
              }
              finalY += nodeHeight + nodeGap;
              attempts++;
            }

            positions[srKey] = Math.max(finalY, marginTop + nodeHeight / 2);
            positionedSR.add(srKey);
            srPositions.push(positions[srKey]);
            localY += nodeHeight + nodeGap;
            maxY = Math.max(maxY, positions[srKey] + nodeHeight / 2);
            srBottomY = Math.max(srBottomY, positions[srKey] + nodeHeight / 2 + nodeGap);
          });
        }
      });

      // Position remaining system requirements below the connected ones
      systemNodes.forEach(srNode => {
        const srKey = `${srNode.type}:${srNode.id}`;
        if (!positionedSR.has(srKey)) {
          positions[srKey] = srBottomY + nodeHeight / 2;
          srBottomY += nodeHeight + nodeGap;
          maxY = Math.max(maxY, positions[srKey] + nodeHeight / 2);
        }
      });

      // Third pass: position test cases aligned with their connected system requirements
      const positionedTC = new Set<string>();
      let tcBottomY = Math.max(srBottomY, currentY);  // Start below all other nodes
      const tcPositions: number[] = []; // Track all TC positions to avoid overlaps

      systemNodes.forEach(srNode => {
        const srKey = `${srNode.type}:${srNode.id}`;
        const srY = positions[srKey];

        // Find all test cases connected to this system requirement
        const connectedTCs = testNodes.filter(tcNode => {
          const tcKey = `${tcNode.type}:${tcNode.id}`;
          return !positionedTC.has(tcKey) && processedData.edges.some(e =>
            (e.fromId === srNode.id && e.fromType === 'system' &&
             e.toId === tcNode.id && e.toType === 'testcase')
          );
        });

        if (connectedTCs.length > 0) {
          // Start positioning from the SR's Y position
          let localY = srY - (connectedTCs.length - 1) * (nodeHeight + nodeGap) / 2;

          connectedTCs.forEach(tcNode => {
            const tcKey = `${tcNode.type}:${tcNode.id}`;

            // Check for overlaps with already positioned TCs
            let finalY = localY;
            let attempts = 0;
            while (attempts < 50) { // Prevent infinite loops
              let hasOverlap = false;
              for (const existingY of tcPositions) {
                if (Math.abs(finalY - existingY) < nodeHeight + nodeGap - 1) {
                  hasOverlap = true;
                  break;
                }
              }
              if (!hasOverlap) {
                break;
              }
              finalY += nodeHeight + nodeGap;
              attempts++;
            }

            positions[tcKey] = Math.max(finalY, marginTop + nodeHeight / 2);
            positionedTC.add(tcKey);
            tcPositions.push(positions[tcKey]);
            localY += nodeHeight + nodeGap;
            maxY = Math.max(maxY, positions[tcKey] + nodeHeight / 2);
            tcBottomY = Math.max(tcBottomY, positions[tcKey] + nodeHeight / 2 + nodeGap);
          });
        }
      });

      // Position remaining test cases below the connected ones
      testNodes.forEach(tcNode => {
        const tcKey = `${tcNode.type}:${tcNode.id}`;
        if (!positionedTC.has(tcKey)) {
          positions[tcKey] = tcBottomY + nodeHeight / 2;
          tcBottomY += nodeHeight + nodeGap;
          maxY = Math.max(maxY, positions[tcKey] + nodeHeight / 2);
        }
      });

      return { positions, maxY };
    };

    const { positions, maxY } = positionNodes();

    // Calculate height based on actual positions with extra buffer
    const extraBuffer = 150; // Extra space to ensure everything is visible
    const height = Math.max(maxY + marginBottom + extraBuffer, 800);

    svg.attr('width', width).attr('height', height);

    const g = svg.append('g').attr('transform', 'translate(40, 20)');

    const color = d3.scaleOrdinal()
      .domain(['user', 'system', 'testcase'])
      .range(['#3b82f6', '#10b981', '#a855f7']);

    // Render all nodes using pre-calculated positions
    const allNodes = [...userNodes, ...systemNodes, ...testNodes];

    allNodes.forEach(node => {
      const nodeKey = `${node.type}:${node.id}`;
      const y = positions[nodeKey];

      // Determine x position based on node type
      let x = 0;
      if (node.type === 'user') {
        x = 0;
      } else if (node.type === 'system') {
        x = layerWidth;
      } else if (node.type === 'testcase') {
        x = layerWidth * 2;
      }

      // Store position for edge drawing
      (node as any).x = x;
      (node as any).y = y;

      const nodeGroup = g.append('g')
        .attr('data-node-id', node.id)
        .attr('data-node-type', node.type)
        .style('cursor', 'pointer')
        .on('click', () => {
          const path = getLinkPath(node.id, node.type);
          if (path !== '#') {navigate(path);}
        })
        .on('mouseenter', function() {
          const hoveredId = node.id;
          const hoveredType = node.type;

            // Find all connected nodes
            const connectedNodes = new Set<string>();
            connectedNodes.add(`${hoveredType}:${hoveredId}`);

            // Find nodes this one connects TO
            processedData.edges.forEach(edge => {
              if (edge.fromId === hoveredId && edge.fromType === hoveredType) {
                connectedNodes.add(`${edge.toType}:${edge.toId}`);
              }
              // Also find nodes that connect TO this one
              if (edge.toId === hoveredId && edge.toType === hoveredType) {
                connectedNodes.add(`${edge.fromType}:${edge.fromId}`);
              }
            });

            // Dim all nodes and paths with transition
            g.selectAll('g[data-node-id]')
              .transition()
              .duration(200)
              .style('opacity', 0.2);

            g.selectAll('path.trace-link')
              .transition()
              .duration(200)
              .style('opacity', 0.1)
              .attr('stroke-width', 1);

            // Highlight connected nodes
            connectedNodes.forEach(nodeKey => {
              const [type, id] = nodeKey.split(':');
              g.selectAll(`g[data-node-id="${id}"][data-node-type="${type}"]`)
                .transition()
                .duration(200)
                .style('opacity', 1);

              // Make the hovered node's border thicker
              if (type === hoveredType && id === hoveredId) {
                g.selectAll(`g[data-node-id="${id}"][data-node-type="${type}"] rect`)
                  .transition()
                  .duration(200)
                  .attr('stroke-width', 3);
              }
            });

            // Highlight connected paths
            g.selectAll('path.trace-link').each(function(d: any) {
              if (connectedNodes.has(`${d.fromType}:${d.fromId}`) &&
                  connectedNodes.has(`${d.toType}:${d.toId}`)) {
                d3.select(this)
                  .transition()
                  .duration(200)
                  .style('opacity', 0.8)
                  .attr('stroke-width', 3);
              }
            });
          })
          .on('mouseleave', function() {
            // Reset all opacities with transition
            g.selectAll('g[data-node-id]')
              .transition()
              .duration(200)
              .style('opacity', 1);

            g.selectAll('g[data-node-id] rect')
              .transition()
              .duration(200)
              .attr('stroke-width', 1.5);

            g.selectAll('path.trace-link')
              .transition()
              .duration(200)
              .style('opacity', 0.6)
              .attr('stroke-width', 2);
          });

      nodeGroup.append('rect')
        .attr('class', 'node-rect')
        .attr('x', x)
        .attr('y', y - nodeHeight / 2)
        .attr('width', nodeWidth)
        .attr('height', nodeHeight)
        .attr('fill', '#ffffff')
        .attr('stroke', color(node.type) as string)
        .attr('stroke-width', 1.5)
        .attr('rx', 2);

      // Combine ID and title on one line
      const maxTitleLength = 30;
      const titleText = node.title.length > maxTitleLength ? node.title.substring(0, maxTitleLength) + '...' : node.title;
      const combinedText = `${node.id}: ${titleText}`;

      nodeGroup.append('text')
        .attr('x', x + 8)
        .attr('y', y)
        .attr('text-anchor', 'start')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '500')
        .text(combinedText);
    });

    const linkGenerator = d3.linkHorizontal()
      .source((d: any) => [d.source.x + nodeWidth, d.source.y])
      .target((d: any) => [d.target.x, d.target.y]);

    processedData.edges.forEach(edge => {
      const source = processedData.nodes.find(n => n.key === `${edge.fromType}:${edge.fromId}`);
      const target = processedData.nodes.find(n => n.key === `${edge.toType}:${edge.toId}`);

      if (source && target && (source as any).x !== undefined) {
        g.append('path')
          .attr('class', 'trace-link')
          .datum(edge)
          .attr('d', linkGenerator({ source, target } as any) as string)
          .attr('fill', 'none')
          .attr('stroke', color(source.type) as string)
          .attr('stroke-width', 2)
          .style('opacity', 0.6);
      }
    });

  };

  useEffect(() => {
    if (!processedData) {return;}
    drawSankeyDiagram();
  }, [processedData]);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <Spinner />
        </div>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <Text color="secondary">{error}</Text>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col h-full p-4">
        <h1 className="text-2xl font-bold mb-4">Requirements Traceability</h1>
        {traces.length === 0 ? (
          <div className="flex items-center justify-center flex-1">
            <Text color="muted">No traces found</Text>
          </div>
        ) : (
          <div className="overflow-auto flex-1" tabIndex={0} aria-label="Traceability diagram">
            <svg ref={svgRef} role="img" aria-label="Requirements traceability visualization"></svg>
          </div>
        )}
      </div>
    </AppLayout>
  );
}