# cBioPortal MCP Server

A Model Context Protocol (MCP) server that provides access to cBioPortal's cancer genomics data through a standardized interface.

## Features

### Tools
**Basic Data Access:**
- **get_studies**: Search and retrieve cancer studies
- **get_study_details**: Get detailed information about specific studies
- **get_samples**: Retrieve sample information from studies
- **get_patients**: Get patient information from studies
- **get_sample_lists**: Get pre-defined sample lists (cohorts) for studies

**Molecular Data:**
- **get_molecular_profiles**: Get available molecular data types for studies
- **get_mutations**: Query mutation data for specific genes
- **get_copy_number_alterations**: Get copy number alteration data
- **get_molecular_data**: Access expression or other molecular data

**Clinical Data:**
- **get_clinical_data**: Access patient and sample clinical information
- **get_clinical_attributes**: Get available clinical attributes for studies

**Gene & Reference Data:**
- **search_genes**: Search for genes by symbol or keyword
- **get_gene_panels**: Get gene panels available for studies
- **get_cancer_types**: List all cancer types in cBioPortal

**Advanced Analysis:**
- **get_significantly_mutated_genes**: Get MutSig results for studies
- **get_survival_data**: Access survival data for patients
- **get_treatment_data**: Get treatment information for patients or samples

### Resources
- **cbioportal://studies**: Browse all available cancer studies
- **cbioportal://cancer-types**: List all cancer types
- **cbioportal://genes**: Gene information and search
- **cbioportal://gene-panels**: Available gene panels used in sequencing
- **cbioportal://molecular-profiles**: All molecular profile types across studies
- **cbioportal://server-info**: Server status and version information

## Installation

1. Clone and setup:
```bash
mkdir cbioportal-mcp-server
cd cbioportal-mcp-server
npm init -y
```

2. Install dependencies:
```bash
npm install @modelcontextprotocol/sdk axios
npm install -D typescript @types/node tsx
```

3. Copy the source code to `src/index.ts`

4. Build the project:
```bash
npm run build
```

## Usage

### Running the Server
```bash
npm start
```

### Integration with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "cbioportal": {
      "command": "node",
      "args": ["/path/to/your/cbioportal-mcp-server/build/index.js"]
    }
  }
}
```

### Example Queries

Once integrated with Claude, you can ask questions like:

**Basic Exploration:**
- "What cancer studies are available for lung cancer?"
- "Show me details about the TCGA lung adenocarcinoma study"
- "List the sample types available in the breast cancer study"
- "What clinical attributes are collected for prostate cancer patients?"

**Molecular Data Queries:**
- "Get mutation data for TP53 and KRAS in the lung cancer study"
- "Show me copy number alterations for EGFR in breast cancer samples"
- "What molecular profiles are available for the brain tumor study?"
- "Get gene expression data for MYC in the liver cancer cohort"

**Clinical Analysis:**
- "What clinical data is available for breast cancer patients?"
- "Show me survival data for the lung adenocarcinoma study"
- "Get treatment information for colorectal cancer patients"
- "What are the significantly mutated genes in the melanoma study?"

**Advanced Queries:**
- "Compare mutation rates between primary and metastatic samples"
- "Find studies with both RNA-seq and protein data available"
- "Get gene panel information for targeted sequencing studies"
- "Show me cancer types with the most available studies"

## API Rate Limiting

The server respects cBioPortal's API limits:
- Implements 30-second timeouts
- Handles pagination appropriately
- Includes error handling for API failures

## Development

### Running in Development Mode
```bash
npm run dev
```

### Building
```bash
npm run build
```

### Project Structure
```
cbioportal-mcp-server/
├── src/
│   └── index.ts          # Main server implementation
├── build/                # Compiled JavaScript (generated)
├── package.json
├── tsconfig.json
└── README.md
```

## Contributing

This is a starting implementation. You can extend it by:

1. Adding more cBioPortal endpoints
2. Implementing caching for better performance
3. Adding authentication support for private instances
4. Enhancing error handling and logging
5. Adding data visualization tools

## License

MIT License