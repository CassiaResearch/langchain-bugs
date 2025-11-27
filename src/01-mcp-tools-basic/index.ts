/**
 * Bug #9496: createAgent binds tools with strict:true for OpenAI
 * 
 * This example demonstrates the bug where MCP tools fail when used with
 * createAgent and OpenAI because the agent binds tools with strict:true,
 * but MCP tool schemas don't include "additionalProperties: false".
 * 
 * Expected Error:
 * BadRequestError: 400 Invalid schema for function 'tavily_search': 
 * In context=(), 'additionalProperties' is required to be supplied and to be false.
 * 
 * GitHub Issue: https://github.com/langchain-ai/langchainjs/issues/9496
 */

import "dotenv/config";
import { createAgent } from "langchain";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

async function main() {
  console.log("Bug #9496: MCP Tools with strict:true");
  console.log("=====================================\n");

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

    // Create agent with OpenAI model and MCP tools
    // This will fail because createAgent binds tools with strict:true
    const agent = createAgent({
      model: "openai:gpt-5.1",
      tools,
    });

    console.log("Invoking agent with search query...\n");

    // This call will fail with the strict:true error
    const result = await agent.invoke({
      messages: [{ role: "user", content: "What is the weather in San Francisco?" }],
    });

    console.log("Result:", result);
  } catch (error) {
    console.error("ERROR (Expected):");
    console.error(error);
  } finally {
    await client.close();
  }
}

main();

