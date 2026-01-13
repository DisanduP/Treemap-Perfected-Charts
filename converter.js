#!/usr/bin/env node

const fs = require('fs');
const csv = require('csv-parser');
const { create } = require('xmlbuilder2');
const { program } = require('commander');

// CLI Configuration
program
  .version('1.0.2')
  .requiredOption('-i, --input <path>', 'Path to input CSV file')
  .option('-o, --output <path>', 'Path to output Drawio file', 'output.drawio')
  .option('-w, --width <number>', 'Canvas width', 800)
  .option('-h, --height <number>', 'Canvas height', 600)
  .parse(process.argv);

const options = program.opts();
const nodes = [];

// 1. Read CSV
fs.createReadStream(options.input)
  .pipe(csv())
  .on('data', (data) => {
    nodes.push({
      id: data.id.trim(),
      parent: data.parent ? data.parent.trim() : null,
      value: parseFloat(data.value) || 0,
      label: data.label || data.id
    });
  })
  .on('end', () => {
    processGraph(nodes);
  });

// 2. Process Data & Build Tree
function processGraph(flatNodes) {
  const nodeMap = {};
  let rootNode = null;

  // Initialize map
  flatNodes.forEach(n => {
    n.children = [];
    n.x = 0; n.y = 0; n.w = 0; n.h = 0;
    nodeMap[n.id] = n;
  });

  // Build hierarchy
  flatNodes.forEach(n => {
    if (n.parent && nodeMap[n.parent]) {
      nodeMap[n.parent].children.push(n);
    } else {
      if (!rootNode) rootNode = n; 
    }
  });

  // Calculate cumulative values
  function calcValues(node) {
    if (node.children.length > 0) {
      node.value = node.children.reduce((acc, child) => acc + calcValues(child), 0);
    }
    return node.value || 1; 
  }

  if (rootNode) {
    calcValues(rootNode);
    
    // 3. Calculate Geometry (Absolute Global Coordinates)
    // We start at 0,0 relative to the root container for cleaner math
    computeTreemapLayout(rootNode, 0, 0, parseInt(options.width), parseInt(options.height), true);
    
    // 4. Generate XML (Pass nodeMap to fix relative coords)
    generateDrawioXML(flatNodes, nodeMap);
  } else {
    console.error("Error: No root node found (node with empty parent).");
  }
}

// 3. Treemap Algorithm
function computeTreemapLayout(node, x, y, w, h, isVertical) {
  node.x = x; node.y = y; node.w = w; node.h = h;

  if (!node.children || node.children.length === 0) return;

  const totalValue = node.children.reduce((acc, c) => acc + c.value, 0);
  let currentPos = isVertical ? y : x;

  node.children.forEach(child => {
    const ratio = child.value / totalValue;
    let childW, childH, childX, childY;

    if (isVertical) {
      childW = w;
      childH = h * ratio;
      childX = x;
      childY = currentPos;
      currentPos += childH;
    } else {
      childW = w * ratio;
      childH = h;
      childX = currentPos;
      childY = y;
      currentPos += childW;
    }

    computeTreemapLayout(child, childX, childY, childW, childH, !isVertical);
  });
}

// 4. Generate Draw.io XML
function generateDrawioXML(processedNodes, nodeMap) {
  const root = create({ version: '1.0', encoding: 'UTF-8' })
    .ele('mxfile', { host: 'Electron', type: 'device' })
    .ele('diagram', { name: 'Treemap' })
    .ele('mxGraphModel', { dx: '0', dy: '0', grid: '1', gridSize: '10', guides: '1', tooltips: '1', connect: '1', arrows: '1', fold: '1', page: '1', pageScale: '1', pageWidth: '827', pageHeight: '1169', math: '0', shadow: '0' })
    .ele('root');

  root.ele('mxCell', { id: '0' });
  root.ele('mxCell', { id: '1', parent: '0' });

  processedNodes.forEach((node) => {
    const isLeaf = node.children.length === 0;
    
    // Styling
    const color = isLeaf ? '#dae8fc' : '#f5f5f5'; 
    const stroke = isLeaf ? '#6c8ebf' : '#666666';
    const align = isLeaf ? 'center' : 'left';
    const vAlign = isLeaf ? 'middle' : 'top';
    
    // Added 'spacing' to keep text away from borders in containers
    const style = `html=1;whiteSpace=wrap;fillColor=${color};strokeColor=${stroke};align=${align};verticalAlign=${vAlign};spacing=5;fontStyle=${isLeaf ? 0 : 1}`;

    const safeId = `cell_${node.id}`;
    const safeParent = node.parent ? `cell_${node.parent}` : '1';

    // --- FIX: RELATIVE COORDINATE CALCULATION ---
    let finalX = node.x;
    let finalY = node.y;

    if (node.parent && nodeMap[node.parent]) {
        // If inside a parent, subtract parent's absolute position
        finalX = node.x - nodeMap[node.parent].x;
        finalY = node.y - nodeMap[node.parent].y;
    }
    // ---------------------------------------------

    const cell = root.ele('mxCell', {
      id: safeId,
      value: `${node.label}\n(${node.value})`,
      style: style,
      parent: safeParent,
      vertex: '1'
    });

    cell.ele('mxGeometry', {
      x: Math.round(finalX),
      y: Math.round(finalY),
      width: Math.round(node.w),
      height: Math.round(node.h),
      as: 'geometry'
    });
  });

  const xml = root.end({ prettyPrint: true });
  fs.writeFileSync(options.output, xml);
  console.log(`✅ Success! Treemap saved to: ${options.output}`);
}