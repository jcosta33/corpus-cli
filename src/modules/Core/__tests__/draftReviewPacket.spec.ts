import { describe, it, expect } from 'vitest';

import { draft_review_packet, type DraftReviewPacketInput } from '../useCases/draftReviewPacket.ts';
import { parse_review_packet } from '../services/parseReviewPacket.ts';
import { assertOk } from '../../../infra/errors/testing/assertOk.ts';
import { assertErr } from '../../../infra/errors/testing/assertErr.ts';

// The spec's named verify command is `a test.` (so a matching C013 block records exactly that).
function specSource(opts: { status?: string; title?: string; ids?: readonly string[] } = {}): string {
    const ids = opts.ids ?? ['AC-001', 'AC-002'];
    const reqs = ids.map((id) => `### ${id} — does it\nThe tool must do it.\nVerify with: a test.\n`).join('\n');
    const title = opts.title !== undefined ? `title: ${opts.title}\n` : '';
    return `---
type: spec
id: SPEC-feat
${title}status: ${opts.status ?? 'ready'}
sources:
  - ADR-0077
---

## Requirements

${reqs}
## Non-goals

- none.

## Open questions

- none.
`;
}

function taskSource(opts: { scope?: readonly string[]; areas?: readonly string[]; claimed?: readonly string[] } = {}): string {
    const scope = opts.scope ?? ['AC-001', 'AC-002'];
    const areas = opts.areas ?? ['src'];
    const claimed = opts.claimed ?? ['src/a.ts'];
    return `---
type: task
id: TASK-feat
source:
  - SPEC-feat
scope: [${scope.join(', ')}]
status: review-ready
---

# Task

## Affected areas

${areas.map((a) => `- \`${a}\``).join('\n')}

## Run summary

- Changed files: ${claimed.map((c) => `\`${c}\``).join(', ')}
`;
}

// A review packet carrying a CONSISTENT C013 block for AC-001 (cmd = the spec's named command,
// result=pass) — the only shape the writer lifts as evidence (it still writes Unverified).
function reviewWithConsistentBlock(): string {
    return `---
type: review
id: REVIEW-feat
task: TASK-feat
status: needs-human
---

# Review

## Requirement coverage

| ID | Result | Evidence | Human attention |
|---|---|---|---|
| AC-001 | Pass | p | no |

\`\`\`verify id=AC-001 cmd="a test." result=pass
ok (1 passed)
\`\`\`
`;
}

function input(over: Partial<DraftReviewPacketInput> = {}): DraftReviewPacketInput {
    return {
        task: 'TASK-feat',
        slug: 'feat',
        taskPacketSource: taskSource(),
        specSource: specSource(),
        reviewPacketSource: null,
        diffChangedFiles: ['src/a.ts', 'src/b.ts'],
        ...over,
    };
}

describe('draft_review_packet — populates from the reconcile (AC-001)', () => {
    it('one coverage row per in-scope id, the diff changed files, and a status: draft packet', () => {
        const draft = assertOk(draft_review_packet(input()));
        const packet = parse_review_packet(draft.markdown);
        expect(packet.coverageRows.map((r) => r.id)).toEqual(['AC-001', 'AC-002']);
        expect(packet.status).toBe('draft');
        // The diff's changed files are listed under Changed files.
        expect(draft.markdown).toContain('- `src/a.ts`');
        expect(draft.markdown).toContain('- `src/b.ts`');
        // The frontmatter ids carry the slug; the writer routes, never adjudicates.
        expect(draft.markdown).toContain('id: REVIEW-feat');
        expect(draft.markdown).toContain('task: TASK-feat');
    });

    it('routes the no-packet case as ONE summary line, not per-id "uncovered" noise contradicting its own rows (SW-012)', () => {
        const draft = assertOk(draft_review_packet(input({ reviewPacketSource: null })));
        // No review packet yet → one summary line: every in-scope id reads uncovered until a human fills it.
        expect(draft.markdown).toContain('No review packet yet');
        // ...but the draft WRITES an Unverified row for each in-scope id, so it must NOT also echo a
        // per-id "C012 uncovered: ... no coverage row" line — that contradicted the table it just emitted.
        expect(draft.markdown).not.toMatch(/C012 uncovered/);
        // The rows are present (Unverified), which is exactly why the per-id "no coverage row" was wrong.
        expect(parse_review_packet(draft.markdown).coverageRows.map((r) => r.id)).toEqual(['AC-001', 'AC-002']);
    });

    it('uses the spec title for the heading when present', () => {
        const draft = assertOk(draft_review_packet(input({ specSource: specSource({ title: 'The widget' }) })));
        expect(draft.markdown).toContain('# Review: The widget');
    });
});

describe('draft_review_packet — the no-Pass / Unverified floor (AC-002)', () => {
    it('every written Result is Unverified — never a Pass', () => {
        const draft = assertOk(draft_review_packet(input()));
        const packet = parse_review_packet(draft.markdown);
        expect(packet.coverageRows.length).toBeGreaterThan(0);
        for (const row of packet.coverageRows) {
            expect(row.result).toBe('Unverified');
        }
        // No coverage row anywhere carries a Pass/Fail/Blocked Result cell.
        expect(draft.markdown).not.toMatch(/\|\s*(Pass|Fail|Blocked)\s*\|/);
    });

    it('a row whose reconcile found a CONSISTENT C013 block is STILL Unverified — block is evidence, not a Pass', () => {
        const draft = assertOk(
            draft_review_packet(input({ reviewPacketSource: reviewWithConsistentBlock() }))
        );
        const packet = parse_review_packet(draft.markdown);
        const ac001 = packet.coverageRows.find((r) => r.id === 'AC-001');
        expect(ac001?.result).toBe('Unverified'); // NOT Pass, even with a matching verify block
        // The consistent block's recorded cmd+result is carried as the Evidence cell (a pointer to re-run).
        expect(ac001?.evidence).toContain('a test.');
        expect(ac001?.evidence).toContain('result=pass');
        // The packet read back is still draft, all-Unverified — no Pass slipped in.
        expect(packet.status).toBe('draft');
        for (const row of packet.coverageRows) {
            expect(row.result).toBe('Unverified');
        }
    });

    it('does not lift evidence from a draft source spec (the C013 scope guard)', () => {
        const draft = assertOk(
            draft_review_packet(
                input({
                    specSource: specSource({ status: 'draft' }),
                    reviewPacketSource: reviewWithConsistentBlock(),
                })
            )
        );
        const packet = parse_review_packet(draft.markdown);
        const ac001 = packet.coverageRows.find((r) => r.id === 'AC-001');
        expect(ac001?.evidence).toBe(''); // a draft spec's named commands are work-in-progress
    });
});

describe('draft_review_packet — always status: draft, never a terminal status (AC-003)', () => {
    it('writes status: draft and no terminal status, regardless of the resolved packet', () => {
        // Even when an existing packet is status: pass, the WRITER emits draft.
        const passPacket = reviewWithConsistentBlock().replace('status: needs-human', 'status: pass');
        const draft = assertOk(draft_review_packet(input({ reviewPacketSource: passPacket })));
        expect(parse_review_packet(draft.markdown).status).toBe('draft');
        expect(draft.markdown).not.toMatch(/^status:\s*(pass|waived|blocked|needs-human)\s*$/m);
    });
});

describe('draft_review_packet — verdict-free (AC-006)', () => {
    it('emits no review result / merge decision of its own', () => {
        const draft = assertOk(draft_review_packet(input()));
        // The Suggested-decision section is a placeholder for the human, not a computed value.
        expect(draft.markdown).toMatch(/## Suggested decision\n\n\{\{/);
        // The returned record carries only the literal slug + markdown — no Result/verdict/decision field.
        expect(Object.keys(draft)).toEqual(['slug', 'markdown']);
    });
});

describe('draft_review_packet — errors', () => {
    it('errs when the task packet declares no scope (nothing to draft)', () => {
        expect(assertErr(draft_review_packet(input({ taskPacketSource: taskSource({ scope: [] }) })))._tag).toBe(
            'EmptyScope'
        );
    });

    it('propagates the reconcile error on an unparseable source spec', () => {
        const result = draft_review_packet(input({ specSource: 'no frontmatter fence here' }));
        expect(result.ok).toBe(false);
    });
});
