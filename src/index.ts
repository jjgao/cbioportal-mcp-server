private async getPatients(args: any) {
    const { studyId, pageSize = 100 } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}/patients`, {
      params: { pageSize, projection: 'SUMMARY' }
    });
    
    const patients = response.data.slice(0, pageSize);
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} patients in study ${studyId}:\n\n${patients
            .map((patient: Patient) => 
              `• ${patient.stableId}`
            )
            .join('\n')}`,
        },
      ],
    };
  }

  private async getSampleLists(args: any) {
    const { studyId } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}/sample-lists`);
    const sampleLists = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Sample lists for study ${studyId}:\n\n${sampleLists
            .map((list: SampleList) => 
              `• **${list.name}**\n  ID: ${list.stableId}\n  Category: ${list.category}\n  Sample Count: ${list.sampleCount}\n  Description: ${list.description}`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  private async getCopyNumberAlterations(args: any) {
    const { studyId, geneSymbols, alterationType = 'HOMDEL_AND_AMP' } = args;
    
    // Get the CNA molecular profile for this study
    const profilesResponse = await this.axiosInstance.get(`/studies/${studyId}/molecular-profiles`);
    const cnaProfile = profilesResponse.data.find(
      (profile: MolecularProfile) => profile.molecularAlterationType === 'COPY_NUMBER_ALTERATION'
    );
    
    if (!cnaProfile) {
      throw new Error(`No copy number alteration data available for study ${studyId}`);
    }

    // Get gene information
    const genesResponse = await this.axiosInstance.post('/genes/fetch', geneSymbols, {
      params: { geneIdType: 'HUGO_GENE_SYMBOL' }
    });
    
    const genes = genesResponse.data;
    const entrezGeneIds = genes.map((gene: any) => gene.entrezGeneId);

    // Fetch copy number alterations
    const cnaData = {
      entrezGeneIds,
      discreteCopyNumberEventType: alterationType,
    };

    const cnaResponse = await this.axiosInstance.post(
      `/molecular-profiles/${cnaProfile.molecularProfileId}/discrete-copy-number/fetch`,
      cnaData
    );
    
    const cnas = cnaResponse.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${cnas.length} copy number alterations in ${geneSymbols.join(', ')} for study ${studyId}:\n\n${cnas
            .slice(0, 50)
            .map((cna: any) => 
              `• **${cna.gene?.hugoGeneSymbol || 'Unknown'}** in ${cna.sampleId} (${cna.patientId})\n  Alteration: ${cna.alteration === -2 ? 'Deep Deletion' : cna.alteration === 2 ? 'Amplification' : cna.alteration === 1 ? 'Gain' : cna.alteration === -1 ? 'Shallow Deletion' : cna.alteration}`
            )
            .join('\n\n')}${cnas.length > 50 ? '\n\n... and more alterations' : ''}`,
        },
      ],
    };
  }

  private async getMolecularData(args: any) {
    const { studyId, geneSymbols, molecularProfileType } = args;
    
    // Get molecular profiles for this study
    const profilesResponse = await this.axiosInstance.get(`/studies/${studyId}/molecular-profiles`);
    let targetProfile = profilesResponse.data[0]; // default to first profile
    
    if (molecularProfileType) {
      targetProfile = profilesResponse.data.find(
        (profile: MolecularProfile) => profile.datatype.toLowerCase().includes(molecularProfileType.toLowerCase()) ||
        profile.stableId.toLowerCase().includes(molecularProfileType.toLowerCase())
      ) || targetProfile;
    }
    
    if (!targetProfile) {
      throw new Error(`No molecular profiles available for study ${studyId}`);
    }

    // Get gene information
    const genesResponse = await this.axiosInstance.post('/genes/fetch', geneSymbols, {
      params: { geneIdType: 'HUGO_GENE_SYMBOL' }
    });
    
    const genes = genesResponse.data;
    const entrezGeneIds = genes.map((gene: any) => gene.entrezGeneId);

    // Fetch molecular data
    const molecularData = {
      entrezGeneIds,
    };

    const dataResponse = await this.axiosInstance.post(
      `/molecular-profiles/${targetProfile.molecularProfileId}/molecular-data/fetch`,
      molecularData
    );
    
    const data = dataResponse.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Molecular data for ${geneSymbols.join(', ')} in study ${studyId} (${targetProfile.name}):\n\n${data
            .slice(0, 50)
            .map((item: any) => 
              `• **${item.gene?.hugoGeneSymbol || 'Unknown'}** in ${item.sampleId} (${item.patientId})\n  Value: ${item.value}`
            )
            .join('\n\n')}${data.length > 50 ? '\n\n... and more data points' : ''}`,
        },
      ],
    };
  }

  private async getClinicalAttributes(args: any) {
    const { studyId } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}/clinical-attributes`);
    const attributes = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Clinical attributes for study ${studyId}:\n\n${attributes
            .map((attr: ClinicalAttribute) => 
              `• **${attr.displayName}** (${attr.attrId})\n  Type: ${attr.datatype}\n  Level: ${attr.patientAttribute ? 'Patient' : 'Sample'}\n  Description: ${attr.description || 'N/A'}`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  private async searchGenes(args: any) {
    const { keyword, pageSize = 20 } = args;
    
    const response = await this.axiosInstance.get('/genes', {
      params: { 
        keyword, 
        pageSize,
        projection: 'SUMMARY'
      }
    });
    
    const genes = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${genes.length} genes matching "${keyword}":\n\n${genes
            .map((gene: Gene) => 
              `• **${gene.hugoGeneSymbol}** (Entrez ID: ${gene.entrezGeneId})\n  Type: ${gene.type}`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  private async getGenePanels(args: any) {
    const { studyId } = args;
    
    let response;
    if (studyId) {
      // Get gene panels for specific study (if available)
      try {
        const profilesResponse = await this.axiosInstance.get(`/studies/${studyId}/molecular-profiles`);
        response = await this.axiosInstance.get('/gene-panels', { params: { pageSize: 100 } });
      } catch (error) {
        response = await this.axiosInstance.get('/gene-panels', { params: { pageSize: 100 } });
      }
    } else {
      response = await this.axiosInstance.get('/gene-panels', { params: { pageSize: 100 } });
    }
    
    const genePanels = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Gene panels${studyId ? ` for study ${studyId}` : ''}:\n\n${genePanels
            .slice(0, 20)
            .map((panel: any) => 
              `• **${panel.stableId}**\n  Description: ${panel.description || 'N/A'}\n  Genes: ${panel.genes?.length || 0} genes`
            )
            .join('\n\n')}${genePanels.length > 20 ? '\n\n... and more panels' : ''}`,
        },
      ],
    };
  }

  private async getCancerTypesTool(args: any) {
    const response = await this.axiosInstance.get('/cancer-types');
    const cancerTypes = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Cancer types available in cBioPortal:\n\n${cancerTypes
            .map((type: any) => 
              `• **${type.name}** (${type.typeOfCancerId})\n  Short Name: ${type.shortName}\n  Color: ${type.dedicatedColor}`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  private async getSignificantlyMutatedGenes(args: any) {
    const { studyId } = args;
    
    try {
      const response = await this.axiosInstance.get(`/studies/${studyId}/significantly-mutated-genes`);
      const mutSigResults = response.data;
      
      return {
        content: [
          {
            type: "text",
            text: `Significantly mutated genes (MutSig results) for study ${studyId}:\n\n${mutSigResults
              .slice(0, 20)
              .map((result: any) => 
                `• **${result.hugoGeneSymbol}** (Rank: ${result.rank})\n  p-value: ${result.pValue}\n  q-value: ${result.qValue}\n  Mutations: ${result.nummutations}`
              )
              .join('\n\n')}${mutSigResults.length > 20 ? '\n\n... and more genes' : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `No MutSig results available for study ${studyId}. This analysis may not have been performed for this dataset.`,
          },
        ],
      };
    }
  }

  private async getSurvivalData(args: any) {
    const { studyId, attributeIdPrefix = 'OS' } = args;
    
    try {
      // Get patients for the study first
      const patientsResponse = await this.axiosInstance.get(`/studies/${studyId}/patients`);
      const patients = patientsResponse.data;
      
      const patientIdentifiers = patients.map((patient: Patient) => ({
        patientId: patient.stableId,
        studyId: studyId
      }));

      const survivalRequest = {
        patientIdentifiers,
        attributeIdPrefix,
      };

      const response = await this.axiosInstance.post('/survival-data/fetch', survivalRequest);
      const survivalData = response.data;
      
      return {
        content: [
          {
            type: "text",
            text: `Survival data for study ${studyId} (${attributeIdPrefix}):\n\n${survivalData
              .slice(0, 20)
              .map((item: any) => 
                `• Patient ${item.patientId}: ${item.attrValue} (${item.attrId})`
              )
              .join('\n')}${survivalData.length > 20 ? '\n\n... and more survival data' : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `No survival data available for study ${studyId} with prefix ${attributeIdPrefix}.`,
          },
        ],
      };
    }
  }

  private async getTreatmentData(args: any) {
    const { studyId, level = 'PATIENT', tier = 'Agent' } = args;
    
    try {
      const studyViewFilter = {
        studyIds: [studyId]
      };

      const endpoint = level === 'PATIENT' ? '/treatments/patient' : '/treatments/sample';
      const response = await this.axiosInstance.post(endpoint, studyViewFilter, {
        params: { tier }
      });
      
      const treatmentData = response.data;
      
      return {
        content: [
          {
            type: "text",
            text: `Treatment data for study ${studyId} (${level} level, ${tier} tier):\n\n${treatmentData
              .slice(0, 20)
              .map((treatment: any) => 
                `• **${treatment.treatment}**\n  Count: ${treatment.count} ${level.toLowerCase()}s\n  ${level === 'SAMPLE' && treatment.time ? `Time: ${treatment.time}` : ''}`
              )
              .join('\n\n')}${treatmentData.length > 20 ? '\n\n... and more treatments' : ''}`,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `No treatment data available for study ${studyId} at ${level} level.`,
          },
        ],
      };
    }
  }

  private async getPatients(args: any) {
    const { studyId, pageSize = 100 } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}/patients`, {
      params: { pageSize,import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ErrorCode,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  McpError,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";

// Configuration for cBioPortal API
const CBIOPORTAL_BASE_URL = "https://www.cbioportal.org/api";
const API_VERSION = "v3";

// Types for cBioPortal API responses
interface CancerStudy {
  studyId: string;
  name: string;
  description: string;
  cancerTypeId: string;
  allSampleCount: number;
  sequencedSampleCount: number;
  publicStudy: boolean;
}

interface Sample {
  sampleId: string;
  patientId: string;
  studyId: string;
  sampleType: string;
}

interface MolecularProfile {
  molecularProfileId: string;
  studyId: string;
  molecularAlterationType: string;
  datatype: string;
  name: string;
  description: string;
}

interface ClinicalData {
  sampleId: string;
  patientId: string;
  studyId: string;
  attrId: string;
  attrValue: string;
}

interface Mutation {
  entrezGeneId: number;
  hugoGeneSymbol: string;
  sampleId: string;
  patientId: string;
  mutationType: string;
  proteinChange: string;
  aminoAcidChange: string;
}

class CBioPortalMCPServer {
  private server: Server;
  private axiosInstance: axios.AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "cbioportal-mcp-server",
        version: "0.1.0",
      },
      {
        capabilities: {
          resources: {},
          tools: {},
        },
      }
    );

    // Configure axios with base URL and timeout
    this.axiosInstance = axios.create({
      baseURL: CBIOPORTAL_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          // Basic Study & Sample Access
          {
            name: "get_studies",
            description: "Get all cancer studies available in cBioPortal",
            inputSchema: {
              type: "object",
              properties: {
                keyword: {
                  type: "string",
                  description: "Search keyword for study name or cancer type",
                },
                pageSize: {
                  type: "number",
                  description: "Number of studies to return (default: 20)",
                  default: 20,
                },
              },
            },
          },
          {
            name: "get_study_details",
            description: "Get detailed information about a specific study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID (e.g., 'acc_tcga')",
                },
              },
              required: ["studyId"],
            },
          },
          {
            name: "get_samples",
            description: "Get samples from a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                pageSize: {
                  type: "number",
                  description: "Number of samples to return (default: 100)",
                  default: 100,
                },
              },
              required: ["studyId"],
            },
          },
          {
            name: "get_patients",
            description: "Get patients from a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                pageSize: {
                  type: "number",
                  description: "Number of patients to return (default: 100)",
                  default: 100,
                },
              },
              required: ["studyId"],
            },
          },
          {
            name: "get_sample_lists",
            description: "Get pre-defined sample lists (cohorts) for a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
              },
              required: ["studyId"],
            },
          },
          
          // Molecular Data Access
          {
            name: "get_molecular_profiles",
            description: "Get molecular profiles available for a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
              },
              required: ["studyId"],
            },
          },
          {
            name: "get_mutations",
            description: "Get mutation data for genes in a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                geneSymbols: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of Hugo gene symbols (e.g., ['TP53', 'KRAS'])",
                },
                sampleIds: {
                  type: "array",
                  items: { type: "string" },
                  description: "Optional: specific sample IDs to query",
                },
              },
              required: ["studyId", "geneSymbols"],
            },
          },
          {
            name: "get_copy_number_alterations",
            description: "Get copy number alteration data for genes",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                geneSymbols: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of Hugo gene symbols",
                },
                alterationType: {
                  type: "string",
                  enum: ["HOMDEL_AND_AMP", "HOMDEL", "AMP", "GAIN", "HETLOSS", "DIPLOID", "ALL"],
                  description: "Type of copy number events to include",
                  default: "HOMDEL_AND_AMP",
                },
              },
              required: ["studyId", "geneSymbols"],
            },
          },
          {
            name: "get_molecular_data",
            description: "Get expression or other molecular data for genes",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                geneSymbols: {
                  type: "array",
                  items: { type: "string" },
                  description: "List of Hugo gene symbols",
                },
                molecularProfileType: {
                  type: "string",
                  description: "Type of molecular profile (e.g., 'rna_seq_v2_mrna', 'protein_level')",
                },
              },
              required: ["studyId", "geneSymbols"],
            },
          },
          
          // Clinical Data Access
          {
            name: "get_clinical_data",
            description: "Get clinical data for patients or samples",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                clinicalDataType: {
                  type: "string",
                  enum: ["SAMPLE", "PATIENT"],
                  description: "Type of clinical data",
                  default: "SAMPLE",
                },
                attributeId: {
                  type: "string",
                  description: "Optional: specific clinical attribute ID",
                },
              },
              required: ["studyId"],
            },
          },
          {
            name: "get_clinical_attributes",
            description: "Get available clinical attributes for a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
              },
              required: ["studyId"],
            },
          },
          
          // Gene and Reference Data
          {
            name: "search_genes",
            description: "Search for genes by symbol or keyword",
            inputSchema: {
              type: "object",
              properties: {
                keyword: {
                  type: "string",
                  description: "Gene symbol or keyword to search",
                },
                pageSize: {
                  type: "number",
                  description: "Number of results to return (default: 20)",
                  default: 20,
                },
              },
              required: ["keyword"],
            },
          },
          {
            name: "get_gene_panels",
            description: "Get gene panels available for a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID (optional - if not provided, gets all panels)",
                },
              },
            },
          },
          
          // Cancer Types and Study View
          {
            name: "get_cancer_types",
            description: "Get all cancer types available in cBioPortal",
            inputSchema: {
              type: "object",
              properties: {},
            },
          },
          {
            name: "get_significantly_mutated_genes",
            description: "Get significantly mutated genes (MutSig results) for a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
              },
              required: ["studyId"],
            },
          },
          
          // Advanced Analysis
          {
            name: "get_survival_data",
            description: "Get survival data for patients in a study",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                attributeIdPrefix: {
                  type: "string",
                  description: "Prefix for survival attributes (e.g., 'OS' for overall survival)",
                  default: "OS",
                },
              },
              required: ["studyId"],
            },
          },
          {
            name: "get_treatment_data",
            description: "Get treatment data for patients or samples",
            inputSchema: {
              type: "object",
              properties: {
                studyId: {
                  type: "string",
                  description: "Study ID",
                },
                level: {
                  type: "string",
                  enum: ["PATIENT", "SAMPLE"],
                  description: "Level of treatment data",
                  default: "PATIENT",
                },
                tier: {
                  type: "string",
                  enum: ["Agent", "AgentClass", "AgentTarget"],
                  description: "Treatment tier level",
                  default: "Agent",
                },
              },
              required: ["studyId"],
            },
          },
        ],
      };
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      return {
        resources: [
          {
            uri: "cbioportal://studies",
            mimeType: "application/json",
            name: "Cancer Studies",
            description: "List of all available cancer studies in cBioPortal",
          },
          {
            uri: "cbioportal://cancer-types",
            mimeType: "application/json", 
            name: "Cancer Types",
            description: "List of all cancer types in cBioPortal",
          },
          {
            uri: "cbioportal://genes",
            mimeType: "application/json",
            name: "Genes",
            description: "Search and retrieve gene information",
          },
          {
            uri: "cbioportal://gene-panels",
            mimeType: "application/json",
            name: "Gene Panels",
            description: "Available gene panels used in sequencing studies",
          },
          {
            uri: "cbioportal://molecular-profiles",
            mimeType: "application/json",
            name: "Molecular Profiles",
            description: "All molecular profile types across studies",
          },
          {
            uri: "cbioportal://server-info",
            mimeType: "application/json",
            name: "Server Information",
            description: "cBioPortal server status and version information",
          },
        ],
      };
    });

    // Handle resource reading
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;

      try {
        switch (uri) {
          case "cbioportal://studies":
            const studies = await this.getAllStudies();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(studies, null, 2),
                },
              ],
            };

          case "cbioportal://cancer-types":
            const cancerTypes = await this.getCancerTypes();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(cancerTypes, null, 2),
                },
              ],
            };

          case "cbioportal://genes":
            // Return a sample of genes for browsing
            const genes = await this.getGenesSample();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(genes, null, 2),
                },
              ],
            };

          case "cbioportal://gene-panels":
            const genePanels = await this.getGenePanelsSample();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(genePanels, null, 2),
                },
              ],
            };

          case "cbioportal://molecular-profiles":
            const molecularProfiles = await this.getMolecularProfilesSample();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(molecularProfiles, null, 2),
                },
              ],
            };

          case "cbioportal://server-info":
            const serverInfo = await this.getServerInfo();
            return {
              contents: [
                {
                  uri,
                  mimeType: "application/json",
                  text: JSON.stringify(serverInfo, null, 2),
                },
              ],
            };

          default:
            throw new McpError(ErrorCode.InvalidRequest, `Unknown resource: ${uri}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Failed to read resource ${uri}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "get_studies":
            return await this.getStudies(args);

          case "get_study_details":
            return await this.getStudyDetails(args);

          case "get_samples":
            return await this.getSamples(args);

          case "get_patients":
            return await this.getPatients(args);

          case "get_sample_lists":
            return await this.getSampleLists(args);

          case "get_molecular_profiles":
            return await this.getMolecularProfiles(args);

          case "get_mutations":
            return await this.getMutations(args);

          case "get_copy_number_alterations":
            return await this.getCopyNumberAlterations(args);

          case "get_molecular_data":
            return await this.getMolecularData(args);

          case "get_clinical_data":
            return await this.getClinicalData(args);

          case "get_clinical_attributes":
            return await this.getClinicalAttributes(args);

          case "search_genes":
            return await this.searchGenes(args);

          case "get_gene_panels":
            return await this.getGenePanels(args);

          case "get_cancer_types":
            return await this.getCancerTypesTool(args);

          case "get_significantly_mutated_genes":
            return await this.getSignificantlyMutatedGenes(args);

          case "get_survival_data":
            return await this.getSurvivalData(args);

          case "get_treatment_data":
            return await this.getTreatmentData(args);

          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error) {
        throw new McpError(
          ErrorCode.InternalError,
          `Tool execution failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });
  }

  // API Methods
  private async getAllStudies(): Promise<CancerStudy[]> {
    const response = await this.axiosInstance.get('/studies');
    return response.data;
  }

  private async getCancerTypes(): Promise<any[]> {
    const response = await this.axiosInstance.get('/cancer-types');
    return response.data;
  }

  private async getGenesSample(): Promise<any[]> {
    const response = await this.axiosInstance.get('/genes', {
      params: { pageSize: 100, projection: 'SUMMARY' }
    });
    return response.data;
  }

  private async getGenePanelsSample(): Promise<any[]> {
    const response = await this.axiosInstance.get('/gene-panels', {
      params: { pageSize: 50, projection: 'SUMMARY' }
    });
    return response.data;
  }

  private async getMolecularProfilesSample(): Promise<any[]> {
    const response = await this.axiosInstance.get('/molecular-profiles', {
      params: { pageSize: 100, projection: 'SUMMARY' }
    });
    return response.data;
  }

  private async getServerInfo(): Promise<any> {
    try {
      const [infoResponse, healthResponse] = await Promise.all([
        this.axiosInstance.get('/info'),
        this.axiosInstance.get('/health')
      ]);
      
      return {
        info: infoResponse.data,
        health: healthResponse.data,
        apiUrl: CBIOPORTAL_BASE_URL,
      };
    } catch (error) {
      return {
        error: 'Unable to fetch server information',
        apiUrl: CBIOPORTAL_BASE_URL,
      };
    }
  }

  private async getStudies(args: any) {
    const { keyword, pageSize = 20 } = args;
    
    const params: any = {
      pageSize,
      projection: 'SUMMARY',
    };
    
    if (keyword) {
      params.keyword = keyword;
    }

    const response = await this.axiosInstance.get('/studies', { params });
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} studies:\n\n${response.data
            .slice(0, pageSize)
            .map((study: CancerStudy) => 
              `• **${study.name}** (${study.studyId})\n  ${study.description}\n  Samples: ${study.allSampleCount} (${study.sequencedSampleCount} sequenced)`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  private async getStudyDetails(args: any) {
    const { studyId } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}`);
    const study = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `## Study Details: ${study.name}

**Study ID:** ${study.studyId}
**Cancer Type:** ${study.cancerTypeId}
**Description:** ${study.description}
**Public Study:** ${study.publicStudy ? 'Yes' : 'No'}

**Sample Counts:**
- Total Samples: ${study.allSampleCount}
- Sequenced Samples: ${study.sequencedSampleCount}
- CNA Samples: ${study.cnaSampleCount || 'N/A'}
- RNA-seq Samples: ${study.mrnaRnaSeqSampleCount || 'N/A'}

**Citation:** ${study.citation || 'N/A'}
**PMID:** ${study.pmid || 'N/A'}`,
        },
      ],
    };
  }

  private async getSamples(args: any) {
    const { studyId, pageSize = 100 } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}/samples`, {
      params: { pageSize, projection: 'SUMMARY' }
    });
    
    const samples = response.data.slice(0, pageSize);
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${response.data.length} samples in study ${studyId}:\n\n${samples
            .map((sample: Sample) => 
              `• ${sample.sampleId} (Patient: ${sample.patientId}, Type: ${sample.sampleType})`
            )
            .join('\n')}`,
        },
      ],
    };
  }

  private async getMolecularProfiles(args: any) {
    const { studyId } = args;
    
    const response = await this.axiosInstance.get(`/studies/${studyId}/molecular-profiles`);
    const profiles = response.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Molecular profiles for study ${studyId}:\n\n${profiles
            .map((profile: MolecularProfile) => 
              `• **${profile.name}**\n  ID: ${profile.molecularProfileId}\n  Type: ${profile.molecularAlterationType}\n  Datatype: ${profile.datatype}\n  Description: ${profile.description}`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  private async getMutations(args: any) {
    const { studyId, geneSymbols, sampleIds } = args;
    
    // First, get the mutation molecular profile for this study
    const profilesResponse = await this.axiosInstance.get(`/studies/${studyId}/molecular-profiles`);
    const mutationProfile = profilesResponse.data.find(
      (profile: MolecularProfile) => profile.molecularAlterationType === 'MUTATION_EXTENDED'
    );
    
    if (!mutationProfile) {
      throw new Error(`No mutation data available for study ${studyId}`);
    }

    // Get gene information
    const genesResponse = await this.axiosInstance.post('/genes/fetch', geneSymbols, {
      params: { geneIdType: 'HUGO_GENE_SYMBOL' }
    });
    
    const genes = genesResponse.data;
    const entrezGeneIds = genes.map((gene: any) => gene.entrezGeneId);

    // Fetch mutations
    const mutationData = {
      entrezGeneIds,
      molecularProfileId: mutationProfile.molecularProfileId,
      ...(sampleIds && { sampleIds }),
    };

    const mutationsResponse = await this.axiosInstance.post(
      `/molecular-profiles/${mutationProfile.molecularProfileId}/mutations/fetch`,
      mutationData
    );
    
    const mutations = mutationsResponse.data;
    
    return {
      content: [
        {
          type: "text",
          text: `Found ${mutations.length} mutations in ${geneSymbols.join(', ')} for study ${studyId}:\n\n${mutations
            .slice(0, 50) // Limit to first 50 for readability
            .map((mut: Mutation) => 
              `• **${mut.hugoGeneSymbol}** in ${mut.sampleId} (${mut.patientId})\n  Type: ${mut.mutationType}\n  Change: ${mut.proteinChange || mut.aminoAcidChange || 'N/A'}`
            )
            .join('\n\n')}${mutations.length > 50 ? '\n\n... and more mutations' : ''}`,
        },
      ],
    };
  }

  private async getClinicalData(args: any) {
    const { studyId, clinicalDataType = 'SAMPLE', attributeId } = args;
    
    const params: any = {
      clinicalDataType,
      projection: 'SUMMARY',
      pageSize: 100,
    };
    
    if (attributeId) {
      params.attributeId = attributeId;
    }

    const response = await this.axiosInstance.get(`/studies/${studyId}/clinical-data`, { params });
    const clinicalData = response.data;
    
    // Group by attribute for better presentation
    const groupedData: { [key: string]: ClinicalData[] } = {};
    clinicalData.forEach((item: ClinicalData) => {
      if (!groupedData[item.attrId]) {
        groupedData[item.attrId] = [];
      }
      groupedData[item.attrId].push(item);
    });
    
    return {
      content: [
        {
          type: "text",
          text: `Clinical data for study ${studyId} (${clinicalDataType}):\n\n${Object.entries(groupedData)
            .map(([attrId, items]) => 
              `**${attrId}:**\n${items.slice(0, 10)
                .map(item => `  • ${item.sampleId || item.patientId}: ${item.attrValue}`)
                .join('\n')}${items.length > 10 ? `\n  ... and ${items.length - 10} more values` : ''}`
            )
            .join('\n\n')}`,
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("cBioPortal MCP server running on stdio");
  }
}

// Run the server
const server = new CBioPortalMCPServer();
server.run().catch(console.error);