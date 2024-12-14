const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");
const spawn = require("cross-spawn");

// To setup in new repo add output.md to .gitignore and run 'npm i puppeteer cross-spawn'
// Also create .vscode

// Function to copy text to clipboard
async function copyToClipboard(text) {
  const clipboardy = await import("clipboardy");
  await clipboardy.default.write(text);
}

// Function to read .gitignore file and return an array of patterns
function readGitignore(gitignorePath) {
  if (fs.existsSync(gitignorePath)) {
    return fs
      .readFileSync(gitignorePath, "utf-8")
      .split("\n")
      .map((pattern) => pattern.trim())
      .filter((pattern) => pattern && !pattern.startsWith("#"));
  }
  return [];
}

// Function to determine if a relative path matches a given pattern
function matchesPattern(relativePath, pattern) {
  const isDirPattern = pattern.endsWith("/");
  const cleanPattern = isDirPattern ? pattern.slice(0, -1) : pattern;
  const segments = relativePath.split(path.sep);

  if (cleanPattern.startsWith("/")) {
    const anchoredPattern = cleanPattern.substring(1);
    if (isDirPattern) {
      return relativePath === anchoredPattern || relativePath.startsWith(anchoredPattern + path.sep);
    } else if (anchoredPattern.startsWith("*.")) {
      const extension = anchoredPattern.substring(1);
      return relativePath.endsWith(extension);
    } else {
      return relativePath === anchoredPattern;
    }
  } else {
    if (isDirPattern) {
      return segments.includes(cleanPattern);
    } else if (cleanPattern.startsWith("*.")) {
      const extension = cleanPattern.substring(1);
      return relativePath.endsWith(extension);
    } else {
      const fileName = path.basename(relativePath);
      return segments.includes(cleanPattern) || fileName === cleanPattern;
    }
  }
}

// Function to check if a file or directory should be included based on exclude patterns
function shouldIncludeFile(filePath) {
  const relativePath = path.relative(__dirname, filePath);
  return !excludeFiles.some((pattern) => matchesPattern(relativePath, pattern));
}

// Update the excludeFiles array to include patterns from .gitignore
const excludeFiles = [
  ...readGitignore(".gitignore"),
  "concat.js",
  "package-lock.json",
  ".gitignore",
  "tasks.json",
  "*.jpg",
  "*.jpeg",
  "*.png",
  "*.gif",
  "*.bmp",
  "*.svg",
  "*.ico",
  "*.tif",
  "*.tiff",
  "*.psd",
  "*.ai",
  "*.eps",
  "*.indd",
  "*.pdf",
  "*.doc",
  "*.docx",
  "*.xls",
  "*.xlsx",
  "*.ppt",
  "*.pptx",
  "*.odt",
  "*.ods",
  "*.odp",
  "*.mp3",
  "*.wav",
  "*.aac",
  "*.m4a",
  "*.mp4",
  "*.avi",
  "*.mov",
  "*.wmv",
  "*.flv",
  "*.zip",
  "*.rar",
  "*.7z",
  "*.tar",
  "*.gz",
  "*.bz2",
  "*.log",
  "*.d.ts",
  "*.md",
  "*.map"
];

// Function to get file paths recursively
function getFilePaths(dirPath, arrayOfFiles = []) {
  const files = fs.readdirSync(dirPath);

  for (const file of files) {
    const filePath = path.join(dirPath, file);
    const isDirectory = fs.statSync(filePath).isDirectory();

    if (isDirectory) {
      if (!shouldIncludeFile(`${path.relative(__dirname, filePath)}/`)) {
        continue;
      }
      getFilePaths(filePath, arrayOfFiles);
    } else {
      if (shouldIncludeFile(filePath)) {
        arrayOfFiles.push(filePath);
      }
    }
  }
  return arrayOfFiles;
}

// Function to count tokens in text
function countTokens(text) {
  const tokens = text.split(/\s+|[^\w\s]+/);
  const filteredTokens = tokens.filter((token) => token.length > 0);
  return filteredTokens.length;
}

// Helper function to run a command and capture its output
function runCommand(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: "pipe" });
    let output = "";
    let errorOutput = "";

    child.stdout.on("data", (data) => {
      output += data.toString();
    });

    child.stderr.on("data", (data) => {
      errorOutput += data.toString();
    });

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", () => {
      resolve({ output, errorOutput });
    });
  });
}

// Helper function to parse ESLint output and extract relevant information
function parseESLintOutput(output) {
  const eslintErrors = [];
  try {
    const parsedOutput = JSON.parse(output);
    parsedOutput.forEach((file) => {
      const relativePath = path.relative(__dirname, file.filePath);
      file.messages.forEach((message) => {
        const { line, ruleId, message: text } = message;
        const errorString = `[${relativePath}] Line ${line}: ${text} (${ruleId})`;
        eslintErrors.push(`${errorString}`);
      });
    });
  } catch (error) {
    console.error("Failed to parse ESLint output:", error);
  }
  return eslintErrors;
}

// Function to summarize TypeScript errors
function summarizeTypescriptErrors(output) {
  const lines = output.trim().split("\n");
  const typescriptErrors = lines.filter((line) => line.includes("error TS"));
  return typescriptErrors;
}

// Function to get the project name from the package.json file
function getProjectName() {
  const packageJsonPath = path.join(__dirname, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
    return packageJson.name;
  }
  return "Unknown Project";
}

// Function to generate a limited JSON mapping of included files
function generateFileMap(filePaths) {
  // Limit to first 50 files and shorten paths to 100 chars
  const limited = filePaths.slice(0, 50).map((file) => {
    const rel = path.relative(__dirname, file);
    return rel.length > 100 ? rel.substring(0, 100) + "..." : rel;
  });
  return JSON.stringify({ files: limited });
}

// Function to generate the output in markdown format
function generateOutput(
  codeFiles,
  runtimeErrors,
  buildErrors,
  eslintErrors,
  typescriptErrors,
  summary,
  fileMapJson
) {
  const uniqueCodeFiles = [...new Set(codeFiles)];

  const output = `# Overview
Here is a summary of the codebase in its current form, including code files and current errors. 

## Summary
${summary}

# Project: ${getProjectName()}

## Files Map
\`\`\`json
${fileMapJson}
\`\`\`

## Code Files

${uniqueCodeFiles.join("\n")}

## Runtime Errors

${runtimeErrors.length > 0 ? runtimeErrors.slice(0, 5).join("\n") : "No runtime errors found."}

## Build Errors

${buildErrors.length > 0 ? buildErrors.slice(0, 5).join("\n") : "No build errors found."}

## ESLint Errors

${eslintErrors.length > 0 ? eslintErrors.slice(0, 5).join("\n") : "No ESLint errors found."}

## TypeScript Errors

${typescriptErrors.length > 0 ? typescriptErrors.join("\n") : "No TypeScript errors found."}
`;

  return output;
}

// Function to get file content with file structure
function getFileContentWithStructure(filePath) {
  const relativeFilePath = path.relative(__dirname, filePath);
  if (relativeFilePath === "output.md") {
    return "";
  }
  const content = fs.readFileSync(filePath, "utf-8").trim();
  if (content.length === 0) {
    return "";
  }
  return `[${relativeFilePath}]\n${content}\n...\n`;
}

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.evaluateOnNewDocument(() => {
    window.onerror = function (message, source, lineno, colno, error) {
      window.capturedErrors = window.capturedErrors || [];
      window.capturedErrors.push(error.stack);
    };
  });

  await page.goto("http://localhost:3000");
  await page.waitForSelector("body", { timeout: 5000 });
  await new Promise((resolve) => setTimeout(resolve, 2000));

  const runtimeErrors = await page.evaluate(() => {
    return window.capturedErrors || [];
  });

  const summaryRuntimeErrors = runtimeErrors.map((error) => {
    const lines = error.split("\n");
    const firstLine = lines[0].trim();
    const fileInfo = lines.slice(1).find((line) => line.includes("at "));
    return `- ${firstLine}\n  ${fileInfo}`;
  });

  let buildErrors = [];
  try {
    buildErrors = await page.evaluate(() => {
      const errorOverlay = document.querySelector(".react-error-overlay");
      if (errorOverlay) {
        return errorOverlay.innerText.trim().split("\n");
      }
      return [];
    });
  } catch (error) {
    console.error("Failed to retrieve build errors:", error);
  }

  let eslintErrors = [];
  try {
    const eslintArgs = ["src", "--ext", ".js,.jsx,.ts,.tsx", "--format", "json"];
    const eslintPath = path.join(
      __dirname,
      "node_modules",
      "eslint",
      "bin",
      "eslint.js"
    );
    const { output: eslintOutput } = await runCommand("node", [
      eslintPath,
      ...eslintArgs,
    ]);
    eslintErrors = parseESLintOutput(eslintOutput);
  } catch (error) {
    console.error("Failed to run ESLint:", error);
  }

  let typescriptErrors = [];
  try {
    const typescriptArgs = ["--noEmit", "--listEmittedFiles", "--diagnostics"];
    const typescriptPath = path.join(
      __dirname,
      "node_modules",
      "typescript",
      "bin",
      "tsc"
    );
    const { output: typescriptOutput } = await runCommand(
      typescriptPath,
      typescriptArgs
    );
    typescriptErrors = summarizeTypescriptErrors(typescriptOutput);
  } catch (error) {
    console.error("Failed to run TypeScript:", error);
  }

  fs.writeFileSync("output.md", "");
  const filePaths = getFilePaths(__dirname);
  const codeFiles = filePaths.map(getFileContentWithStructure);
  const summary = `- Total files: ${filePaths.length}
- Lines of code: ${codeFiles.join("").split("\n").length}
- Runtime errors: ${summaryRuntimeErrors.length}
- Build errors: ${buildErrors.length}
- ESLint errors: ${eslintErrors.length}
- TypeScript errors: ${typescriptErrors.length}`;

  const fileMapJson = generateFileMap(filePaths);

  const output = generateOutput(
    codeFiles,
    summaryRuntimeErrors,
    buildErrors,
    eslintErrors,
    typescriptErrors,
    summary,
    fileMapJson
  );

  fs.writeFileSync("output.md", output);
  await copyToClipboard(output);

  console.log("Output generated and copied to clipboard successfully!");
  console.log(summary);
  console.log(`- Token count: ${countTokens(output)}`);

  await browser.close();
})();
