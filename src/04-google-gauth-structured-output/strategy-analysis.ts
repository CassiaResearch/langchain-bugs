/**
 * Strategy Analysis Utilities for Structured Output
 * 
 * Provides functions to analyze which structured output strategy was used
 * (tool calling vs provider/native) and whether it worked correctly.
 */

export type StrategyType = "TOOL_CALLING" | "PROVIDER_JSON" | "PROVIDER_NO_JSON" | "UNKNOWN";

export type StrategyAnalysis = {
  strategy: StrategyType;
  structuredOutputWorked: boolean;
  details: string;
  parsedJson?: Record<string, unknown>;
};

/**
 * Analyzes the result to determine which structured output strategy was used
 * and whether it actually worked.
 * 
 * @param messages - Array of messages from the agent/model response
 * @param structuredResponse - The structuredResponse value from the result
 * @returns Analysis of which strategy was used and whether it worked
 */
export function analyzeStructuredOutputStrategy(
  messages: any[],
  structuredResponse: unknown
): StrategyAnalysis {
  const lastMessages = messages.slice(-5);
  
  // Check for tool calls (indicates TOOL_CALLING strategy)
  const toolCallMessage = lastMessages.find((m: any) => 
    m.tool_calls?.length > 0
  );
  const toolResponseMessage = lastMessages.find((m: any) => 
    m.name?.includes("extract") || m.name?.includes("MovieRecommendation")
  );
  
  const hasToolCalls = !!toolCallMessage || !!toolResponseMessage;
  
  // Get last AI message content
  const lastAiMessage = [...messages].reverse().find((m: any) => 
    m.constructor?.name?.includes("AI") || m._getType?.() === "ai"
  );
  const lastContent = lastAiMessage?.content;
  
  // Try to parse content as JSON
  let parsedJson: Record<string, unknown> | undefined;
  if (typeof lastContent === "string") {
    try {
      parsedJson = JSON.parse(lastContent);
    } catch {
      // Not JSON
    }
  }
  
  // Determine strategy and success
  if (hasToolCalls) {
    const toolName = toolCallMessage?.tool_calls?.[0]?.name || toolResponseMessage?.name || "unknown";
    return {
      strategy: "TOOL_CALLING",
      structuredOutputWorked: structuredResponse !== undefined,
      details: `Tool calling strategy detected (tool: "${toolName}")`,
      parsedJson,
    };
  }
  
  if (parsedJson) {
    return {
      strategy: "PROVIDER_JSON",
      structuredOutputWorked: structuredResponse !== undefined || parsedJson !== undefined,
      details: "Provider strategy - response is valid JSON",
      parsedJson,
    };
  }
  
  if (typeof lastContent === "string" && lastContent.length > 0) {
    return {
      strategy: "PROVIDER_NO_JSON",
      structuredOutputWorked: false,
      details: "Provider strategy attempted but response is NOT JSON (plain text/markdown)",
    };
  }
  
  return {
    strategy: "UNKNOWN",
    structuredOutputWorked: structuredResponse !== undefined,
    details: "Could not determine strategy",
  };
}

/**
 * Logs detailed analysis of the structured output result to console.
 * 
 * @param messages - Array of messages from the agent/model response
 * @param structuredResponse - The structuredResponse value from the result
 * @param schemaKeys - Expected keys in the schema for validation
 */
export function logStrategyAnalysis(
  messages: any[],
  structuredResponse: unknown,
  schemaKeys: string[]
): void {
  const analysis = analyzeStructuredOutputStrategy(messages, structuredResponse);
  
  console.log("\n" + "─".repeat(50));
  console.log("📊 STRATEGY ANALYSIS");
  console.log("─".repeat(50));
  console.log(`Strategy Detected: ${analysis.strategy}`);
  console.log(`Details: ${analysis.details}`);
  console.log(`structuredResponse defined: ${structuredResponse !== undefined}`);
  
  if (analysis.structuredOutputWorked) {
    console.log(`✅ Structured output WORKED`);
  } else {
    console.log(`❌ Structured output FAILED`);
  }
  
  // If we got JSON, check if it matches expected schema keys
  if (analysis.parsedJson) {
    const jsonKeys = Object.keys(analysis.parsedJson);
    const hasExpectedKeys = schemaKeys.every(k => jsonKeys.includes(k));
    console.log(`\nParsed JSON keys: [${jsonKeys.join(", ")}]`);
    console.log(`Expected schema keys: [${schemaKeys.join(", ")}]`);
    console.log(`Schema match: ${hasExpectedKeys ? "✅ YES" : "❌ NO"}`);
  }
  
  // Show last message content preview
  const lastAiMessage = [...messages].reverse().find((m: any) => 
    m.constructor?.name?.includes("AI") || m._getType?.() === "ai"
  );
  if (lastAiMessage?.content && typeof lastAiMessage.content === "string") {
    const preview = lastAiMessage.content.substring(0, 200);
    console.log(`\nLast AI message preview (first 200 chars):`);
    console.log(`"${preview}${lastAiMessage.content.length > 200 ? "..." : ""}"`);
  }
  console.log("─".repeat(50));
}

