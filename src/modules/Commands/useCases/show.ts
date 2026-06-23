#!/usr/bin/env node

// `corpus show <task|spec|review|checks> [ref]` — a read-only projection of a parsed Corpus artifact, the
// loader surface corpus-mcp (ADR-0085) adapts over the `--json` contract. Thin: parse flags, call the
// reconcile-only `show_artifact` engine, project. Renders no verdict and writes nothing.
//   corpus show task <stem>        the parsed task packet (scope, affected areas, claimed changes)
//   corpus show spec <id|path>     the parsed spec (frontmatter, requirements + verify commands)
//   corpus show review <stem>      the parsed review packet (status, coverage rows, verify blocks)
//   corpus show checks             the checks contract (version + the core checks)
//   --json                        machine output

import { project, show_artifact } from '../../Core/useCases/index.ts';
import { parse_flags } from '../../Terminal/useCases/index.ts';

export function run(argv: string[], cwd: string = process.cwd()): number {
    const { positional, flags } = parse_flags(argv, { booleans: ['--json'], strings: [] });
    const json = flags.get('json') === true;
    const kind = positional[0] ?? '';
    const ref = positional[1];

    return project({
        result: show_artifact({ workspaceDir: cwd, kind, ref }),
        json,
        render: (result) => JSON.stringify(result.value, null, 2),
    });
}
