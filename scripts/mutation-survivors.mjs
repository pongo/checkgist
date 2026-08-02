import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";

const reportPath = resolve("reports/mutation/mutation.json");
const outputConfigs = [
  {
    status: "Survived",
    outputPath: resolve(".scratch/mutation-survivors.txt"),
    title: "Stryker mutation survivors",
    countLabel: "Survived mutants",
    consoleLabel: "surviving mutations",
    includeCoveringTestFiles: true,
  },
  {
    status: "NoCoverage",
    outputPath: resolve(".scratch/mutation-no-coverage.txt"),
    title: "Stryker mutations without test coverage",
    countLabel: "No-coverage mutants",
    consoleLabel: "mutations without test coverage",
    includeCoveringTestFiles: false,
    note: "No covering tests are reported for mutations in this file.",
  },
];

/**
 * Converts Stryker's 1-based line and column position into a string offset.
 * Stryker reports positions against the original source embedded in mutation.json.
 *
 * @param {string} source
 * @param {{ line: number; column: number }} position
 */
function offsetAt(source, position) {
  const lines = source.split("\n");

  if (position.line < 1 || position.line > lines.length) {
    return undefined;
  }

  return (
    lines.slice(0, position.line - 1).reduce((offset, line) => offset + line.length + 1, 0) +
    position.column -
    1
  );
}

/**
 * @param {string | undefined} source
 * @param {{ start: { line: number; column: number }; end: { line: number; column: number } } | undefined} location
 */
function originalCode(source, location) {
  if (source === undefined || location === undefined) {
    return "<source unavailable>";
  }

  const start = offsetAt(source, location.start);
  const end = offsetAt(source, location.end);

  if (start === undefined || end === undefined || start > end) {
    return "<source location unavailable>";
  }

  return source.slice(start, end).replaceAll("\n", "\\n");
}

/**
 * @param {Record<string, { tests?: Array<{ id: string }> }>} testFiles
 */
function testFilePathsById(testFiles) {
  return new Map(
    Object.entries(testFiles).flatMap(([filePath, testFile]) =>
      (testFile.tests ?? []).map((test) => [test.id, filePath]),
    ),
  );
}

/**
 * Keeps nearby mutants together for agent triage. Mutants without locations sort last because
 * their relative source position cannot be established.
 *
 * @param {{ id: string; location?: { start: { line: number; column: number } } }} left
 * @param {{ id: string; location?: { start: { line: number; column: number } } }} right
 */
function compareMutantsByLocation(left, right) {
  const leftStart = left.location?.start;
  const rightStart = right.location?.start;

  if (leftStart === undefined || rightStart === undefined) {
    if (leftStart === undefined && rightStart !== undefined) return 1;
    if (leftStart !== undefined && rightStart === undefined) return -1;
  } else {
    const positionDifference =
      leftStart.line - rightStart.line || leftStart.column - rightStart.column;

    if (positionDifference !== 0) return positionDifference;
  }

  return left.id.localeCompare(right.id, undefined, { numeric: true });
}

/**
 * @param {{ files: Record<string, { source?: string; mutants?: Array<any> }> }} report
 * @param {Map<string, string>} testFilePaths
 * @param {{ status: string; title: string; countLabel: string; includeCoveringTestFiles: boolean; note?: string }} config
 */
function mutationSummary(report, testFilePaths, config) {
  const affectedFiles = Object.entries(report.files)
    .map(([filePath, file]) => ({
      filePath,
      source: file.source,
      mutants: (file.mutants ?? [])
        .filter((mutant) => mutant.status === config.status)
        .sort(compareMutantsByLocation),
    }))
    .filter((file) => file.mutants.length > 0);
  const mutantCount = affectedFiles.reduce((count, file) => count + file.mutants.length, 0);
  const lines = [
    config.title,
    `Source report: ${reportPath}`,
    `${config.countLabel}: ${mutantCount}`,
    `Affected files: ${affectedFiles.length}`,
    ...(config.note === undefined ? [] : ["", config.note]),
    "",
  ];

  for (const file of affectedFiles) {
    lines.push(`## ${file.filePath}`, "");

    for (const mutant of file.mutants) {
      const location = mutant.location;
      const position =
        location === undefined
          ? "unknown location"
          : `${location.start.line}:${location.start.column}`;
      const coveringTestFiles = new Set();

      if (config.includeCoveringTestFiles) {
        for (const testId of mutant.coveredBy ?? []) {
          coveringTestFiles.add(
            testFilePaths.get(testId) ?? `<unknown test file for test ${testId}>`,
          );
        }
      }

      lines.push(
        `[${mutant.status}] ${mutant.mutatorName} (id: ${mutant.id})`,
        `${file.filePath}:${position}`,
        `- ${originalCode(file.source, location)}`,
        `+ ${mutant.replacement}`,
        ...(config.includeCoveringTestFiles
          ? [
              "Covering test files:",
              ...(coveringTestFiles.size > 0
                ? [...coveringTestFiles].map((testFilePath) => `  ${testFilePath}`)
                : ["  <none>"]),
            ]
          : []),
        "",
      );
    }
  }

  return { mutantCount, contents: `${lines.join("\n")}\n` };
}

async function main() {
  let report;

  try {
    report = JSON.parse(await readFile(reportPath, "utf8"));
  } catch (error) {
    const details = error instanceof Error ? error.message : String(error);
    throw new Error(`Could not read Stryker report at ${reportPath}: ${details}`);
  }

  if (report.files === null || typeof report.files !== "object") {
    throw new Error(`Stryker report at ${reportPath} does not contain a files object.`);
  }

  const testFilePaths = testFilePathsById(report.testFiles ?? {});

  for (const config of outputConfigs) {
    const summary = mutationSummary(report, testFilePaths, config);
    await mkdir(dirname(config.outputPath), { recursive: true });
    await writeFile(config.outputPath, summary.contents, "utf8");
    console.log(`Wrote ${summary.mutantCount} ${config.consoleLabel} to ${config.outputPath}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
