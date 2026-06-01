export const defaultSourceLanguage = "c";
export const defaultTargetLanguage = "cpp";

export const languageOptions = [
  { value: "c", label: "C", aceMode: "c_cpp" },
  { value: "cpp", label: "C++", aceMode: "c_cpp" },
  { value: "javascript", label: "JavaScript", aceMode: "javascript" },
  { value: "typescript", label: "TypeScript", aceMode: "typescript" },
  { value: "python", label: "Python", aceMode: "python" },
  { value: "rust", label: "Rust", aceMode: "rust" },
  { value: "csharp", label: "C#", aceMode: "csharp" },
];

export const fileExtensionLanguageMap = {
  ".c": "c",
  ".h": "c",
  ".cc": "cpp",
  ".cpp": "cpp",
  ".cxx": "cpp",
  ".hh": "cpp",
  ".hpp": "cpp",
  ".hxx": "cpp",
  ".js": "javascript",
  ".jsx": "javascript",
  ".cjs": "javascript",
  ".mjs": "javascript",
  ".ts": "typescript",
  ".tsx": "typescript",
  ".cts": "typescript",
  ".mts": "typescript",
  ".py": "python",
  ".rs": "rust",
  ".cs": "csharp",
};

export const acceptedSourceFileExtensions = Object.keys(
  fileExtensionLanguageMap
).join(",");

export const instructionPresets = [
  "Preserve variable names where possible.",
  "Prefer idiomatic target language syntax.",
  "Keep the same algorithmic complexity.",
  "Add lightweight comments only for tricky parts.",
];

export const exampleCodeByLanguage = {
  c: `#include <stdio.h>

int factorial(int number) {
  if (number <= 1) {
    return 1;
  }

  return number * factorial(number - 1);
}

int main() {
  int value = 5;
  printf("factorial(%d) = %d\\n", value, factorial(value));
  return 0;
}`,
  cpp: `#include <iostream>
#include <vector>

int sumEvenNumbers(const std::vector<int>& values) {
  int total = 0;

  for (int value : values) {
    if (value % 2 == 0) {
      total += value;
    }
  }

  return total;
}

int main() {
  std::vector<int> values{1, 2, 3, 4, 5, 6};
  std::cout << "Total: " << sumEvenNumbers(values) << std::endl;
  return 0;
}`,
  javascript: `function groupAdultsByCity(people) {
  return people
    .filter((person) => person.age >= 18)
    .reduce((groups, person) => {
      const city = person.city;
      groups[city] = groups[city] ?? [];
      groups[city].push(person.name);
      return groups;
    }, {});
}

console.log(
  groupAdultsByCity([
    { name: "Aarav", age: 22, city: "Pune" },
    { name: "Mia", age: 17, city: "Pune" },
    { name: "Noah", age: 29, city: "Delhi" },
  ])
);`,
  typescript: `type ApiResult<T> = {
  data: T;
  success: boolean;
};

function unwrapResult<T>(result: ApiResult<T>): T {
  if (!result.success) {
    throw new Error("Request failed");
  }

  return result.data;
}

const username = unwrapResult<string>({ data: "appixo", success: true });
console.log(username);`,
  python: `def fibonacci(limit):
    sequence = [0, 1]

    while sequence[-1] + sequence[-2] <= limit:
        sequence.append(sequence[-1] + sequence[-2])

    return sequence


print(fibonacci(34))`,
  rust: `fn reverse_words(text: &str) -> String {
    text
      .split_whitespace()
      .rev()
      .collect::<Vec<&str>>()
      .join(" ")
}

fn main() {
  println!("{}", reverse_words("convert code with confidence"));
}`,
  csharp: `using System;
using System.Linq;

class Program
{
    static int[] SquareAll(int[] numbers)
    {
        return numbers.Select(number => number * number).ToArray();
    }

    static void Main()
    {
        Console.WriteLine(string.Join(", ", SquareAll(new[] { 1, 2, 3, 4 })));
    }
}`,
};

export const getLanguageOption = (value) =>
  languageOptions.find((option) => option.value === value);

export const getAceMode = (value) =>
  getLanguageOption(value)?.aceMode || "text";

export const languageFileExtension = {
  c: ".c",
  cpp: ".cpp",
  javascript: ".js",
  typescript: ".ts",
  python: ".py",
  rust: ".rs",
  csharp: ".cs",
};

export const getFileExtension = (language) =>
  languageFileExtension[language] || ".txt";

export const getLanguageFromFileName = (fileName = "") => {
  const normalizedFileName = fileName.toLowerCase();
  const matchingExtension = Object.keys(fileExtensionLanguageMap)
    .sort((first, second) => second.length - first.length)
    .find((extension) => normalizedFileName.endsWith(extension));

  return matchingExtension
    ? fileExtensionLanguageMap[matchingExtension]
    : null;
};

const detectionRules = {
  c: [
    { pattern: /#include\s*<stdio\.h>/, weight: 28 },
    { pattern: /\bprintf\s*\(/, weight: 14 },
    { pattern: /\bscanf\s*\(/, weight: 14 },
    { pattern: /\bmalloc\s*\(/, weight: 10 },
    { pattern: /\bint\s+main\s*\(/, weight: 10 },
    { pattern: /->\s*[A-Za-z_]\w*/, weight: 6 },
  ],
  cpp: [
    { pattern: /#include\s*<iostream>/, weight: 28 },
    { pattern: /\bstd::\w+/, weight: 18 },
    { pattern: /\bcout\s*<</, weight: 12 },
    { pattern: /\bcin\s*>>/, weight: 12 },
    { pattern: /\btemplate\s*</, weight: 12 },
    { pattern: /\bvector\s*</, weight: 8 },
    { pattern: /\busing\s+namespace\s+std\b/, weight: 8 },
  ],
  javascript: [
    { pattern: /\bconsole\.log\s*\(/, weight: 14 },
    { pattern: /\bfunction\s+\w+\s*\(/, weight: 12 },
    { pattern: /=>/, weight: 10 },
    { pattern: /\b(const|let|var)\s+\w+\s*=/, weight: 10 },
    { pattern: /\brequire\s*\(/, weight: 9 },
    { pattern: /\bmodule\.exports\b/, weight: 9 },
    { pattern: /\bdocument\./, weight: 7 },
  ],
  typescript: [
    { pattern: /\btype\s+\w+\s*=/, weight: 18 },
    { pattern: /\binterface\s+\w+/, weight: 18 },
    { pattern: /:\s*(string|number|boolean|unknown|any)\b/, weight: 14 },
    { pattern: /\b(public|private|protected|readonly)\s+\w+/, weight: 10 },
    { pattern: /<\w+>\s*\(/, weight: 7 },
    { pattern: /\w+\??:\s*\w+/, weight: 7 },
  ],
  python: [
    { pattern: /^\s*def\s+\w+\s*\(/m, weight: 22 },
    { pattern: /^\s*class\s+\w+.*:\s*$/m, weight: 16 },
    { pattern: /\bprint\s*\(/, weight: 10 },
    { pattern: /^\s*import\s+\w+/m, weight: 8 },
    { pattern: /^\s*from\s+\w+\s+import\s+/m, weight: 9 },
    { pattern: /\bself\./, weight: 9 },
    { pattern: /^\s*if\s+__name__\s*==\s*["']__main__["']\s*:/m, weight: 16 },
  ],
  rust: [
    { pattern: /^\s*fn\s+\w+\s*\(/m, weight: 20 },
    { pattern: /\blet\s+mut\s+\w+/, weight: 14 },
    { pattern: /\bprintln!\s*\(/, weight: 14 },
    { pattern: /\bimpl\s+\w+/, weight: 10 },
    { pattern: /\bmatch\s+\w+/, weight: 10 },
    { pattern: /::\s*new\s*\(/, weight: 6 },
    { pattern: /\bResult<.+>|\bOption<.+>/, weight: 10 },
  ],
  csharp: [
    { pattern: /\busing\s+System\b/, weight: 18 },
    { pattern: /\bnamespace\s+\w+/, weight: 10 },
    { pattern: /\bConsole\.Write(Line)?\s*\(/, weight: 18 },
    { pattern: /\bclass\s+\w+/, weight: 7 },
    { pattern: /\bstatic\s+void\s+Main\s*\(/, weight: 18 },
    { pattern: /\bvar\s+\w+\s*=/, weight: 5 },
    { pattern: /\bIEnumerable<|List</, weight: 6 },
  ],

};

const normalizeDetectionScore = (score, sourceLength) => {
  const lengthBonus = sourceLength > 600 ? 10 : sourceLength > 180 ? 6 : 0;
  return Math.min(99, Math.round(((score + lengthBonus) / 55) * 100));
};

export const detectSourceLanguage = (code = "", fileName = "") => {
  const source = code.trim();
  const detectedFromFileName = getLanguageFromFileName(fileName);

  if (!source && !detectedFromFileName) {
    return {
      language: null,
      confidence: 0,
      source: "empty",
      candidates: [],
    };
  }

  const scores = Object.entries(detectionRules).map(([language, rules]) => {
    const ruleScore = rules.reduce(
      (score, rule) => score + (rule.pattern.test(source) ? rule.weight : 0),
      0
    );
    const extensionScore = detectedFromFileName === language ? 36 : 0;
    const confidence = normalizeDetectionScore(
      ruleScore + extensionScore,
      source.length
    );

    return {
      language,
      label: getLanguageOption(language)?.label || language,
      confidence,
      score: ruleScore + extensionScore,
      source: extensionScore ? "file + content" : "content",
    };
  });

  const rankedCandidates = scores
    .filter((candidate) => candidate.confidence >= 18)
    .sort((first, second) => second.confidence - first.confidence)
    .slice(0, 4);
  const bestCandidate = rankedCandidates[0];

  if (!bestCandidate && detectedFromFileName) {
    return {
      language: detectedFromFileName,
      confidence: 72,
      source: "file",
      candidates: [
        {
          language: detectedFromFileName,
          label: getLanguageOption(detectedFromFileName)?.label || detectedFromFileName,
          confidence: 72,
          source: "file",
        },
      ],
    };
  }

  return {
    language: bestCandidate?.language || null,
    confidence: bestCandidate?.confidence || 0,
    source: bestCandidate?.source || "content",
    candidates: rankedCandidates,
  };
};
