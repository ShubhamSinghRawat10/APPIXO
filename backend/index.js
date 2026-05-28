const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const DEFAULT_MODEL_NAME = "gemini-2.0-flash";
const MODEL_NAME = process.env.GEMINI_MODEL || DEFAULT_MODEL_NAME;
const MAX_CODE_LENGTH = 50000;
const PLACEHOLDER_API_KEY = "your_gemini_api_key_here";

// Grok (xAI) settings
const GROK_API_KEY = process.env.GROK_API_KEY || "";
const GROK_BASE_URL = "https://api.x.ai/v1/chat/completions";
const GROK_MODEL = process.env.GROK_MODEL || "grok-3-mini-fast";
const PROVIDER_SETTING = (process.env.PROVIDER || "auto").toLowerCase();

app.use(cors());
app.use(express.json({ limit: "2mb" }));

// ─── Utility Helpers ──────────────────────────────────────────────────────────

const sanitizeString = (v) => (typeof v === "string" ? v.trim() : "");

const hasConfiguredValue = (value, placeholder) =>
  Boolean(value && value.trim() && value.trim() !== placeholder);

const hasGeminiApiKey = hasConfiguredValue(
  process.env.GEMINI_API_KEY,
  PLACEHOLDER_API_KEY
);

const genAI = hasGeminiApiKey
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const normalizeStringList = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeString(String(item || "")))
        .filter(Boolean)
        .slice(0, 8)
    : [];

const normalizeQualityScore = (value) => {
  const score = Number(value);
  return Number.isFinite(score) ? Math.max(0, Math.min(100, Math.round(score))) : null;
};

const sanitizeConvertedCode = (value) =>
  sanitizeString(value)
    .replace(/^```[a-zA-Z0-9+#-]*\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractJsonObject = (text) => {
  const trimmed = sanitizeString(text);
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("Model returned an unexpected response format.");
  return JSON.parse(jsonMatch[0]);
};

// ─── Performance Timer ────────────────────────────────────────────────────────

const timer = () => {
  const start = performance.now();
  return () => ((performance.now() - start) / 1000).toFixed(2);
};

// ─── In-Memory LRU Cache ──────────────────────────────────────────────────────

class LRUCache {
  constructor(maxSize = 50, ttlMs = 15 * 60 * 1000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.cache = new Map();
  }

  _key(obj) {
    return `${obj.sourceLanguage}:${obj.targetLanguage}:${obj.provider || "auto"}:${obj.sourceCode}`;
  }

  get(params) {
    const key = this._key(params);
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > this.ttlMs) {
      this.cache.delete(key);
      return null;
    }
    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(params, value) {
    const key = this._key(params);
    if (this.cache.size >= this.maxSize) {
      // Evict oldest entry
      const oldest = this.cache.keys().next().value;
      this.cache.delete(oldest);
    }
    this.cache.set(key, { value, ts: Date.now() });
  }
}

const conversionCache = new LRUCache(50, 15 * 60 * 1000);

// ─── Smart Token Estimation ───────────────────────────────────────────────────

const estimateMaxOutputTokens = (sourceCode) => {
  const charLen = sourceCode.length;
  // Code typically expands ~1.3x during translation + JSON overhead (~800 tokens)
  const estimated = Math.ceil(charLen / 3.2) + 800;
  return Math.min(16384, Math.max(1024, estimated));
};

// ─── Optimized Prompt ─────────────────────────────────────────────────────────

const buildPrompt = ({ sourceLanguage, targetLanguage, sourceCode, instructions }) =>
  `Convert this ${sourceLanguage} code to idiomatic ${targetLanguage}.

Rules:
• Preserve all behavior: inputs, outputs, side effects, errors, complexity.
• Keep names, APIs, control flow as close as ${targetLanguage} idioms allow.
• Convert imports, stdlib calls, typing, memory/async/error handling accurately.
• Don't omit edge cases, helpers, constants, or meaningful comments.
• If exact equivalence is impossible, use the closest safe behavior and note it in warnings.

Verify before responding:
1. Every source function/block has a corresponding output.
2. Output compiles/runs plausibly in ${targetLanguage}.
3. No markdown fences or placeholder code in convertedCode.

Return ONLY valid JSON with these keys:
- convertedCode (string, raw code, no fences)
- summary (string, brief approach)
- keyChanges (string[], important translation changes)
- warnings (string[], caveats or manual checks needed)
- qualityScore (number 0-100, honest semantic-equivalence estimate)
- validationChecks (string[], verification steps completed)
${instructions ? `\nUser instructions: ${instructions}` : ""}

Source code:
${sourceCode}`;

// ─── Retry Helper ─────────────────────────────────────────────────────────────

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const withRetry = async (fn, { retries = 1, delayMs = 2000, shouldRetry } = {}) => {
  let lastError;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries && shouldRetry(error)) {
        console.warn(`Retry ${attempt + 1}/${retries} after error: ${error?.message}`);
        await sleep(delayMs * (attempt + 1));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
};

const isRetryableError = (error) => {
  const msg = (error?.message || "").toLowerCase();
  return (
    msg.includes("503") ||
    msg.includes("429") ||
    msg.includes("overloaded") ||
    msg.includes("high demand") ||
    msg.includes("service unavailable") ||
    msg.includes("temporarily") ||
    msg.includes("rate limit")
  );
};

// ─── Gemini Schema ────────────────────────────────────────────────────────────

const conversionSchema = {
  type: SchemaType.OBJECT,
  required: ["convertedCode", "summary", "keyChanges", "warnings", "qualityScore", "validationChecks"],
  properties: {
    convertedCode: {
      type: SchemaType.STRING,
      description: "The converted code only, with no markdown fences.",
    },
    summary: {
      type: SchemaType.STRING,
      description: "A short explanation of the conversion approach.",
    },
    keyChanges: {
      type: SchemaType.ARRAY,
      description: "Key code changes made during translation.",
      items: { type: SchemaType.STRING },
    },
    warnings: {
      type: SchemaType.ARRAY,
      description: "Caveats, unsupported features, or manual review notes.",
      items: { type: SchemaType.STRING },
    },
    qualityScore: {
      type: SchemaType.NUMBER,
      description: "Self-assessed semantic equivalence score from 0 to 100.",
    },
    validationChecks: {
      type: SchemaType.ARRAY,
      description: "Short checklist items confirming semantic equivalence checks.",
      items: { type: SchemaType.STRING },
    },
  },
};

// ─── Cached Gemini Model Instances ────────────────────────────────────────────

const modelCandidates = [...new Set([MODEL_NAME, DEFAULT_MODEL_NAME])].filter(Boolean);

const geminiModelCache = new Map();

const getGeminiModel = (modelName, sourceCodeLength) => {
  const tokenBucket = sourceCodeLength > 5000 ? "large" : sourceCodeLength > 1000 ? "medium" : "small";
  const cacheKey = `${modelName}:${tokenBucket}`;

  if (geminiModelCache.has(cacheKey)) return geminiModelCache.get(cacheKey);

  if (!genAI) return null;

  const maxOutputTokens = estimateMaxOutputTokens({ length: sourceCodeLength });

  const config = {
    model: modelName,
    generationConfig: {
      temperature: 0.02,
      topP: 0.6,
      maxOutputTokens: Math.min(16384, Math.max(1024, Math.ceil(sourceCodeLength / 3.2) + 800)),
      responseMimeType: "application/json",
      responseSchema: conversionSchema,
    },
  };

  // Enable thinking budget for gemini-2.5 models (massively improves accuracy)
  if (modelName.includes("2.5")) {
    config.generationConfig.thinkingConfig = {
      thinkingBudget: Math.min(4096, Math.max(512, Math.ceil(sourceCodeLength / 8))),
    };
  }

  const model = genAI.getGenerativeModel(config);
  geminiModelCache.set(cacheKey, model);
  return model;
};

// ─── Error Parsers ────────────────────────────────────────────────────────────

const parseGeminiError = (error) => {
  const message = error?.message || "Gemini request failed.";
  const n = message.toLowerCase();

  if (n.includes("quota exceeded") || n.includes("too many requests")) {
    return { status: 429, error: "Gemini quota exceeded. Wait for reset or use a different key." };
  }
  if (n.includes("api key not valid") || n.includes("api_key_invalid")) {
    return { status: 401, error: "Gemini API key is invalid. Update backend/.env." };
  }
  if (n.includes("model") && (n.includes("not found") || n.includes("not supported"))) {
    return { status: 503, error: `Model ${MODEL_NAME} is not available for this key.` };
  }
  return { status: 502, error: "Gemini could not complete the conversion." };
};

const isUnavailableModelError = (error) => {
  const m = (error?.message || "").toLowerCase();
  return m.includes("not found") || m.includes("not supported");
};

const parseGrokError = (error) => {
  const n = (error?.message || "Grok request failed.").toLowerCase();
  if (n.includes("rate limit") || n.includes("429")) {
    return { status: 429, error: "Grok rate limit exceeded. Try again shortly." };
  }
  if (n.includes("api key") || n.includes("401") || n.includes("invalid")) {
    return { status: 401, error: "Grok API key is invalid. Update GROK_API_KEY in .env." };
  }
  return { status: 502, error: `Grok error: ${error?.message || "Unknown"}` };
};

// ─── Grok (xAI) Provider ─────────────────────────────────────────────────────

const hasGrokApiKey = Boolean(GROK_API_KEY && GROK_API_KEY.trim() && GROK_API_KEY.trim() !== "your_grok_api_key_here");

const convertWithGrok = async ({ sourceLanguage, targetLanguage, sourceCode, instructions }) => {
  if (!hasGrokApiKey) {
    throw Object.assign(
      new Error("Grok is not configured. Add GROK_API_KEY to backend/.env (get one free at console.x.ai)."),
      { providerStatus: 503 }
    );
  }

  const elapsed = timer();
  const prompt = buildPrompt({ sourceLanguage, targetLanguage, sourceCode, instructions });
  const maxTokens = Math.min(16384, Math.max(2048, Math.ceil(sourceCode.length / 3) + 1000));

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);

  try {
    const response = await withRetry(
      () =>
        fetch(GROK_BASE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROK_API_KEY}`,
          },
          body: JSON.stringify({
            model: GROK_MODEL,
            messages: [
              {
                role: "system",
                content:
                  "You are a code translator. Respond with ONLY a valid JSON object containing: convertedCode (string), summary (string), keyChanges (string[]), warnings (string[]), qualityScore (number 0-100), validationChecks (string[]). No markdown fences. No extra text.",
              },
              { role: "user", content: prompt },
            ],
            max_tokens: maxTokens,
            temperature: 0.02,
            top_p: 0.6,
          }),
          signal: controller.signal,
        }),
      { retries: 1, delayMs: 2000, shouldRetry: isRetryableError }
    );

    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const status = response.status;
      if (status === 401) throw new Error("Grok API key is invalid.");
      if (status === 429) throw new Error("Grok rate limit exceeded.");
      throw new Error(`Grok returned HTTP ${status}: ${errorBody}`);
    }

    const data = await response.json();
    const rawContent = data?.choices?.[0]?.message?.content || "";

    if (!rawContent.trim()) throw new Error("Grok returned an empty response.");

    // Parse JSON
    const cleaned = rawContent.replace(/```(?:json)?\s*/gi, "").replace(/```\s*/g, "").trim();
    const jsonMatch = cleaned.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error("Grok response did not contain valid JSON.");

    const payload = JSON.parse(jsonMatch[0]);
    const convertedCode = sanitizeConvertedCode(payload.convertedCode || "");
    if (!convertedCode) throw new Error("Grok returned empty convertedCode.");

    const qualityScore = normalizeQualityScore(payload.qualityScore);
    const warnings = normalizeStringList(payload.warnings);

    console.log(`✓ Grok completed in ${elapsed()}s (${rawContent.length} chars)`);

    return {
      convertedCode,
      summary: sanitizeString(payload.summary) || `Converted ${sourceLanguage} → ${targetLanguage}.`,
      keyChanges: normalizeStringList(payload.keyChanges),
      warnings:
        qualityScore !== null && qualityScore < 97
          ? [...warnings, "Quality below 97 — review carefully."].slice(0, 8)
          : warnings,
      qualityScore,
      validationChecks: normalizeStringList(payload.validationChecks),
      model: GROK_MODEL,
      provider: "grok",
    };
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Grok timed out after 2 minutes.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
};

// ─── Gemini Provider ──────────────────────────────────────────────────────────

const convertWithGemini = async ({ sourceLanguage, targetLanguage, sourceCode, instructions }) => {
  if (!genAI) {
    throw Object.assign(
      new Error("Gemini is not configured. Add GEMINI_API_KEY to backend/.env."),
      { providerStatus: 503 }
    );
  }

  const elapsed = timer();
  let lastError;

  for (const modelName of modelCandidates) {
    try {
      const model = getGeminiModel(modelName, sourceCode.length);
      if (!model) throw new Error("Gemini model not available.");

      const result = await withRetry(
        () => model.generateContent(
          buildPrompt({ sourceLanguage, targetLanguage, sourceCode, instructions })
        ),
        { retries: 1, delayMs: 3000, shouldRetry: isRetryableError }
      );

      const payload = extractJsonObject(result.response.text());
      const convertedCode = sanitizeConvertedCode(payload.convertedCode);
      const qualityScore = normalizeQualityScore(payload.qualityScore);
      const warnings = normalizeStringList(payload.warnings);

      if (!convertedCode) throw new Error("Gemini returned empty convertedCode.");

      console.log(`✓ Gemini (${modelName}) completed in ${elapsed()}s`);

      return {
        sourceLanguage,
        targetLanguage,
        convertedCode,
        summary: sanitizeString(payload.summary) || `Converted ${sourceLanguage} → ${targetLanguage}.`,
        keyChanges: normalizeStringList(payload.keyChanges),
        warnings:
          qualityScore !== null && qualityScore < 97
            ? [...warnings, "Quality below 97 — review carefully."].slice(0, 8)
            : warnings,
        qualityScore,
        validationChecks: normalizeStringList(payload.validationChecks),
        model: modelName,
        provider: "gemini",
      };
    } catch (error) {
      lastError = error;
      if (isUnavailableModelError(error) && modelName !== DEFAULT_MODEL_NAME) continue;
      throw error;
    }
  }

  throw lastError || new Error("No Gemini model could complete the request.");
};

// ─── Provider Router ──────────────────────────────────────────────────────────

const resolveProvider = (requestedProvider) => {
  const requested = (requestedProvider || PROVIDER_SETTING).toLowerCase();
  if (requested === "grok") return "grok";
  if (requested === "gemini") return "gemini";
  return "auto";
};

const runConversion = async (params, requestedProvider) => {
  const provider = resolveProvider(requestedProvider);

  // Check cache first
  const cacheKey = { ...params, provider: requestedProvider };
  const cached = conversionCache.get(cacheKey);
  if (cached) {
    console.log("⚡ Cache hit — returning cached conversion");
    return { ...cached, cached: true };
  }

  let result;

  if (provider === "grok") {
    result = await convertWithGrok(params);
  } else if (provider === "gemini") {
    result = await convertWithGemini(params);
  } else {
    // Auto mode: Gemini first, Grok fallback
    try {
      result = await convertWithGemini(params);
    } catch (geminiError) {
      console.warn("Gemini failed, falling back to Grok:", geminiError?.message);
      if (hasGrokApiKey) {
        result = await convertWithGrok(params);
      } else {
        throw geminiError;
      }
    }
  }

  // Cache the successful result
  conversionCache.set(cacheKey, result);
  return result;
};

// ─── Request Validation ───────────────────────────────────────────────────────

const validateConversionRequest = (body) => {
  const sourceLanguage = sanitizeString(body?.sourceLanguage);
  const targetLanguage = sanitizeString(body?.targetLanguage);
  const sourceCode = typeof body?.sourceCode === "string" ? body.sourceCode : "";
  const instructions = sanitizeString(body?.instructions);

  if (!sourceLanguage || !targetLanguage) {
    return { error: "Choose both a source language and a target language." };
  }

  if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
    return { error: "Choose two different languages so there is something to convert." };
  }

  if (!sanitizeString(sourceCode)) {
    return { error: "Paste some source code before starting the conversion." };
  }

  if (sourceCode.length > MAX_CODE_LENGTH) {
    return { error: `Source code is too large. Keep it under ${MAX_CODE_LENGTH.toLocaleString()} characters.` };
  }

  return { sourceLanguage, targetLanguage, sourceCode, instructions };
};

// ─── Routes ───────────────────────────────────────────────────────────────────

app.get("/api/health", async (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "appixo-code-converter",
    provider: PROVIDER_SETTING,
    gemini: {
      configured: hasGeminiApiKey,
      model: MODEL_NAME,
      fallbackModels: modelCandidates.slice(1),
    },
    grok: {
      configured: hasGrokApiKey,
      model: GROK_MODEL,
    },
    cache: {
      size: conversionCache.cache.size,
      maxSize: conversionCache.maxSize,
    },
  });
});

app.post("/api/convert", async (req, res) => {
  const validated = validateConversionRequest(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  const requestedProvider = sanitizeString(req.body?.provider);
  const elapsed = timer();

  try {
    const result = await runConversion(validated, requestedProvider);

    return res.status(200).json({
      sourceLanguage: validated.sourceLanguage,
      targetLanguage: validated.targetLanguage,
      ...result,
      responseTime: `${elapsed()}s`,
    });
  } catch (error) {
    const errorMsg = error?.message || "Unknown error";
    console.error(`✗ Conversion failed in ${elapsed()}s:`, errorMsg);

    const isGrokError =
      errorMsg.includes("Grok") ||
      errorMsg.includes("grok") ||
      errorMsg.includes("x.ai") ||
      resolveProvider(requestedProvider) === "grok";

    if (isGrokError) {
      const grokErr = parseGrokError(error);
      return res.status(grokErr.status).json({ error: grokErr.error, provider: "grok" });
    }

    const formattedError = parseGeminiError(error);
    return res.status(formattedError.status).json({ error: formattedError.error });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({ error: "Unexpected server error." });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

const server = app.listen(PORT, async () => {
  console.log(`\n🚀 Appixo backend running on http://localhost:${PORT}`);
  console.log(`   Provider: ${PROVIDER_SETTING} | Cache: 50 slots, 15min TTL\n`);

  if (hasGeminiApiKey) {
    const thinkingEnabled = MODEL_NAME.includes("2.5");
    console.log(`   ✓ Gemini: ${MODEL_NAME}${thinkingEnabled ? " (thinking enabled)" : ""}`);
  } else {
    console.warn("   ✗ Gemini: not configured — add GEMINI_API_KEY to .env");
  }

  if (hasGrokApiKey) {
    console.log(`   ✓ Grok: ${GROK_MODEL}`);
  } else {
    console.warn("   ✗ Grok: not configured — add GROK_API_KEY to .env for fallback");
  }

  console.log("");
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use.`);
  } else {
    console.error("Failed to start Appixo backend:", error);
  }
  process.exit(1);
});
