import { OpenAI } from "openai";
import { SYSTEM_PROMPT, FEW_SHOT_EXAMPLES } from "../prompts/crmExtraction.js";
import type { RawRecord, CrmRecord } from "../types/crmRecord.js";

// Define strict JSON schema for the OpenAI Structured Outputs API
const leadsResponseSchema = {
  type: "object",
  properties: {
    leads: {
      type: "array",
      description: "List of successfully mapped CRM lead records.",
      items: {
        type: "object",
        properties: {
          created_at: {
            type: "string",
            description: "Date string in format YYYY-MM-DD HH:mm:ss or parseable ISO format."
          },
          name: {
            type: "string",
            description: "Lead name."
          },
          email: {
            type: "string",
            description: "First email address extracted. Blank if not found."
          },
          country_code: {
            type: "string",
            description: "Mobile country code prefix (e.g. +91, +1)."
          },
          mobile_without_country_code: {
            type: "string",
            description: "Mobile number without country code."
          },
          company: {
            type: "string",
            description: "Company name, default to '—'."
          },
          city: {
            type: "string",
            description: "City name."
          },
          state: {
            type: "string",
            description: "State name."
          },
          country: {
            type: "string",
            description: "Country name."
          },
          lead_owner: {
            type: "string",
            description: "Email of the lead owner."
          },
          crm_status: {
            type: "string",
            enum: ["GOOD_LEAD_FOLLOW_UP", "DID_NOT_CONNECT", "BAD_LEAD", "SALE_DONE", ""],
            description: "Lead status."
          },
          crm_note: {
            type: "string",
            description: "Aggregated comments, extra phone numbers, extra emails, budgets, and remarks."
          },
          data_source: {
            type: "string",
            enum: ["leads_on_demand", "meridian_tower", "eden_park", "varah_swamy", "sarjapur_plots", ""],
            description: "Matching data source channel."
          },
          possession_time: {
            type: "string",
            description: "Timeline for possession."
          },
          description: {
            type: "string",
            description: "Additional description details."
          }
        },
        required: [
          "created_at",
          "name",
          "email",
          "country_code",
          "mobile_without_country_code",
          "company",
          "city",
          "state",
          "country",
          "lead_owner",
          "crm_status",
          "crm_note",
          "data_source",
          "possession_time",
          "description"
        ],
        additionalProperties: false
      }
    }
  },
  required: ["leads"],
  additionalProperties: false
};

import { Logger } from "../utils/logger.js";

export class AiService {
  private static openaiClient: OpenAI | null = null;

  private static getClient(): OpenAI {
    if (!this.openaiClient) {
      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        Logger.error("Failed to initialize OpenAI client: OPENAI_API_KEY is not defined in environment.", "AI-Service");
        throw new Error("OPENAI_API_KEY environment variable is not defined.");
      }
      this.openaiClient = new OpenAI({ apiKey });
      Logger.info("OpenAI client initialized successfully.", "AI-Service");
    }
    return this.openaiClient;
  }

  /**
   * Translates a batch of raw records to CRM leads using OpenAI.
   * Uses structured JSON response format to guarantee schema matching.
   * 
   * @param rawRecords Array of raw key-value strings from CSV parser
   * @returns Array of mapped CRM records
   */
  public static async mapBatch(rawRecords: RawRecord[]): Promise<CrmRecord[]> {
    const startTime = Date.now();
    Logger.info(`Initiating AI translation call for ${rawRecords.length} records...`, "AI-Service");
    
    const client = this.getClient();

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini", // Cost-efficient, fast, and fully supports structured outputs
      temperature: 0.1, // Low temperature for precise schema adherence
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...FEW_SHOT_EXAMPLES.map(ex => ({
          role: ex.role as "user" | "assistant",
          content: ex.content
        })),
        {
          role: "user",
          content: JSON.stringify(rawRecords)
        }
      ],
      response_format: {
        type: "json_schema",
        json_schema: {
          name: "crm_leads_mapping",
          strict: true,
          schema: leadsResponseSchema
        }
      }
    });

    const duration = Date.now() - startTime;
    const outputText = response.choices[0]?.message?.content;
    if (!outputText) {
      Logger.error("Empty completion response from OpenAI.", "AI-Service");
      throw new Error("Empty response returned from OpenAI completion API.");
    }

    Logger.info(`AI mapping finished in ${duration}ms.`, "AI-Service");
    const parsedData = JSON.parse(outputText);
    return (parsedData.leads || []) as CrmRecord[];
  }
}
