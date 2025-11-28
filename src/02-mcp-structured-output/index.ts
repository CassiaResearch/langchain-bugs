/**
 * Bug #9418: Cannot use responseFormat with MCP tools
 * 
 * This example demonstrates the bug where using responseFormat (structured output)
 * with MCP tools causes issues. The structured output handling conflicts with
 * how MCP tool results are processed.
 * 
 * GitHub Issue: https://github.com/langchain-ai/langchainjs/issues/9418
 */

import "dotenv/config";
import { createAgent } from "langchain";
import { z } from "zod";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import {ChatOpenAI} from "@langchain/openai";

// Define a simple structured output schema
const SearchResultSchema = z.object({
  summary: z.string().describe("A brief summary of the search results"),
  sources: z.array(z.string()).describe("List of source URLs"),
  confidence: z.number().min(0).max(1).describe("Confidence score between 0 and 1"),
});

async function main() {
  console.log("Bug #9418: responseFormat with MCP tools");
  console.log("========================================\n");

  // Create MCP client connecting to Tavily's remote MCP server
  const client = new MultiServerMCPClient({
    mcpServers: {
      tavily: {
        url: `https://mcp.tavily.com/mcp/?tavilyApiKey=${process.env.TAVILY_API_KEY}`,
      },
    },
  });

  try {
    // Get tools from the MCP server
    const tools = await client.getTools();
    console.log(`Loaded ${tools.length} tools from Tavily MCP server\n`);

    // Create agent with responseFormat - this will fail
    const agent = createAgent({
      //Note using model: "openai:gpt-5.1" does not cause issues
      model: new ChatOpenAI({
        model: 'gpt-5.1',
      }),
      tools,
      responseFormat: SearchResultSchema,
    });

    console.log("Invoking agent with structured output...\n");

    // This call will fail due to responseFormat + MCP tools conflict
    const result = await agent.invoke({
      messages: [{ role: "user", content: "Search for recent AI news and summarize" }],
    });

    console.log("Structured Response:", result.structuredResponse);
  } catch (error) {
    console.error("ERROR (Expected):");
    console.error(error);
  } finally {
    await client.close();
  }
}

main();

