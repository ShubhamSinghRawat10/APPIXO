import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import AceEditor from "react-ace";
import {
  FiAlertCircle,
  FiCheckCircle,
  FiChevronRight,
  FiCode,
  FiColumns,
  FiCopy,
  FiCpu,
  FiFileText,
  FiPlay,
  FiRepeat,
  FiTerminal,
  FiTrash2,
  FiUploadCloud,
  FiZap,
} from "react-icons/fi";
import "./App.css";
import LiquidChrome from "./components/LiquidChrome";
import {
  acceptedSourceFileExtensions,
  defaultSourceLanguage,
  defaultTargetLanguage,
  detectSourceLanguage,
  exampleCodeByLanguage,
  getAceMode,
  getLanguageFromFileName,
  getLanguageOption,
  languageOptions,
} from "./data/languages";
import "ace-builds/src-noconflict/mode-c_cpp";
import "ace-builds/src-noconflict/mode-csharp";
import "ace-builds/src-noconflict/mode-golang";
import "ace-builds/src-noconflict/mode-java";
import "ace-builds/src-noconflict/mode-javascript";
import "ace-builds/src-noconflict/mode-php";
import "ace-builds/src-noconflict/mode-python";
import "ace-builds/src-noconflict/mode-rust";
import "ace-builds/src-noconflict/mode-typescript";
import "ace-builds/src-noconflict/theme-tomorrow_night_eighties";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "";
const MAX_SOURCE_FILE_SIZE = 2 * 1024 * 1024;
const MAX_EXACT_DIFF_CELLS = 360000;
const DEFAULT_CONVERSION_INSTRUCTIONS =
  "Prefer clean, idiomatic output and preserve the same behavior.";

const initialSourceCode = exampleCodeByLanguage[defaultSourceLanguage];

function AppixoLogo() {
  return (
    <svg
      className="appixo-logo"
      viewBox="0 0 64 64"
      role="img"
      aria-label="Appixo logo"
    >
      <defs>
        <linearGradient id="appixoLogoShell" x1="12" y1="8" x2="54" y2="58">
          <stop offset="0" stopColor="#203247" />
          <stop offset="1" stopColor="#101923" />
        </linearGradient>
        <linearGradient id="appixoLogoSignal" x1="12" y1="16" x2="52" y2="48">
          <stop offset="0" stopColor="#4a90e2" />
          <stop offset="1" stopColor="#35b6ab" />
        </linearGradient>
      </defs>
      <rect
        x="3"
        y="3"
        width="58"
        height="58"
        rx="14"
        fill="url(#appixoLogoShell)"
      />
      <circle cx="32" cy="32" r="22" fill="#4a90e2" opacity="0.12" />
      <path
        d="M23 18 13 28l10 10"
        fill="none"
        stroke="url(#appixoLogoSignal)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.5"
      />
      <path
        d="M41 46 51 36 41 26"
        fill="none"
        stroke="#f5a623"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="5.5"
      />
      <path
        d="M22 32h18"
        fill="none"
        stroke="#eef6fb"
        strokeLinecap="round"
        strokeWidth="4.5"
      />
      <path d="M42 24 52 32 42 40Z" fill="#eef6fb" />
      <path
        d="M46 12 48.4 18.1 54 20.5 48.4 22.9 46 29 43.6 22.9 38 20.5 43.6 18.1Z"
        fill="#f5a623"
      />
      <path
        d="M12 49h11M16 53h15"
        fill="none"
        stroke="#4a90e2"
        strokeLinecap="round"
        strokeWidth="3"
        opacity="0.72"
      />
    </svg>
  );
}

const splitCodeLines = (code) => {
  if (!code) {
    return [];
  }

  return code.replace(/\r\n/g, "\n").split("\n");
};

const getDiffType = (leftLine, rightLine) => {
  if (leftLine === rightLine) {
    return "equal";
  }

  if (leftLine === undefined) {
    return "added";
  }

  if (rightLine === undefined) {
    return "removed";
  }

  return "modified";
};

const buildPositionBasedDiff = (leftLines, rightLines) => {
  const rowCount = Math.max(leftLines.length, rightLines.length);

  return Array.from({ length: rowCount }, (_, index) => {
    const leftLine = leftLines[index];
    const rightLine = rightLines[index];

    return {
      left: leftLine ?? "",
      right: rightLine ?? "",
      type: getDiffType(leftLine, rightLine),
    };
  });
};

const buildExactLineDiff = (leftLines, rightLines) => {
  const lcs = Array.from({ length: leftLines.length + 1 }, () =>
    Array(rightLines.length + 1).fill(0)
  );

  for (let leftIndex = leftLines.length - 1; leftIndex >= 0; leftIndex -= 1) {
    for (
      let rightIndex = rightLines.length - 1;
      rightIndex >= 0;
      rightIndex -= 1
    ) {
      lcs[leftIndex][rightIndex] =
        leftLines[leftIndex] === rightLines[rightIndex]
          ? lcs[leftIndex + 1][rightIndex + 1] + 1
          : Math.max(lcs[leftIndex + 1][rightIndex], lcs[leftIndex][rightIndex + 1]);
    }
  }

  const operations = [];
  let leftIndex = 0;
  let rightIndex = 0;

  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    if (
      leftIndex < leftLines.length &&
      rightIndex < rightLines.length &&
      leftLines[leftIndex] === rightLines[rightIndex]
    ) {
      operations.push({
        type: "equal",
        left: leftLines[leftIndex],
        right: rightLines[rightIndex],
      });
      leftIndex += 1;
      rightIndex += 1;
      continue;
    }

    if (
      rightIndex >= rightLines.length ||
      (leftIndex < leftLines.length &&
        lcs[leftIndex + 1][rightIndex] >= lcs[leftIndex][rightIndex + 1])
    ) {
      operations.push({ type: "removed", left: leftLines[leftIndex] });
      leftIndex += 1;
    } else {
      operations.push({ type: "added", right: rightLines[rightIndex] });
      rightIndex += 1;
    }
  }

  const rows = [];

  for (let index = 0; index < operations.length; index += 1) {
    if (operations[index].type === "equal") {
      rows.push(operations[index]);
      continue;
    }

    const removedLines = [];
    const addedLines = [];

    while (index < operations.length && operations[index].type !== "equal") {
      if (operations[index].type === "removed") {
        removedLines.push(operations[index].left);
      } else {
        addedLines.push(operations[index].right);
      }

      index += 1;
    }

    const changedRowCount = Math.max(removedLines.length, addedLines.length);

    for (let rowIndex = 0; rowIndex < changedRowCount; rowIndex += 1) {
      const left = removedLines[rowIndex];
      const right = addedLines[rowIndex];

      rows.push({
        left: left ?? "",
        right: right ?? "",
        type: getDiffType(left, right),
      });
    }

    index -= 1;
  }

  return rows;
};

const createFullLineMarkers = (rows, side) =>
  rows
    .map((row, index) => {
      if (row.type === "equal") {
        return null;
      }

      const isSpacer =
        (side === "left" && row.type === "added") ||
        (side === "right" && row.type === "removed");

      return {
        startRow: index,
        startCol: 0,
        endRow: index,
        endCol: 1,
        className: isSpacer
          ? "diff-marker-spacer"
          : `diff-marker-${row.type}`,
        type: "fullLine",
      };
    })
    .filter(Boolean);

const buildLineDiff = (sourceCode, convertedCode) => {
  const leftLines = splitCodeLines(sourceCode);
  const rightLines = splitCodeLines(convertedCode);
  const useExactDiff =
    leftLines.length * rightLines.length <= MAX_EXACT_DIFF_CELLS;
  const rows = useExactDiff
    ? buildExactLineDiff(leftLines, rightLines)
    : buildPositionBasedDiff(leftLines, rightLines);
  const stats = rows.reduce(
    (totals, row) => {
      totals[row.type] += 1;
      return totals;
    },
    { equal: 0, modified: 0, added: 0, removed: 0 }
  );

  return {
    leftCode: rows.map((row) => row.left).join("\n"),
    rightCode: rows.map((row) => row.right).join("\n"),
    leftMarkers: createFullLineMarkers(rows, "left"),
    rightMarkers: createFullLineMarkers(rows, "right"),
    isExact: useExactDiff,
    stats,
  };
};

function App() {
  const fileInputRef = useRef(null);
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [sourceCode, setSourceCode] = useState(initialSourceCode);
  const [convertedCode, setConvertedCode] = useState("");
  const [summary, setSummary] = useState("");
  const [keyChanges, setKeyChanges] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [qualityScore, setQualityScore] = useState(null);
  const [validationChecks, setValidationChecks] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [fileUploadMessage, setFileUploadMessage] = useState("");
  const [sourceFileName, setSourceFileName] = useState("");
  const [isSourceAutoDetecting, setIsSourceAutoDetecting] = useState(true);
  const [copyMessage, setCopyMessage] = useState("");
  const [lastRunLabel, setLastRunLabel] = useState("");
  const [activeResultView, setActiveResultView] = useState("output");
  const [backendStatus, setBackendStatus] = useState("checking");
  const [backendModel, setBackendModel] = useState("");
  const [selectedProvider, setSelectedProvider] = useState("auto");
  const [resultProvider, setResultProvider] = useState("");
  const [resultModel, setResultModel] = useState("");
  const [grokAvailable, setGrokAvailable] = useState(false);
  const [responseTime, setResponseTime] = useState("");
  const [wasCached, setWasCached] = useState(false);

  useEffect(() => {
    let ignore = false;

    const checkHealth = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/api/health`);

        if (!ignore) {
          setBackendStatus("ready");
          setBackendModel(response.data?.gemini?.model || response.data?.model || "");
          setGrokAvailable(response.data?.grok?.configured || false);
        }
      } catch (error) {
        if (!ignore) {
          setBackendStatus("offline");
          setErrorMessage(
            "Backend is unreachable right now. Start the server on port 8080 to use conversions."
          );
        }
      }
    };

    checkHealth();

    return () => {
      ignore = true;
    };
  }, []);

  const sourceLabel = getLanguageOption(sourceLanguage)?.label || sourceLanguage;
  const targetLabel = getLanguageOption(targetLanguage)?.label || targetLanguage;
  const hasConvertedCode = convertedCode.trim().length > 0;
  const sourceLineCount = splitCodeLines(sourceCode).length || 1;
  const outputLineCount = hasConvertedCode ? splitCodeLines(convertedCode).length : 0;
  const sourceDetection = useMemo(
    () => detectSourceLanguage(sourceCode, sourceFileName),
    [sourceCode, sourceFileName]
  );
  const lineDiff = useMemo(
    () => buildLineDiff(sourceCode, convertedCode),
    [sourceCode, convertedCode]
  );
  const changedLineCount =
    lineDiff.stats.modified + lineDiff.stats.added + lineDiff.stats.removed;
  const hasReviewDetails =
    Boolean(summary) ||
    keyChanges.length > 0 ||
    warnings.length > 0 ||
    validationChecks.length > 0 ||
    qualityScore !== null;
  const resultTabs = [
    { id: "output", label: "Output", icon: FiTerminal },
    { id: "diff", label: "Diff", icon: FiColumns },
    { id: "review", label: "Review", icon: FiFileText },
  ];
  const detectionLabel =
    sourceDetection.language && sourceDetection.confidence
      ? `${getLanguageOption(sourceDetection.language)?.label || sourceDetection.language} ${sourceDetection.confidence}%`
      : "Detecting";
  const candidateSummary = sourceDetection.candidates
    .filter((candidate) => candidate.language !== sourceDetection.language)
    .slice(0, 2)
    .map((candidate) => `${candidate.label} ${candidate.confidence}%`)
    .join(" / ");

  useEffect(() => {
    if (
      isSourceAutoDetecting &&
      sourceDetection.language &&
      sourceDetection.confidence >= 55 &&
      sourceDetection.language !== sourceLanguage
    ) {
      setSourceLanguage(sourceDetection.language);
    }
  }, [isSourceAutoDetecting, sourceDetection, sourceLanguage]);

  const resetResult = () => {
    setConvertedCode("");
    setSummary("");
    setKeyChanges([]);
    setWarnings([]);
    setQualityScore(null);
    setValidationChecks([]);
    setErrorMessage("");
    setCopyMessage("");
    setLastRunLabel("");
    setActiveResultView("output");
    setResultProvider("");
    setResultModel("");
  };

  const handleLoadExample = () => {
    setSourceCode(exampleCodeByLanguage[sourceLanguage] || "");
    setFileUploadMessage("");
    setSourceFileName("");
    resetResult();
  };

  const handleSwapLanguages = () => {
    setIsSourceAutoDetecting(false);
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);

    if (convertedCode.trim()) {
      setSourceCode(convertedCode);
    }

    resetResult();
  };

  const handleCopyResult = async () => {
    if (!convertedCode.trim()) {
      return;
    }

    try {
      await navigator.clipboard.writeText(convertedCode);
      setCopyMessage("Copied to clipboard.");
      window.setTimeout(() => setCopyMessage(""), 2000);
    } catch (error) {
      setCopyMessage("Clipboard access is unavailable.");
      window.setTimeout(() => setCopyMessage(""), 2500);
    }
  };

  const handleClearWorkspace = () => {
    setSourceCode("");
    setFileUploadMessage("");
    setSourceFileName("");
    setIsSourceAutoDetecting(true);
    resetResult();
  };

  const handleSourceLanguageChange = (event) => {
    setIsSourceAutoDetecting(false);
    setSourceLanguage(event.target.value);
  };

  const handleSourceCodeChange = (newCode) => {
    setSourceCode(newCode);
    setSourceFileName("");
  };

  const enableAutoDetection = () => {
    setIsSourceAutoDetecting(true);

    if (sourceDetection.language && sourceDetection.confidence >= 40) {
      setSourceLanguage(sourceDetection.language);
    }
  };

  const loadSourceFile = async (file) => {
    if (!file) {
      return;
    }

    const fileExtensionLanguage = getLanguageFromFileName(file.name);

    if (!fileExtensionLanguage) {
      setFileUploadMessage(`Unsupported file: ${file.name}`);
      setErrorMessage(
        "Upload a supported source file such as .c, .cpp, .js, .ts, .py, .java, .go, .rs, .cs, or .php."
      );
      return;
    }

    if (file.size > MAX_SOURCE_FILE_SIZE) {
      setFileUploadMessage(`File is too large: ${file.name}`);
      setErrorMessage("Choose a source file under 2 MB.");
      return;
    }

    try {
      const fileContents = await file.text();
      const fileDetection = detectSourceLanguage(fileContents, file.name);
      const detectedLanguage = fileDetection.language || fileExtensionLanguage;

      setSourceLanguage(detectedLanguage);
      setSourceCode(fileContents);
      setSourceFileName(file.name);
      setIsSourceAutoDetecting(true);
      resetResult();
      setFileUploadMessage(
        `${file.name} loaded as ${
          getLanguageOption(detectedLanguage)?.label || detectedLanguage
        } (${fileDetection.confidence || 72}% confidence).`
      );
    } catch (error) {
      setFileUploadMessage(`Could not read: ${file.name}`);
      setErrorMessage(error?.message || "The source file could not be read.");
    }
  };

  const handleFileInputChange = (event) => {
    loadSourceFile(event.target.files?.[0]);
    event.target.value = "";
  };

  const handleFileDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    setIsDraggingFile(true);
  };

  const handleFileDragLeave = (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setIsDraggingFile(false);
    }
  };

  const handleFileDrop = (event) => {
    event.preventDefault();
    setIsDraggingFile(false);
    loadSourceFile(event.dataTransfer.files?.[0]);
  };

  const handleConvert = async () => {
    if (!sourceCode.trim()) {
      setErrorMessage("Paste some source code before you start.");
      return;
    }

    if (sourceLanguage === targetLanguage) {
      setErrorMessage("Choose different source and target languages.");
      return;
    }

    setIsConverting(true);
    setErrorMessage("");
    setCopyMessage("");

    try {
      const response = await axios.post(`${API_BASE_URL}/api/convert`, {
        sourceLanguage,
        targetLanguage,
        sourceCode,
        instructions: DEFAULT_CONVERSION_INSTRUCTIONS,
        provider: selectedProvider,
      });

      setConvertedCode(response.data?.convertedCode || "");
      setSummary(response.data?.summary || "");
      setKeyChanges(response.data?.keyChanges || []);
      setWarnings(response.data?.warnings || []);
      setQualityScore(response.data?.qualityScore ?? null);
      setValidationChecks(response.data?.validationChecks || []);
      setResultProvider(response.data?.provider || "");
      setResultModel(response.data?.model || "");
      setResponseTime(response.data?.responseTime || "");
      setWasCached(response.data?.cached || false);
      setActiveResultView("output");
      setLastRunLabel(
        new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })
      );
    } catch (error) {
      setConvertedCode("");
      setSummary("");
      setKeyChanges([]);
      setWarnings([]);
      setQualityScore(null);
      setValidationChecks([]);
      setErrorMessage(
        error?.response?.data?.error ||
          error?.message ||
          "Conversion failed. Please try again."
      );
    } finally {
      setIsConverting(false);
    }
  };

  return (
    <div className="app-shell">
      <div className="app-background">
        <LiquidChrome
          className="app-background-liquid"
          baseColor={[0.02, 0.08, 0.12]}
          amplitude={0.22}
          frequencyX={2.4}
          frequencyY={1.8}
          speed={0.28}
          interactive={false}
        />
      </div>

      <main className="compiler-shell">
        <header className="workbench-topbar">
          <div className="brand-lockup">
            <span className="brand-mark">
              <AppixoLogo />
            </span>
            <div>
              <h1>APPIXO</h1>
              <p>AI code conversion workbench</p>
            </div>
          </div>

          <div className={`status-pill status-${backendStatus}`}>
            {backendStatus === "ready" ? (
              <FiCheckCircle aria-hidden="true" />
            ) : (
              <FiAlertCircle aria-hidden="true" />
            )}
            <span>
              {backendStatus === "ready"
                ? `${backendModel || "Gemini"} ${grokAvailable ? "· Grok ✓" : ""}`.trim()
                : backendStatus === "checking"
                ? "Checking backend"
                : "Backend offline"}
            </span>
          </div>
        </header>

        <section className="command-bar" aria-label="Conversion controls">
          <div className="language-flow">
            <label className="select-field">
              <span>From</span>
              <select
                value={sourceLanguage}
                onChange={handleSourceLanguageChange}
                disabled={isConverting}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>

            <button
              className={`detect-button ${
                isSourceAutoDetecting ? "detect-button-active" : ""
              }`}
              type="button"
              onClick={enableAutoDetection}
              title="Auto-detect source language"
            >
              <FiCheckCircle aria-hidden="true" />
              <span>{isSourceAutoDetecting ? detectionLabel : "Manual"}</span>
            </button>

            <button
              className="icon-button"
              type="button"
              onClick={handleSwapLanguages}
              disabled={isConverting}
              title="Swap languages"
            >
              <FiRepeat aria-hidden="true" />
            </button>

            <span className="flow-arrow" aria-hidden="true">
              <FiChevronRight />
            </span>

            <label className="select-field">
              <span>To</span>
              <select
                value={targetLanguage}
                onChange={(event) => setTargetLanguage(event.target.value)}
                disabled={isConverting}
              >
                {languageOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div
            className={`upload-strip ${
              isDraggingFile ? "upload-strip-active" : ""
            }`}
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
          >
            <FiUploadCloud aria-hidden="true" />
            <span>{fileUploadMessage || "Drop a source file here"}</span>
            <button
              className="ghost-button compact-button"
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isConverting}
            >
              Browse
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="visually-hidden"
              accept={acceptedSourceFileExtensions}
              onChange={handleFileInputChange}
              disabled={isConverting}
            />
          </div>

          <div className="command-actions">
            <div className="provider-toggle">
              <span className="provider-toggle-label">
                <FiCpu aria-hidden="true" />
                Engine
              </span>
              {[
                { id: "auto", label: "Auto" },
                { id: "gemini", label: "Gemini" },
                { id: "grok", label: "Grok" },
              ].map((opt) => (
                <button
                  key={opt.id}
                  className={`provider-option ${
                    selectedProvider === opt.id ? "provider-option-active" : ""
                  }`}
                  type="button"
                  onClick={() => setSelectedProvider(opt.id)}
                  disabled={isConverting}
                  title={
                    opt.id === "auto"
                      ? "Gemini first, Grok fallback"
                      : opt.id === "gemini"
                      ? "Google Gemini cloud API"
                      : "xAI Grok cloud API"
                  }
                >
                  <span className={`provider-dot provider-dot-${opt.id}`} />
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              className="ghost-button"
              type="button"
              onClick={handleLoadExample}
              disabled={isConverting}
            >
              <FiCode aria-hidden="true" />
              <span>Example</span>
            </button>
            <button
              className="icon-button"
              type="button"
              onClick={handleClearWorkspace}
              disabled={isConverting}
              title="Clear workspace"
            >
              <FiTrash2 aria-hidden="true" />
            </button>
            <button
              className="run-button"
              type="button"
              onClick={handleConvert}
              disabled={isConverting}
            >
              <FiPlay aria-hidden="true" />
              <span>{isConverting ? "Converting" : `Convert to ${targetLabel}`}</span>
            </button>
          </div>
        </section>

        {errorMessage ? (
          <section className="message-banner error-banner">
            <FiAlertCircle aria-hidden="true" />
            <div>
              <strong>Conversion blocked</strong>
              <p>{errorMessage}</p>
            </div>
          </section>
        ) : null}

        <section className="workspace-grid" aria-label="Code workbench">
          <article
            className={`workspace-pane source-pane ${
              isDraggingFile ? "pane-drop-active" : ""
            }`}
            onDragOver={handleFileDragOver}
            onDragLeave={handleFileDragLeave}
            onDrop={handleFileDrop}
          >
            <div className="pane-header">
              <div>
                <p className="pane-kicker">Input</p>
                <h2>{sourceLabel} source</h2>
              </div>
              <div className="pane-meta">
                <span>{sourceLineCount} lines</span>
                <span>Editable</span>
              </div>
            </div>

            <div className="editor-body">
              <AceEditor
                mode={getAceMode(sourceLanguage)}
                theme="tomorrow_night_eighties"
                name="source-editor"
                width="100%"
                height="100%"
                fontSize={15}
                value={sourceCode}
                onChange={handleSourceCodeChange}
                setOptions={{
                  useWorker: false,
                  showLineNumbers: true,
                  tabSize: 2,
                }}
              />
            </div>

            <div className="pane-statusbar">
              <span>
                {isSourceAutoDetecting
                  ? `Auto-detect: ${detectionLabel}`
                  : "Source language set manually"}
              </span>
              <span>{candidateSummary || `${acceptedSourceFileExtensions.split(",").length} extensions`}</span>
            </div>
          </article>

          <article className="workspace-pane result-pane">
            <div className="pane-header">
              <div>
                <p className="pane-kicker">Result</p>
                <h2>{targetLabel} workspace</h2>
              </div>
              <button
                className="ghost-button compact-button"
                type="button"
                onClick={handleCopyResult}
                disabled={!hasConvertedCode}
              >
                <FiCopy aria-hidden="true" />
                <span>Copy</span>
              </button>
            </div>

            <div className="result-tabs" role="tablist" aria-label="Result views">
              {resultTabs.map((tab) => {
                const Icon = tab.icon;

                return (
                  <button
                    key={tab.id}
                    className={`result-tab ${
                      activeResultView === tab.id ? "result-tab-active" : ""
                    }`}
                    type="button"
                    role="tab"
                    aria-selected={activeResultView === tab.id}
                    onClick={() => setActiveResultView(tab.id)}
                  >
                    <Icon aria-hidden="true" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <div className="result-body">
              {activeResultView === "output" ? (
                hasConvertedCode ? (
                  <AceEditor
                    mode={getAceMode(targetLanguage)}
                    theme="tomorrow_night_eighties"
                    name="output-editor"
                    width="100%"
                    height="100%"
                    fontSize={15}
                    value={convertedCode}
                    readOnly
                    setOptions={{
                      useWorker: false,
                      showLineNumbers: true,
                      tabSize: 2,
                    }}
                  />
                ) : (
                  <div className="empty-result">
                    <FiTerminal aria-hidden="true" />
                    <h3>Converted code will appear here</h3>
                    <p>Choose a language pair, load code, then run the conversion.</p>
                  </div>
                )
              ) : null}

              {activeResultView === "diff" ? (
                hasConvertedCode ? (
                  <div className="diff-compact-view">
                    <div className="diff-summary-bar">
                      <span>{changedLineCount} highlighted changes</span>
                      <span>
                        {lineDiff.stats.modified} changed | {lineDiff.stats.added} added |{" "}
                        {lineDiff.stats.removed} removed
                      </span>
                    </div>
                    <div className="diff-compact-grid">
                      <div className="diff-mini-pane">
                        <div className="diff-pane-title">
                          <span>{sourceLabel}</span>
                          <span>Input</span>
                        </div>
                        <AceEditor
                          mode={getAceMode(sourceLanguage)}
                          theme="tomorrow_night_eighties"
                          name="source-diff-editor"
                          width="100%"
                          height="100%"
                          fontSize={14}
                          value={lineDiff.leftCode}
                          readOnly
                          markers={lineDiff.leftMarkers}
                          setOptions={{
                            useWorker: false,
                            showLineNumbers: true,
                            tabSize: 2,
                            highlightActiveLine: false,
                          }}
                        />
                      </div>

                      <div className="diff-mini-pane">
                        <div className="diff-pane-title">
                          <span>{targetLabel}</span>
                          <span>Output</span>
                        </div>
                        <AceEditor
                          mode={getAceMode(targetLanguage)}
                          theme="tomorrow_night_eighties"
                          name="target-diff-editor"
                          width="100%"
                          height="100%"
                          fontSize={14}
                          value={lineDiff.rightCode}
                          readOnly
                          markers={lineDiff.rightMarkers}
                          setOptions={{
                            useWorker: false,
                            showLineNumbers: true,
                            tabSize: 2,
                            highlightActiveLine: false,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="empty-result">
                    <FiColumns aria-hidden="true" />
                    <h3>No diff yet</h3>
                    <p>Run a conversion to compare input and output line by line.</p>
                  </div>
                )
              ) : null}

              {activeResultView === "review" ? (
                hasReviewDetails ? (
                  <div className="review-board">
                    <section className="review-section quality-section">
                      <p className="pane-kicker">Accuracy target</p>
                      <h3>
                        {qualityScore !== null
                          ? `${qualityScore}% self-check score`
                          : "Verification pending"}
                      </h3>
                      <p>
                        {qualityScore !== null && qualityScore >= 97
                          ? "The model reported that the conversion passed the high-accuracy review target. Still run tests for production use."
                          : "Appixo targets high semantic accuracy, but generated code should still be compiled and tested."}
                      </p>
                    </section>

                    <section className="review-section">
                      <p className="pane-kicker">Summary</p>
                      <h3>What changed</h3>
                      <p>{summary}</p>
                    </section>

                    <section className="review-section">
                      <p className="pane-kicker">Key changes</p>
                      <h3>Implementation shifts</h3>
                      {keyChanges.length ? (
                        <ul>
                          {keyChanges.map((change) => (
                            <li key={change}>{change}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No major implementation shifts were reported.</p>
                      )}
                    </section>

                    <section className="review-section">
                      <p className="pane-kicker">Validation</p>
                      <h3>Self-checks</h3>
                      {validationChecks.length ? (
                        <ul>
                          {validationChecks.map((check) => (
                            <li key={check}>{check}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No validation checklist was returned.</p>
                      )}
                    </section>

                    <section className="review-section">
                      <p className="pane-kicker">Warnings</p>
                      <h3>Manual review</h3>
                      {warnings.length ? (
                        <ul>
                          {warnings.map((warning) => (
                            <li key={warning}>{warning}</li>
                          ))}
                        </ul>
                      ) : (
                        <p>No warnings were returned for this conversion.</p>
                      )}
                    </section>
                  </div>
                ) : (
                  <div className="empty-result">
                    <FiFileText aria-hidden="true" />
                    <h3>Review notes will appear here</h3>
                    <p>After conversion, Appixo summarizes the important changes.</p>
                  </div>
                )
              ) : null}
            </div>

            <div className="pane-statusbar">
              <span>
                {copyMessage || (lastRunLabel ? `Last run ${lastRunLabel}` : "No conversion yet")}
                {resultProvider ? (
                  <span className={`provider-badge provider-badge-${resultProvider}`} style={{ marginLeft: 8 }}>
                    <FiZap style={{ width: 10, height: 10 }} />
                    {wasCached ? "⚡ Cached" : resultProvider === "grok" ? `Grok · ${resultModel}` : `Gemini · ${resultModel}`}
                    {responseTime ? ` · ${responseTime}` : ""}
                  </span>
                ) : null}
              </span>
              <span>
                {qualityScore !== null
                  ? `${qualityScore}% quality`
                  : outputLineCount
                  ? `${outputLineCount} output lines`
                  : "Ready"}
              </span>
            </div>
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
