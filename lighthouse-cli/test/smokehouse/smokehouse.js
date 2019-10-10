/**
 * @license Copyright 2019 Google Inc. All Rights Reserved.
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except in compliance with the License. You may obtain a copy of the License at http://www.apache.org/licenses/LICENSE-2.0
 * Unless required by applicable law or agreed to in writing, software distributed under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 */
'use strict';

const log = require('lighthouse-logger');
const runLighthouseCli = require('./run-lighthouse-cli.js').runLighthouse;
const getAssertionReport = require('./report-assert.js');
const LocalConsole = require('./local-console.js');
const ConcurrentMapper = require('./concurrent-mapper.js');

/* eslint-disable no-console */

/** @typedef {import('./child-process-error.js')} ChildProcessError */

// The number of concurrent (`runParallel`) tests to run if `jobs` isn't set.
const DEFAULT_CONCURRENT_RUNS = 5;

/**
 * @typedef {object} SmokehouseOptions
 * @property {number=} jobs Manually set the number of jobs to run at once. `1` runs all tests serially.
 * @property {boolean=} isDebug If true, performs extra logging from the test runs.
 */

/**
 * TODO(bckenny): remove when we can inject runners. Enforced by injection site.
 * The result of running a Lighthouse test.
 * @typedef {object} SmokeResult
 * @property {LH.Result} lhr
 * @property {LH.Artifacts} artifacts
 */

/**
 * Runs the selected smoke tests. Returns whether all assertions pass.
 * @param {Array<Smokehouse.TestDfn>} smokeTestDefns
 * @param {SmokehouseOptions=} smokehouseOptions
 * @return {Promise<boolean>}
 */
async function runSmokehouse(smokeTestDefns, smokehouseOptions = {}) {
  const {jobs = DEFAULT_CONCURRENT_RUNS, isDebug} = smokehouseOptions;

  // Run each test defn, running each contained test based on the concurrencyLimit.
  const concurrentMapper = new ConcurrentMapper();
  const smokePromises = [];
  for (const testDefn of smokeTestDefns) {
    // If defn is set to not runParallel, we'll run tests in succession, not parallel.
    const concurrencyLimit = testDefn.runParallel ? jobs : 1;
    const result = runSmokeTestDefn(concurrentMapper, testDefn, {concurrencyLimit, isDebug});
    smokePromises.push(result);
  }
  const smokeResults = await Promise.all(smokePromises);

  // Print and fail if there were failing tests.
  const failingTests = smokeResults.filter(result => result.failingCount > 0);
  if (failingTests.length) {
    const testNames = failingTests.map(t => t.id).join(', ');
    console.error(log.redify(`We have ${failingTests.length} failing smoketests: ${testNames}`));
    return false;
  }

  return true;
}

/**
 * Run all the smoke tests specified, displaying output from each in order once
 * all are finished.
 * @param {ConcurrentMapper} concurrentMapper
 * @param {Smokehouse.TestDfn} smokeTestDefn
 * @param {{concurrencyLimit: number, isDebug?: boolean}} defnOptions
 * @return {Promise<{id: string, passingCount: number, failingCount: number}>}
 */
async function runSmokeTestDefn(concurrentMapper, smokeTestDefn, defnOptions) {
  const {id, config: configJson, expectations} = smokeTestDefn;
  const {isDebug, concurrencyLimit} = defnOptions;

  // Loop sequentially over expectations, comparing against Lighthouse run, and
  // reporting result.
  const individualTests = expectations.map(expectation => ({
    requestedUrl: expectation.lhr.requestedUrl,
    configJson,
    expectation,
    isDebug,
  }));

  const results = await concurrentMapper.concurrentMap(individualTests, (test, index) => {
    if (index === 0) console.log(`${purpleify(id)} smoketest starting…`);
    return runSmokeTest(test);
  }, concurrencyLimit);

  console.log(`\n${purpleify(id)} smoketest results:`);

  let passingCount = 0;
  let failingCount = 0;
  for (const result of results) {
    passingCount += result.passed;
    failingCount += result.failed;

    process.stdout.write(result.stdout);
    // stderr accrues many empty lines. Don't log unless there's content.
    if (/\S/.test(result.stderr)) {
      process.stderr.write(result.stderr);
    }
  }

  console.log(`${purpleify(id)} smoketest complete.`);
  if (passingCount) {
    console.log(log.greenify(`  ${passingCount} passing`));
  }
  if (failingCount) {
    console.log(log.redify(`  ${failingCount} failing`));
  }
  console.log('\n');

  return {
    id,
    passingCount,
    failingCount,
  };
}

/** @param {string} str */
function purpleify(str) {
  return `${log.purple}${str}${log.reset}`;
}

/**
 * Run Lighthouse in the selected runner. Returns stdout/stderr for logging once
 * all tests in a defn are complete.
 * @param {{requestedUrl: string, configJson?: LH.Config.Json, expectation: Smokehouse.ExpectedRunnerResult, isDebug?: boolean}} testOptions
 * @return {Promise<{passed: number, failed: number, stdout: string, stderr: string}>}
 */
async function runSmokeTest(testOptions) {
  const localConsole = new LocalConsole();

  const {requestedUrl, configJson, expectation, isDebug} = testOptions;
  localConsole.log(`Doing a run of '${requestedUrl}'...`);
  // TODO(bckenny): select runner?

  let result;
  try {
    result = await runLighthouseCli(requestedUrl, configJson, {isDebug});
  } catch (e) {
    logChildProcessError(localConsole, e);
  }

  // Automatically retry failed test in CI to prevent flakes.
  if (!result && process.env.RETRY_SMOKES || process.env.CI) {
    try {
      localConsole.log('Retrying test...');
      result = await runLighthouseCli(requestedUrl, configJson, {isDebug});
    } catch (e) {
      logChildProcessError(localConsole, e);
    }
  }

  if (result) {
    localConsole.adoptLog(result);
  }

  localConsole.log(`Asserting expected results match those found (${requestedUrl}).`);
  const report = getAssertionReport(result, expectation, {isDebug});
  localConsole.adoptLog(report);

  return {
    passed: report.passed,
    failed: report.failed,
    stdout: localConsole.stdout,
    stderr: localConsole.stderr,
  };
}

/**
 * Logs an error to the console, including stdout and stderr if `err` is a
 * `ChildProcessError`.
 * @param {LocalConsole} localConsole
 * @param {ChildProcessError|Error} err
 */
function logChildProcessError(localConsole, err) {
  localConsole.error(log.redify('Error: ') + err.message);

  if ('stdout' in err && 'stderr' in err) {
    localConsole.adoptLog(err);
  }
}

module.exports = {
  runSmokehouse,
};
