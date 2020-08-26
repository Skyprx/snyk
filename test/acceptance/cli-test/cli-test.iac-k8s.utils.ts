import * as _ from '@snyk/lodash';
import {
  mapIacTestResult,
  AnnotatedIacIssue,
  IacTestResponse,
} from '../../../src/lib/snyk-test/iac-test-result';
import { Log, Run, Result } from 'sarif';

export async function iacTestPrep(
  t,
  utils,
  params,
  severityThreshold,
  additionaLpropsForCli,
) {
  utils.chdirWorkspaces();
  const iacTestResponse = iacTestResponseFixturesByThreshold[severityThreshold];
  params.server.setNextResponse(iacTestResponse);

  try {
    await params.cli.test('iac-kubernetes/multi-file.yaml', {
      iac: true,
      ...additionaLpropsForCli,
    });
    t.fail('should have thrown');
  } catch (testableObject) {
    return testableObject;
  }
}

export async function iacErrorTest(t, utils, params, testArg, expectedError) {
  utils.chdirWorkspaces();

  try {
    await params.cli.test(testArg, {
      iac: true,
    });
    t.fail('should have failed');
  } catch (err) {
    t.pass('throws err');
    t.match(err.message, expectedError, 'shows err');
  }
}

export async function iacTestJson(t, utils, params, severityThreshold) {
  const testableObject = await iacTestPrep(
    t,
    utils,
    params,
    severityThreshold,
    { severityThreshold, json: true },
  );
  const req = params.server.popRequest();
  t.is(req.query.severityThreshold, severityThreshold);

  const results = JSON.parse(testableObject.message);
  const expectedResults = mapIacTestResult(
    iacTestResponseFixturesByThreshold[severityThreshold],
  );

  iacTestJsonAssertions(t, results, expectedResults);
}

export async function iacTestSarif(t, utils, params, severityThreshold) {
  const testableObject = await iacTestPrep(
    t,
    utils,
    params,
    severityThreshold,
    { severityThreshold, sarif: true },
  );
  const req = params.server.popRequest();
  t.is(req.query.severityThreshold, severityThreshold);

  const results = JSON.parse(testableObject.message);
  const expectedResults = mapIacTestResult(
    iacTestResponseFixturesByThreshold[severityThreshold],
  );

  iacTestSarifAssertions(t, results, expectedResults);
}

export async function iacTestSarifFileOutput(
  t,
  utils,
  params,
  severityThreshold,
) {
  const testableObject = await iacTestPrep(
    t,
    utils,
    params,
    severityThreshold,
    { severityThreshold, sarif: true },
  );
  const req = params.server.popRequest();
  t.is(req.query.severityThreshold, severityThreshold);

  const results = JSON.parse(testableObject.message);
  const sarifStringifiedResults = JSON.parse(
    testableObject.sarifStringifiedResults,
  );
  t.deepEqual(
    results,
    sarifStringifiedResults,
    'stdout and stringified sarif results are the same',
  );
}

export async function iacTest(
  t,
  utils,
  params,
  severityThreshold,
  numOfIssues,
) {
  const testableObject = await iacTestPrep(
    t,
    utils,
    params,
    severityThreshold,
    {},
  );
  const res = testableObject.message;
  t.match(
    res,
    `Tested iac-kubernetes/multi-file.yaml for known issues, found ${numOfIssues} issues`,
    `${numOfIssues} issue`,
  );
  iacTestMetaAssertions(t, res);
}

export function iacTestMetaAssertions(t, res) {
  const meta = res.slice(res.indexOf('Organization:')).split('\n');
  t.match(meta[0], /Organization:\s+test-org/, 'organization displayed');
  t.match(meta[1], /Type:\s+Kubernetes/, 'Type displayed');
  t.match(
    meta[2],
    /Target file:\s+iac-kubernetes\/multi-file.yaml/,
    'target file displayed',
  );
  t.match(meta[3], /Project name:\s+iac-kubernetes/, 'project name displayed');
  t.match(meta[4], /Open source:\s+no/, 'open source displayed');
  t.match(meta[5], /Project path:\s+iac-kubernetes/, 'path displayed');
  t.notMatch(
    meta[5],
    /Local Snyk policy:\s+found/,
    'local policy not displayed',
  );
}

export function iacTestJsonAssertions(
  t,
  results,
  expectedResults,
  foundIssues = true,
) {
  t.deepEqual(results.org, 'test-org', 'org is ok');
  t.deepEqual(results.projectType, 'k8sconfig', 'projectType is ok');
  t.deepEqual(results.path, 'iac-kubernetes/multi-file.yaml', 'path is ok');
  t.deepEqual(results.projectName, 'iac-kubernetes', 'projectName is ok');
  t.deepEqual(
    results.targetFile,
    'iac-kubernetes/multi-file.yaml',
    'targetFile is ok',
  );
  t.deepEqual(results.dependencyCount, 0, 'dependencyCount is 0');
  t.deepEqual(results.vulnerabilities, [], 'vulnerabilities is empty');
  t.equal(results.cloudConfigResults, undefined);
  if (foundIssues) {
    t.deepEqual(
      _.sortBy(results.infrastructureAsCodeIssues, 'id'),
      _.sortBy(expectedResults.infrastructureAsCodeIssues, 'id'),
      'issues are the same',
    );
  } else {
    t.deepEqual(results.infrastructureAsCodeIssues, []);
  }
}

function getDistinctIssueIds(infrastructureAsCodeIssues): string[] {
  const issueIdsSet = new Set<string>();
  infrastructureAsCodeIssues.forEach((issue) => {
    issueIdsSet.add(issue.id);
  });
  return [...new Set(issueIdsSet)];
}

export function iacTestSarifAssertions(
  t,
  results: Log,
  expectedResults,
  foundIssues = true,
) {
  t.deepEqual(results.version, '2.1.0', 'version is ok');
  t.deepEqual(results.runs.length, 1, 'number of runs is ok');
  const run: Run = results.runs[0];
  t.deepEqual(
    run.tool.driver.name,
    'Snyk Infrastructure as Code',
    'tool name is ok',
  );
  if (!foundIssues) {
    t.deepEqual(run.tool.driver.rules!.length, 0, 'number of rules is ok');
    t.deepEqual(run.results!.length, 0, 'number of issues is ok');

    return;
  }

  const distictIssueIds = getDistinctIssueIds(
    expectedResults.infrastructureAsCodeIssues,
  );
  t.deepEqual(
    run.tool.driver.rules!.length,
    distictIssueIds.length,
    'number of rules is ok',
  );
  t.deepEqual(
    run.results!.length,
    expectedResults.infrastructureAsCodeIssues.length,
    'number of issues is ok',
  );
  for (let i = 0; i < run.results!.length; i++) {
    const sarifIssue: Result = run.results![i];
    const expectedIssue = expectedResults.infrastructureAsCodeIssues[i];
    t.deepEqual(sarifIssue.ruleId, expectedIssue.id, 'issue id is ok');

    const messageText = `This line contains a potential ${expectedIssue.severity} severity misconfiguration affacting the Kubernetes ${expectedIssue.subType}`;
    t.deepEqual(sarifIssue.message.text, messageText, 'issue message is ok');
    t.deepEqual(
      sarifIssue.locations![0].physicalLocation!.region!.startLine,
      expectedIssue.lineNumber,
      'issue message is ok',
    );
  }
}

function generateDummyIssue(severity): AnnotatedIacIssue {
  return {
    id: 'SNYK-CC-K8S-1',
    title: 'Reducing the admission of containers with dropped capabilities',
    name: 'Reducing the admission of containers with dropped capabilities',
    from: [],
    description:
      '## Overview Privileged containers can do nearly everything a process on the host can do, and provide no isolation from other workloads. Avoid where possible. ## Remediation Change to `false` ## References ad',
    cloudConfigPath: [
      '[DocId: 2]',
      'input',
      'spec',
      'requiredDropCapabilities',
    ],
    severity,
    isIgnored: false,
    type: 'k8s',
    subType: 'Deployment',
    path: [],
    lineNumber: 1,
  };
}

function generateDummyTestData(
  cloudConfigResults: Array<AnnotatedIacIssue>,
): IacTestResponse {
  return {
    targetFile: '',
    projectName: '',
    displayTargetFile: '',
    foundProjectCount: 1,
    ok: false,
    org: '',
    summary: '',
    isPrivate: false,
    result: {
      projectType: 'k8sconfig',
      cloudConfigResults,
    },
    meta: {
      org: 'test-org',
      isPublic: false,
      isLicensesEnabled: false,
      policy: '',
    },
  };
}

export const iacTestResponseFixturesByThreshold = {
  high: generateDummyTestData(
    ['high'].map((severity) => generateDummyIssue(severity)),
  ),
  medium: generateDummyTestData(
    ['high', 'medium'].map((severity) => generateDummyIssue(severity)),
  ),
  low: generateDummyTestData(
    ['high', 'medium', 'low'].map((severity) => generateDummyIssue(severity)),
  ),
};
