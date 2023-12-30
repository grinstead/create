const fs = require("node:fs/promises");
const path = require("node:path");
const process = require("node:process");
const prettier = require("prettier");

const io = require("node:readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

async function askString(question, defaultResponse) {
  const response = await new Promise((resolve) => {
    let formatted = question;

    if (defaultResponse) {
      formatted = `${formatted} (${defaultResponse})`;
    }

    formatted += ": ";

    io.question(formatted, resolve);
  });

  return response || defaultResponse || "";
}

async function askEnum(question, rawOptions, defaultResponse) {
  const options = Array.from(rawOptions);
  if (!options.length) {
    throw new Error("No option specified");
  }

  const formatted = `${question} ${JSON.stringify(options)}`;
  const normalized = options.map((s) => s.toLowerCase());

  while (true) {
    const result = await askString(formatted, defaultResponse);

    if (result === defaultResponse) return defaultResponse;

    const index = normalized.indexOf(result.toLowerCase());
    if (index >= 0) return options[index];

    console.error(
      `Expected one of ${JSON.stringify(options)} but received ${JSON.stringify(
        result
      )}`
    );
  }
}

async function writeJson(file, object) {
  return fs.writeFile(
    file,
    await prettier.format(JSON.stringify(object), { parser: "json" })
  );
}

async function writeJson5(file, text) {
  return fs.writeFile(
    file,
    await prettier.format(text, { parser: "json5", quoteProps: "preserve" })
  );
}

async function createTypescript() {
  let parentDir = process.cwd();
  let projectName = await askString(
    "What would you like to name your project?",
    "my-project"
  );

  // support using the containing folder
  if (projectName === ".") {
    const parsed = path.parse(parentDir);
    parentDir = parsed.dir;
    projectName = parsed.base;
  }

  const dir = path.resolve(parentDir, projectName);

  if (path.parse(dir).name !== projectName) {
    throw new Error(
      `Must use simple project name, given: ${JSON.stringify(projectName)}`
    );
  }

  // TODO: check that folder does not exist, or if it does exist that it's empty

  await fs.mkdir(dir);

  await Promise.all([
    writeJson(path.resolve(dir, "package.json"), {
      name: projectName,
      private: true,
      version: "0.0.1",
      type: "module",
      scripts: {
        build: "tsc",
      },
      devDependencies: {
        typescript: "^5.2.2",
      },
    }),
    // using json5 because it allows comments
    writeJson5(
      path.resolve(dir, "tsconfig.json"),
      `{
        "compilerOptions": {
          "target": "ES2020",
          "useDefineForClassFields": true,
          "module": "ESNext",
          "lib": ["ES2020", "DOM", "DOM.Iterable"],
          "skipLibCheck": true,

          /* Bundler mode */
          "moduleResolution": "bundler",
          "allowImportingTsExtensions": true,
          "resolveJsonModule": true,
          "isolatedModules": true,
          "noEmit": true,

          /* Linting */
          "strict": true,
          "noUnusedLocals": true,
          "noUnusedParameters": true,
          "noFallthroughCasesInSwitch": true,
        },
        "include": ["src"],
      }`,
      { parser: "json5" }
    ),
    fs.mkdir(path.resolve(dir, "src")),
    // got this gitignore file from vite's vanilla ts
    fs.writeFile(
      path.resolve(dir, ".gitignore"),
      `
# Logs
logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

node_modules
dist
dist-ssr
*.local

# Editor directories and files
.vscode/*
!.vscode/extensions.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?`
    ),
  ]);

  io.close();
}

createTypescript();
