import { Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import * as fs from "fs";
import * as path from "path";

class TestReporter implements Reporter {
  onTestEnd(test: TestCase, result: TestResult) {
    // Path to test-results at project root
    const dir = path.join(process.cwd(), "test-reports");

    // Ensure testresults folder exists
    fs.mkdirSync(dir, { recursive: true });

    // Get the top-level describe block
    const pathList = test.titlePath();
    let suiteName = pathList[pathList.length - 2] || "";
    
    // Remove trailing hyphen and whitespace (e.g. "User Management Tests - ")
    suiteName = suiteName.replace(/[-\s]+$/, "");

    // Build a safe filename
    const safeSuite = suiteName.replace(/\W+/g, "_");
    const safeTest = test.title.replace(/\W+/g, "_");

    const fileName = `${safeSuite}--${safeTest}.json`;
    const filePath = path.join(dir, fileName);

    const cleanError = result.errors
      .map(e => typeof e === "string" ? e : e.message)
      .join("")
      .replace(/\u001b\[[0-9;]*m/g, '');

    const data = {
      suite: suiteName,
      title: test.title,
      timestamp: new Date().toISOString(),
      status: result.status,
      duration: result.duration,
      errors: cleanError,
    };

    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  }
}

export default TestReporter;