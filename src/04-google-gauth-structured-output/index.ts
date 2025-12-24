/**
 * Example 04: Using @langchain/google-webauth with Gemini 3 Pro and Structured Output
 *
 * This example demonstrates the workaround for issues with @langchain/google-genai
 * by using @langchain/google-webauth which makes direct REST calls to the Gemini API
 * instead of using the deprecated @google/generative-ai SDK.
 *
 * Key points:
 * - Uses @langchain/google-webauth instead of @langchain/google-genai
 * - Instantiates ChatGoogle directly instead of using string model identifiers
 * - Tests both providerStrategy (native Gemini responseSchema) and toolStrategy
 *
 * See:
 * - Email thread: "Cassia Research Inc Mail - @langchain_google-genai - EOL dependancies..."
 * - Docs: https://docs.langchain.com/oss/javascript/langchain/structured-output
 */

import "dotenv/config";
import { z } from "zod";
import { ChatGoogle } from "@langchain/google-webauth";
import { createAgent, providerStrategy, toolStrategy } from "langchain";
import { HumanMessage } from "@langchain/core/messages";
import { logStrategyAnalysis } from "./strategy-analysis.js";

// Define a simple structured output schema
const MovieRecommendationSchema = z.object({
  title: z.string().describe("The title of the recommended movie"),
  year: z.number().describe("The year the movie was released"),
  genre: z.string().describe("The primary genre of the movie"),
  reason: z.string().describe("Why this movie is recommended based on the user's request"),
  rating: z.number().min(1).max(10).describe("Estimated rating out of 10"),
});

const SCHEMA_KEYS = ["title", "year", "genre", "reason", "rating"];

async function main() {
  console.log("Example 04: @langchain/google-webauth with Gemini 3 Pro and Structured Output");
  console.log("=============================================================================\n");

  // Instantiate ChatGoogle directly - this avoids the deprecated @google/generative-ai SDK
  // The @langchain/google-webauth package makes direct REST calls to the Gemini API
  const model = new ChatGoogle({
    model: "gemini-3-pro-preview",
    // Use "gai" (Google AI Studio) platform instead of "gcp" (Vertex AI)
    platformType: "gai",
    // API key - uses GOOGLE_API_KEY env var, or can be passed directly
    apiKey: process.env.GOOGLE_API_KEY,
  });

  console.log("Model instantiated: ChatGoogle with gemini-3-pro-preview (platformType: gai)\n");

  const testMessages = [
    { role: "user" as const, content: "Recommend a classic sci-fi movie from the 1980s" },
  ];

  // ============================================
  // Test 1: Default behavior (no strategy wrapper)
  // ============================================
  console.log("=".repeat(70));
  console.log("TEST 1: createAgent with responseFormat (default - auto-detect strategy)");
  console.log("=".repeat(70));
  console.log("\n📋 Using: responseFormat: MovieRecommendationSchema");
  console.log("   Expected: LangChain auto-detects if model supports native structured output\n");
  
  try {
    const agent1 = createAgent({
      model,
      tools: [],
      responseFormat: MovieRecommendationSchema,
    });
    
    const result = await agent1.invoke({ messages: testMessages });
    
    console.log("✅ Invocation completed!");
    console.log("\nstructuredResponse value:");
    console.log(JSON.stringify(result.structuredResponse, null, 2));
    
    // Detailed strategy analysis
    logStrategyAnalysis(result.messages, result.structuredResponse, SCHEMA_KEYS);
  } catch (error: any) {
    console.error("\n❌ ERROR:");
    console.error(error.message || error);
  }

  // ============================================
  // Test 2: Explicit providerStrategy (native Gemini responseSchema)
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 2: createAgent with providerStrategy() - Native structured output");
  console.log("=".repeat(70));
  console.log("\n📋 Using: responseFormat: providerStrategy(MovieRecommendationSchema)");
  console.log("   Expected: Uses Gemini's native responseSchema feature\n");
  
  try {
    const agent2 = createAgent({
      model,
      tools: [],
      responseFormat: providerStrategy(MovieRecommendationSchema),
    });
    
    const result = await agent2.invoke({ messages: testMessages });
    
    console.log("✅ Invocation completed!");
    console.log("\nstructuredResponse value:");
    console.log(JSON.stringify(result.structuredResponse, null, 2));
    
    // Detailed strategy analysis
    logStrategyAnalysis(result.messages, result.structuredResponse, SCHEMA_KEYS);
  } catch (error: any) {
    console.error("\n❌ ERROR with providerStrategy:");
    console.error(error.message || error);
  }

  // ============================================
  // Test 3: Explicit toolStrategy (function calling)
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 3: createAgent with toolStrategy() - Function calling");
  console.log("=".repeat(70));
  console.log("\n📋 Using: responseFormat: toolStrategy(MovieRecommendationSchema)");
  console.log("   Expected: Uses tool/function calling with 'extract-1' tool\n");
  
  try {
    const agent3 = createAgent({
      model,
      tools: [],
      responseFormat: toolStrategy(MovieRecommendationSchema),
    });
    
    const result = await agent3.invoke({ messages: testMessages });
    
    console.log("✅ Invocation completed!");
    console.log("\nstructuredResponse value:");
    console.log(JSON.stringify(result.structuredResponse, null, 2));
    
    // Detailed strategy analysis
    logStrategyAnalysis(result.messages, result.structuredResponse, SCHEMA_KEYS);
  } catch (error: any) {
    console.error("\n❌ ERROR with toolStrategy:");
    console.error(error.message || error);
  }

  // ============================================
  // Test 4: Raw model.withStructuredOutput() - No createAgent
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 4: Raw llm.withStructuredOutput() - No createAgent");
  console.log("=".repeat(70));
  console.log("\n📋 Using: llm.withStructuredOutput(schema) directly");
  console.log("   Expected: Uses native responseSchema (as per LangChain support recommendation)\n");
  
  try {
    // This is the approach recommended by LangChain support in the email thread
    // Use includeRaw: true to get access to the raw message for analysis
    const structuredLlm = model.withStructuredOutput(MovieRecommendationSchema, {
      includeRaw: true,
    });
    
    const result = await structuredLlm.invoke([
      new HumanMessage("Recommend a classic sci-fi movie from the 1980s")
    ]);
    
    console.log("✅ Invocation completed!");
    
    // With includeRaw: true, result has { raw: AIMessage, parsed: T }
    console.log("\nstructuredResponse value (result.parsed):");
    console.log(JSON.stringify(result.parsed, null, 2));
    
    // Use the same analysis function - wrap raw message in array for consistency
    logStrategyAnalysis([result.raw], result.parsed, SCHEMA_KEYS);
    
  } catch (error: any) {
    console.error("\n❌ ERROR with raw withStructuredOutput:");
    console.error(error.message || error);
  }

  // ============================================
  // Test 5: ChatGoogle with responseSchema in constructor + providerStrategy
  // ============================================
  console.log("\n" + "=".repeat(70));
  console.log("TEST 5: ChatGoogle(responseSchema) + createAgent with providerStrategy()");
  console.log("=".repeat(70));
  console.log("\n📋 Using: responseSchema in ChatGoogle constructor AND providerStrategy in createAgent");
  console.log("   Configures native JSON output at model level\n");
  
  try {
    // Create a new model instance with responseSchema configured at construction
    const modelWithSchema = new ChatGoogle({
      model: "gemini-3-pro-preview",
      platformType: "gai",
      apiKey: process.env.GOOGLE_API_KEY,
      // Configure response format at model level
      responseMimeType: "application/json",
      responseSchema: {
        type: "object",
        properties: {
          title: { type: "string", description: "The title of the recommended movie" },
          year: { type: "number", description: "The year the movie was released" },
          genre: { type: "string", description: "The primary genre of the movie" },
          reason: { type: "string", description: "Why this movie is recommended" },
          rating: { type: "number", description: "Estimated rating out of 10" },
        },
        required: ["title", "year", "genre", "reason", "rating"],
      },
    });
    
    const agent5 = createAgent({
      model: modelWithSchema,
      tools: [],
      responseFormat: providerStrategy(MovieRecommendationSchema),
    });
    
    const result = await agent5.invoke({ messages: testMessages });
    
    console.log("✅ Invocation completed!");
    console.log("\nstructuredResponse value:");
    console.log(JSON.stringify(result.structuredResponse, null, 2));
    
    // Detailed strategy analysis
    logStrategyAnalysis(result.messages, result.structuredResponse, SCHEMA_KEYS);
  } catch (error: any) {
    console.error("\n❌ ERROR with responseSchema + providerStrategy:");
    console.error(error.message || error);
  }

  console.log("\n" + "=".repeat(70));
  console.log("TESTS COMPLETE");
  console.log("=".repeat(70));
}

main();

