import { useEffect, useState } from "react";
import axios from "axios";
import AceEditor from "react-ace";
import "./App.css";
import LiquidChrome from "./components/LiquidChrome";
import {
  defaultSourceLanguage,
  defaultTargetLanguage,
  exampleCodeByLanguage,
  getAceMode,
  getLanguageOption,
  instructionPresets,
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

const initialSourceCode = exampleCodeByLanguage[defaultSourceLanguage];

function App() {
  const [sourceLanguage, setSourceLanguage] = useState(defaultSourceLanguage);
  const [targetLanguage, setTargetLanguage] = useState(defaultTargetLanguage);
  const [sourceCode, setSourceCode] = useState(initialSourceCode);
  const [instructions, setInstructions] = useState(
    "Prefer clean, idiomatic output and preserve the same behavior."
  );
  const [convertedCode, setConvertedCode] = useState("");
  const [summary, setSummary] = useState("");
  const [keyChanges, setKeyChanges] = useState([]);
  const [warnings, setWarnings] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [isConverting, setIsConverting] = useState(false);
  const [copyMessage, setCopyMessage] = useState("");
  const [lastRunLabel, setLastRunLabel] = useState("");

  useEffect(() => {
    let ignore = false;

    const checkHealth = async () => {
      try {
        await axios.get(`${API_BASE_URL}/api/health`);
      } catch (error) {
        if (!ignore) {
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

  const resetResult = () => {
    setConvertedCode("");
    setSummary("");
    setKeyChanges([]);
    setWarnings([]);
    setErrorMessage("");
    setCopyMessage("");
    setLastRunLabel("");
  };

  const handleLoadExample = () => {
    setSourceCode(exampleCodeByLanguage[sourceLanguage] || "");
    resetResult();
  };

  const handleSwapLanguages = () => {
    setSourceLanguage(targetLanguage);
    setTargetLanguage(sourceLanguage);

    if (convertedCode.trim()) {
      setSourceCode(convertedCode);
    }

    resetResult();
  };

  const handlePresetClick = (preset) => {
    setInstructions((currentValue) => {
      if (currentValue.includes(preset)) {
        return currentValue;
      }

      return currentValue ? `${currentValue} ${preset}` : preset;
    });
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
    setInstructions("");
    resetResult();
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
        instructions,
      });

      setConvertedCode(response.data?.convertedCode || "");
      setSummary(response.data?.summary || "");
      setKeyChanges(response.data?.keyChanges || []);
      setWarnings(response.data?.warnings || []);
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

      <main className="app-frame">
        <section className="hero-panel">
          <div className="hero-copy">
            {/* <p className="eyebrow">Appixo Rebuilt</p> */}
            <h1>APPIXO</h1>
            <p>Code language convertor</p>
          </div>
        </section>

        <section className="composer-grid">
          <article className="panel">
            <div className="panel-heading">
              <h2>Conversion setup</h2>
              <p>Choose your language pair and quick actions.</p>
            </div>

            <div className="field-grid">
              <label className="field">
                <span>Source language</span>
                <select
                  value={sourceLanguage}
                  onChange={(event) => setSourceLanguage(event.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="field">
                <span>Target language</span>
                <select
                  value={targetLanguage}
                  onChange={(event) => setTargetLanguage(event.target.value)}
                >
                  {languageOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="button-row">
              <button className="secondary-button" onClick={handleSwapLanguages}>
                Swap languages
              </button>
              <button className="secondary-button" onClick={handleLoadExample}>
                Load {sourceLabel} example
              </button>
              <button className="secondary-button" onClick={handleClearWorkspace}>
                Clear workspace
              </button>
            </div>
          </article>

          <article className="panel">
            <div className="panel-heading">
              <h2>Conversion guidance</h2>
              <p>Tell the model what tradeoffs or style to prefer.</p>
            </div>

            <textarea
              className="instruction-box"
              value={instructions}
              onChange={(event) => setInstructions(event.target.value)}
              placeholder="Example: Preserve function names and keep it beginner-friendly."
            />

            <div className="chip-row">
              {instructionPresets.map((preset) => (
                <button
                  key={preset}
                  className="chip-button"
                  onClick={() => handlePresetClick(preset)}
                >
                  {preset}
                </button>
              ))}
            </div>
          </article>
        </section>

        <section className="editor-grid">
          <article className="editor-card">
            <div className="editor-header">
              <div>
                <p className="editor-eyebrow">Input</p>
                <h2>{sourceLabel} source code</h2>
              </div>
              <button
                className="primary-button"
                onClick={handleConvert}
                disabled={isConverting}
              >
                {isConverting ? "Converting..." : `Convert to ${targetLabel}`}
              </button>
            </div>

            <AceEditor
              mode={getAceMode(sourceLanguage)}
              theme="tomorrow_night_eighties"
              name="source-editor"
              width="100%"
              height="460px"
              fontSize={16}
              value={sourceCode}
              onChange={setSourceCode}
              setOptions={{
                useWorker: false,
                showLineNumbers: true,
                tabSize: 2,
              }}
            />
          </article>

          <article className="editor-card">
            <div className="editor-header">
              <div>
                <p className="editor-eyebrow">Output</p>
                <h2>{targetLabel} converted code</h2>
              </div>
              <button
                className="secondary-button"
                onClick={handleCopyResult}
                disabled={!convertedCode.trim()}
              >
                Copy result
              </button>
            </div>

            <AceEditor
              mode={getAceMode(targetLanguage)}
              theme="tomorrow_night_eighties"
              name="output-editor"
              width="100%"
              height="460px"
              fontSize={16}
              value={convertedCode}
              readOnly
              setOptions={{
                useWorker: false,
                showLineNumbers: true,
                tabSize: 2,
              }}
            />

            <div className="editor-footer">
              <span>{copyMessage || "Use the result as a draft, then review and test it."}</span>
              <span>{lastRunLabel ? `Last conversion: ${lastRunLabel}` : "No conversion yet"}</span>
            </div>
          </article>
        </section>

        {errorMessage ? (
          <section className="message-banner error-banner">
            <strong>Conversion blocked</strong>
            <p>{errorMessage}</p>
          </section>
        ) : null}

        <section className="insight-grid">
          <article className="insight-card">
            <p className="insight-label">Summary</p>
            <h3>What changed</h3>
            <p>
              {summary ||
                "Run a conversion to see a short summary of the translated output."}
            </p>
          </article>

          <article className="insight-card">
            <p className="insight-label">Key changes</p>
            <h3>Important implementation shifts</h3>
            {keyChanges.length ? (
              <ul>
                {keyChanges.map((change) => (
                  <li key={change}>{change}</li>
                ))}
              </ul>
            ) : (
              <p>The backend will list the biggest structural or syntax changes here.</p>
            )}
          </article>

          <article className="insight-card">
            <p className="insight-label">Warnings</p>
            <h3>Review before shipping</h3>
            {warnings.length ? (
              <ul>
                {warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            ) : (
              <p>
                If the conversion has tradeoffs, unsupported features, or runtime caveats,
                they will show up here.
              </p>
            )}
          </article>
        </section>
      </main>
    </div>
  );
}

export default App;
