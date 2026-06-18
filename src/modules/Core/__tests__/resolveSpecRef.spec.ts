import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

import { build_spec_ref_resolver } from '../useCases/resolveSpecRef.ts';
import { find_workspace_spec_files, find_sibling_spec_files } from '../useCases/findSpecFiles.ts';

let dir: string;

const SPEC = `---
type: spec
id: SPEC-checkout
status: ready
sources:
  - ADR-0077
---

## Requirements

### AC-002 — order record
The tool must write it.
Verify with: a test.

### AC-003 — ledger
The tool must append it.
Verify with: a test.

## Non-goals

- none.

## Open questions

- none.
`;

beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), 'swarm-resolve-'));
});
afterEach(() => {
    rmSync(dir, { recursive: true, force: true });
});

describe('build_spec_ref_resolver', () => {
    it('resolves a SPEC-x#AC-NNN ref the indexed spec defines, and rejects an absent one', () => {
        const specPath = join(dir, 'spec.md');
        writeFileSync(specPath, SPEC);
        const resolves = build_spec_ref_resolver([specPath]);
        expect(resolves('SPEC-checkout', 'AC-002')).toBe(true);
        expect(resolves('SPEC-checkout', 'AC-003')).toBe(true);
        expect(resolves('SPEC-checkout', 'AC-999')).toBe(false); // anchor absent
        expect(resolves('SPEC-absent', 'AC-002')).toBe(false); // spec absent
    });

    it('skips a spec that does not parse and one with no frontmatter id', () => {
        const noFence = join(dir, 'a.md');
        writeFileSync(noFence, 'no frontmatter fence here\n');
        const noId = join(dir, 'b.md');
        writeFileSync(noId, SPEC.replace('id: SPEC-checkout\n', ''));
        const resolves = build_spec_ref_resolver([noFence, noId]);
        expect(resolves('SPEC-checkout', 'AC-002')).toBe(false);
    });
});

describe('find_workspace_spec_files / find_sibling_spec_files', () => {
    it('finds specs/*/spec.md under the workspace dir', () => {
        mkdirSync(join(dir, 'specs', 'checkout'), { recursive: true });
        writeFileSync(join(dir, 'specs', 'checkout', 'spec.md'), SPEC);
        mkdirSync(join(dir, 'specs', 'empty'), { recursive: true }); // no spec.md → skipped
        expect(find_workspace_spec_files(dir)).toEqual([join(dir, 'specs', 'checkout', 'spec.md')]);
    });

    it('returns [] when there is no specs/ dir', () => {
        expect(find_workspace_spec_files(dir)).toEqual([]);
    });

    it('returns [] when the change plan has no existing parent directory', () => {
        // planDir = dir/absent/deeper, so parentDir = dir/absent (does not exist) → no siblings, no crash
        expect(find_sibling_spec_files(join(dir, 'absent', 'deeper', 'change-plan.md'))).toEqual([]);
    });

    it('finds sibling */spec.md beside a change plan (the fixture layout)', () => {
        mkdirSync(join(dir, 'transformation'), { recursive: true });
        mkdirSync(join(dir, 'checkout'), { recursive: true });
        writeFileSync(join(dir, 'checkout', 'spec.md'), SPEC);
        const planPath = join(dir, 'transformation', 'change-plan.md');
        writeFileSync(planPath, '---\ntype: change-plan\nid: X\n---\n# x\n');
        // a non-directory sibling is tolerated (skipped), not a crash
        writeFileSync(join(dir, 'README.md'), 'hi\n');
        expect(find_sibling_spec_files(planPath)).toEqual([join(dir, 'checkout', 'spec.md')]);
    });
});
