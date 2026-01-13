# CSV to Draw.io Treemap Converter

A Node.js script that converts hierarchical data from a CSV file into a treemap diagram in Draw.io format.

## Features

- Reads hierarchical data from CSV (columns: `id`, `parent`, `value`, `label`)
- Builds a tree structure and calculates cumulative values
- Uses a slice-and-dice treemap algorithm for layout
- Outputs Draw.io XML files that can be imported and edited in Draw.io
- Customizable canvas size

## Installation

1. Clone or download the repository
2. Navigate to the project directory
3. Install dependencies:

```bash
npm install
```

## Dependencies

- `csv-parser`: For parsing CSV files
- `xmlbuilder2`: For generating Draw.io XML
- `commander`: For CLI argument parsing

## Usage

```bash
node converter.js -i <input.csv> [-o <output.drawio>] [-w <width>] [-h <height>]
```

### Options

- `-i, --input <path>`: Path to input CSV file (required)
- `-o, --output <path>`: Path to output Draw.io file (default: `output.drawio`)
- `-w, --width <number>`: Canvas width (default: 800)
- `-h, --height <number>`: Canvas height (default: 600)

## CSV Format

The input CSV must have the following columns:

- `id`: Unique identifier for each node
- `parent`: Parent node's id (empty for root nodes)
- `value`: Numeric value for sizing (leaf nodes should have values; parent values are calculated as sum of children)
- `label`: Display label for the node

### Example CSV

```csv
id,parent,value,label
1,,100,Root
2,1,40,Branch A
3,1,60,Branch B
4,2,20,Leaf A1
5,2,20,Leaf A2
6,3,30,Leaf B1
7,3,30,Leaf B2
```

## Examples

### Basic Usage

```bash
node converter.js -i sample.csv -o my_treemap.drawio
```

### Custom Canvas Size

```bash
node converter.js -i sample.csv -o large_treemap.drawio -w 1200 -h 800
```

## Viewing the Output

1. Open Draw.io at https://app.diagrams.net/
2. Go to **File > Open from > Device**
3. Select the generated `.drawio` file
4. The treemap will load with rectangles sized by values and colored differently for leaves vs. internal nodes

## Algorithm

The script uses a slice-and-dice treemap algorithm:

- Starts with the root node filling the entire canvas
- Recursively divides space among children based on their relative values
- Alternates between horizontal and vertical splits for better aspect ratios

## Styling

- Leaf nodes: Light blue fill (#dae8fc), blue stroke (#6c8ebf)
- Internal nodes: Light gray fill (#f5f5f5), gray stroke (#666666)
- Labels show the node name and value in parentheses

## Limitations

- Assumes a single root node (first node with empty parent)
- Values are summed up the tree for parent nodes
- Simple coloring scheme (can be extended for more categories)

## Contributing

Feel free to submit issues or pull requests to improve the script.

## License

ISC
