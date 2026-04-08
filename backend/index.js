const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const { GoogleGenerativeAI, SchemaType } = require("@google/generative-ai");

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const DEFAULT_MODEL_NAME = "gemini-2.0-flash";
const MODEL_NAME = process.env.GEMINI_MODEL || DEFAULT_MODEL_NAME;
const MAX_CODE_LENGTH = 20000;
const PLACEHOLDER_API_KEY = "your_gemini_api_key_here";

app.use(cors());
app.use(express.json({ limit: "1mb" }));

const hasConfiguredValue = (value, placeholder) =>
  Boolean(value && value.trim() && value.trim() !== placeholder);

const hasGeminiApiKey = hasConfiguredValue(
  process.env.GEMINI_API_KEY,
  PLACEHOLDER_API_KEY
);

const genAI = hasGeminiApiKey
  ? new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  : null;

const conversionSchema = {
  type: SchemaType.OBJECT,
  required: ["convertedCode", "summary", "keyChanges", "warnings"],
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
      items: {
        type: SchemaType.STRING,
      },
    },
    warnings: {
      type: SchemaType.ARRAY,
      description: "Caveats, unsupported features, or manual review notes.",
      items: {
        type: SchemaType.STRING,
      },
    },
  },
};

const sanitizeString = (value) =>
  typeof value === "string" ? value.trim() : "";

const modelCandidates = [...new Set([MODEL_NAME, DEFAULT_MODEL_NAME])].filter(
  Boolean
);

const normalizeStringList = (value) =>
  Array.isArray(value)
    ? value
        .map((item) => sanitizeString(String(item || "")))
        .filter(Boolean)
        .slice(0, 6)
    : [];

const extractJsonObject = (text) => {
  const trimmed = sanitizeString(text);
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    throw new Error("Gemini returned an unexpected response format.");
  }

  return JSON.parse(jsonMatch[0]);
};

const buildPrompt = ({
  sourceLanguage,
  targetLanguage,
  sourceCode,
  instructions,
}) => `You are an expert software engineer who specializes in translating code between programming languages.

Convert the provided ${sourceLanguage} code into idiomatic ${targetLanguage}.

Requirements:
- Preserve the original behavior as closely as possible.
- Keep the converted code complete and runnable when feasible.
- Keep comments only when they help explain an important decision.
- Do not wrap the code in markdown fences.
- If something cannot be translated perfectly, explain it in warnings.
- Return valid JSON only.

User instructions:
${instructions || "No extra instructions."}

Source code:
${sourceCode}`;

const parseGeminiError = (error) => {
  const message = error?.message || "Gemini request failed.";
  const normalized = message.toLowerCase();

  if (
    normalized.includes("quota exceeded") ||
    normalized.includes("too many requests")
  ) {
    return {
      status: 429,
      error:
        "Gemini quota has been exceeded for this API key or project. Add billing, wait for the quota window to reset, or use a different key.",
    };
  }

  if (
    normalized.includes("api key not valid") ||
    normalized.includes("api_key_invalid")
  ) {
    return {
      status: 401,
      error: "Gemini API key is invalid. Update backend/.env with a valid key.",
    };
  }

  if (
    normalized.includes("model") &&
    (normalized.includes("not found") || normalized.includes("not supported"))
  ) {
    return {
      status: 503,
      error: `The Gemini model ${MODEL_NAME} is not available for this key or project.`,
    };
  }

  return {
    status: 502,
    error: "Gemini could not complete the conversion request.",
  };
};

const isUnavailableModelError = (error) => {
  const message = (error?.message || "").toLowerCase();

  return (
    message.includes("not found") || message.includes("not supported")
  );
};

const validateConversionRequest = (body) => {
  const sourceLanguage = sanitizeString(body?.sourceLanguage);
  const targetLanguage = sanitizeString(body?.targetLanguage);
  const sourceCode = typeof body?.sourceCode === "string" ? body.sourceCode : "";
  const instructions = sanitizeString(body?.instructions);

  if (!sourceLanguage || !targetLanguage) {
    return { error: "Choose both a source language and a target language." };
  }

  if (sourceLanguage.toLowerCase() === targetLanguage.toLowerCase()) {
    return {
      error: "Choose two different languages so there is something to convert.",
    };
  }

  if (!sanitizeString(sourceCode)) {
    return { error: "Paste some source code before starting the conversion." };
  }

  if (sourceCode.length > MAX_CODE_LENGTH) {
    return {
      error: `Source code is too large. Keep it under ${MAX_CODE_LENGTH} characters for now.`,
    };
  }

  return {
    sourceLanguage,
    targetLanguage,
    sourceCode,
    instructions,
  };
};

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    service: "appixo-code-converter",
    model: MODEL_NAME,
    fallbackModels: modelCandidates.slice(1),
    geminiConfigured: hasGeminiApiKey,
  });
});

app.post("/api/convert", async (req, res) => {
  if (!genAI) {
    return res.status(503).json({
      error:
        "Gemini is not configured. Add a valid GEMINI_API_KEY to backend/.env.",
    });
  }

  const validated = validateConversionRequest(req.body);

  if (validated.error) {
    return res.status(400).json({ error: validated.error });
  }

  try {
    let lastError;

    for (const modelName of modelCandidates) {
      try {
        const model = genAI.getGenerativeModel({
          model: modelName,
          generationConfig: {
            temperature: 0.2,
            topP: 0.9,
            maxOutputTokens: 4096,
            responseMimeType: "application/json",
            responseSchema: conversionSchema,
          },
        });

        const result = await model.generateContent(
          buildPrompt({
            sourceLanguage: validated.sourceLanguage,
            targetLanguage: validated.targetLanguage,
            sourceCode: validated.sourceCode,
            instructions: validated.instructions,
          })
        );

        const payload = extractJsonObject(result.response.text());
        const convertedCode = sanitizeString(payload.convertedCode);

        if (!convertedCode) {
          throw new Error("Gemini returned an empty convertedCode field.");
        }

        return res.status(200).json({
          sourceLanguage: validated.sourceLanguage,
          targetLanguage: validated.targetLanguage,
          convertedCode,
          summary:
            sanitizeString(payload.summary) ||
            `Converted ${validated.sourceLanguage} into ${validated.targetLanguage}.`,
          keyChanges: normalizeStringList(payload.keyChanges),
          warnings: normalizeStringList(payload.warnings),
          model: modelName,
        });
      } catch (error) {
        lastError = error;

        if (isUnavailableModelError(error) && modelName !== DEFAULT_MODEL_NAME) {
          continue;
        }

        throw error;
      }
    }

    throw lastError || new Error("No Gemini model could complete the request.");
  } catch (error) {
    const formattedError = parseGeminiError(error);
    console.error("Conversion error:", error?.message || error);
    return res.status(formattedError.status).json({
      error: formattedError.error,
    });
  }
});

app.use((err, req, res, next) => {
  console.error("Unhandled server error:", err);
  res.status(500).json({
    error: "Unexpected server error.",
  });
});

const server = app.listen(PORT, () => {
  console.log(`Appixo backend is running on http://localhost:${PORT}`);

  if (!hasGeminiApiKey) {
    console.warn(
      "Gemini is not configured yet. Add GEMINI_API_KEY to backend/.env."
    );
  }
});

server.on("error", (error) => {
  if (error?.code === "EADDRINUSE") {
    console.error(
      `Port ${PORT} is already in use. Appixo may already be running in another terminal, or you can change PORT in backend/.env.`
    );
  } else {
    console.error("Failed to start the Appixo backend:", error);
  }

  process.exit(1);
});
