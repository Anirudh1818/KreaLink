import { runEvaluationBenchmark } from "../src/lib/ai/evaluationHarness";

async function main() {
  console.log("Running KreaLink AI 2.0 Evaluation Benchmark across 25 test cases...");
  const report = await runEvaluationBenchmark();
  console.log("\n=======================================================");
  console.log("KREALINK AI 2.0 BENCHMARK REPORT");
  console.log("=======================================================");
  console.log(`Total Cases Evaluated:           ${report.totalTests}`);
  console.log(`Schema Validity Rate:            ${report.schemaValidityRate}%`);
  console.log(`Intent Understanding Accuracy:   ${report.intentAccuracyRate}%`);
  console.log(`Clarification Precision Rate:    ${report.clarificationPrecisionRate}%`);
  console.log(`Creator Ranking Quality (P@1):   ${report.rankingPrecisionAt1}%`);
  console.log(`Portfolio Evidence Grounding:    ${report.evidenceGroundingRate}%`);
  console.log(`Zero Hallucination Rate:         ${report.zeroHallucinationRate}%`);
  console.log(`Average Pipeline Latency:        ${report.averageLatencyMs}ms`);
  console.log("=======================================================");
  console.log("\nSample Case Results:");
  report.results.slice(0, 8).forEach((r) => {
    console.log(
      `[${r.id}] ${r.name.padEnd(35)} | Score: ${r.topScore}% | Confidence: ${r.confidence.padEnd(6)} | Readiness: ${r.readinessScore}% | Top: ${r.topCreator}`
    );
  });
}

main().catch(console.error);
