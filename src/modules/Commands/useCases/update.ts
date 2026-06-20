#!/usr/bin/env node

// `swarm update [--check]` — the kit drift signal (SPEC-swarm-update, ADR-0091). Reconcile-only:
// resolves the kit (clone jcosta33/swarm-starter-kit by default; `--from <path|url>` overrides — the
// same resolution as `swarm init`), then the Core engine compares the workspace's
// `.agents/.swarm-version` pin to the kit's VERSION and reports drift. Exit 0 up-to-date · 1 behind ·
// 2 error. It writes nothing. The 3-way-merge apply is deferred (ADR-0091): `--write` is refused, not
// a silent no-op.

import { isErr } from '../../../infra/errors/result.ts';
import { project, emit_error, usage_error, check_update } from '../../Core/useCases/index.ts';
import { parse_flags } from '../../Terminal/useCases/index.ts';
import { format_update_report } from '../../Tui/useCases/index.ts';
import { resolve_kit_source } from './init.ts';

export function run(argv: string[], cwd: string = process.cwd()): number {
    const { flags } = parse_flags(argv, {
        booleans: ['--check', '--json', '--write', '--apply'],
        strings: ['--from'],
    });
    const json = flags.get('json') === true;

    // The apply/merge is deferred (ADR-0091) — refuse it explicitly so it is never a silent no-op.
    if (flags.get('write') === true || flags.get('apply') === true) {
        return emit_error(
            usage_error(
                'the apply step (3-way merge) is deferred (ADR-0091) — only the drift check ships; run `swarm update --check`'
            ),
            json
        );
    }

    const fromFlag = flags.get('from');
    const from = typeof fromFlag === 'string' ? fromFlag : undefined;

    const sourceResult = resolve_kit_source(from);
    if (isErr(sourceResult)) {
        return emit_error(sourceResult.error, json);
    }
    const { sourceDir, cleanup } = sourceResult.value;

    try {
        return project({
            result: check_update({ workspaceDir: cwd, kitSourceDir: sourceDir }),
            json,
            render: format_update_report,
        });
    } finally {
        cleanup();
    }
}
