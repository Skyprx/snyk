import { test } from 'tap';
import { exec } from 'child_process';
import { sep } from 'path';

const osName = require('os-name');

const main = './dist/cli/index.js'.replace(/\//g, sep);
const iswindows =
  osName()
    .toLowerCase()
    .indexOf('windows') === 0;

// TODO(kyegupov): make these work in Windows
test('snyk test command should fail when --file is not specified correctly', (t) => {
  t.plan(1);
  exec(`node ${main} test --file package-lock.json`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.match(
      stdout.trim(),
      'Empty --file argument. Did you mean --file=path/to/file ?',
      'correct error output',
    );
  });
});

test(
  'snyk version command should show cli version or sha',
  { skip: iswindows },
  (t) => {
    t.plan(1);
    exec(`node ${main} --version`, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.match(
        stdout.trim(),
        ':', // can't guess branch or sha or dirty files, but we do always add `:`
        'version is shown',
      );
    });
  },
);

test('snyk test command should fail when --packageManager is not specified correctly', (t) => {
  t.plan(1);
  exec(`node ${main} test --packageManager=hello`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.match(
      stdout.trim(),
      'Unsupported package manager',
      'correct error output',
    );
  });
});

test('snyk test command should fail when iac file is not specified', (t) => {
  t.plan(1);
  exec(`node ${main} iac test`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.match(
      stdout.trim(),
      'iac test option currently supports only a single local file',
      'correct error output',
    );
  });
});

test('snyk test command should fail when iac --file is specified', (t) => {
  t.plan(1);
  exec(
    `node ${main} iac test --file=./test/acceptance/workspaces/iac-kubernetes/multi-file.yaml`,
    (err, stdout) => {
      if (err) {
        throw err;
      }
      t.match(
        stdout.trim(),
        'Not a recognised option, did you mean "snyk iac test ./test/acceptance/workspaces/iac-kubernetes/multi-file.yaml"? ' +
          'Check other options by running snyk iac --help',
        'correct error output',
      );
    },
  );
});

test('snyk test command should fail when iac file is not supported', (t) => {
  t.plan(1);
  exec(
    `node ${main} iac test ./test/acceptance/workspaces/empty/readme.md`,
    (err, stdout) => {
      if (err) {
        throw err;
      }
      t.match(
        stdout.trim(),
        'Illegal infrastructure as code target file',
        'correct error output',
      );
    },
  );
});

test('snyk test command should fail when iac file is not supported', (t) => {
  t.plan(1);
  exec(
    `node ${main} iac test ./test/acceptance/workspaces/helmconfig/Chart.yaml`,
    (err, stdout) => {
      if (err) {
        throw err;
      }
      t.match(
        stdout.trim(),
        'Not supported infrastructure as code target files in',
        'correct error output',
      );
    },
  );
});
test('`test multiple paths with --project-name=NAME`', (t) => {
  t.plan(1);
  exec(`node ${main} test pathA pathB --project-name=NAME`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.match(
      stdout.trim(),
      'The following option combination is not currently supported: multiple paths + project-name',
      'correct error output',
    );
  });
});

test('`test that running snyk without any args displays help text`', (t) => {
  t.plan(1);
  exec(`node ${main}`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.match(stdout.trim(), /Usage/, '`snyk help` text is shown as output');
  });
});

test('`test --file=file.sln --project-name=NAME`', (t) => {
  t.plan(1);
  exec(
    `node ${main} test --file=file.sln --project-name=NAME`,
    (err, stdout) => {
      if (err) {
        throw err;
      }
      t.match(
        stdout.trim(),
        'The following option combination is not currently supported: file=*.sln + project-name',
        'correct error output',
      );
    },
  );
});

test('`test --file=blah --scan-all-unmanaged`', (t) => {
  t.plan(1);
  exec(`node ${main} test --file=blah --scan-all-unmanaged`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.match(
      stdout.trim(),
      'The following option combination is not currently supported: file + scan-all-unmanaged',
      'correct error output',
    );
  });
});

const argsNotAllowedWithYarnWorkspaces = [
  'file',
  'package-manager',
  'project-name',
  'docker',
  'all-sub-projects',
];

argsNotAllowedWithYarnWorkspaces.forEach((arg) => {
  test(`using --${arg} and --yarn-workspaces displays error message`, (t) => {
    t.plan(2);
    exec(`node ${main} test --${arg} --yarn-workspaces`, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.deepEqual(
        stdout.trim(),
        `The following option combination is not currently supported: ${arg} + yarn-workspaces`,
        'when using test',
      );
    });
    exec(`node ${main} monitor --${arg} --yarn-workspaces`, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.deepEqual(
        stdout.trim(),
        `The following option combination is not currently supported: ${arg} + yarn-workspaces`,
        'when using monitor',
      );
    });
  });
});
const argsNotAllowedWithAllProjects = [
  'file',
  'package-manager',
  'project-name',
  'docker',
  'all-sub-projects',
  'yarn-workspaces',
];

argsNotAllowedWithAllProjects.forEach((arg) => {
  test(`using --${arg} and --all-projects displays error message`, (t) => {
    t.plan(2);
    exec(`node ${main} test --${arg} --all-projects`, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.deepEqual(
        stdout.trim(),
        `The following option combination is not currently supported: ${arg} + all-projects`,
        'when using test',
      );
    });
    exec(`node ${main} monitor --${arg} --all-projects`, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.deepEqual(
        stdout.trim(),
        `The following option combination is not currently supported: ${arg} + all-projects`,
        'when using monitor',
      );
    });
  });
});

test('`test --exclude without --all-project displays error message`', (t) => {
  t.plan(1);
  exec(`node ${main} test --exclude=test`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.equals(
      stdout.trim(),
      'The --exclude option can only be use in combination with --all-projects or --yarn-workspaces.',
    );
  });
});

test('`test --exclude without any value displays error message`', (t) => {
  t.plan(1);
  exec(`node ${main} test --all-projects --exclude`, (err, stdout) => {
    if (err) {
      throw err;
    }
    t.equals(
      stdout.trim(),
      'Empty --exclude argument. Did you mean --exclude=subdirectory ?',
    );
  });
});

test('`test --exclude=path/to/dir displays error message`', (t) => {
  t.plan(1);
  const exclude = 'path/to/dir'.replace(/\//g, sep);
  exec(
    `node ${main} test --all-projects --exclude=${exclude}`,
    (err, stdout) => {
      if (err) {
        throw err;
      }
      t.equals(
        stdout.trim(),
        'The --exclude argument must be a comma separated list of directory names and cannot contain a path.',
      );
    },
  );
});

test('`other commands not allowed with --json-file-output`', (t) => {
  const commandsNotCompatibleWithJsonFileOutput = [
    'auth',
    'config',
    'help',
    'ignore',
    'modules',
    'monitor',
    'policy',
    'protect',
    'version',
    'wizard',
    'woof',
  ];

  t.plan(commandsNotCompatibleWithJsonFileOutput.length);

  for (const nextCommand of commandsNotCompatibleWithJsonFileOutput) {
    exec(`node ${main} ${nextCommand} --json-file-output`, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.match(
        stdout.trim(),
        `The following option combination is not currently supported: ${nextCommand} + json-file-output`,
        `correct error output when ${nextCommand} is used with --json-file-output`,
      );
    });
  }
});

test('`test --json-file-output no value produces error message`', (t) => {
  const optionsToTest = [
    '--json-file-output',
    '--json-file-output=',
    '--json-file-output=""',
    "--json-file-output=''",
  ];

  t.plan(optionsToTest.length);

  const validate = (jsonFileOutputOption: string) => {
    const fullCommand = `node ${main} test ${jsonFileOutputOption}`;
    exec(fullCommand, (err, stdout) => {
      if (err) {
        throw err;
      }
      t.equals(
        stdout.trim(),
        'Empty --json-file-output argument. Did you mean --file=path/to/output-file.json ?',
      );
    });
  };

  optionsToTest.forEach(validate);
});
