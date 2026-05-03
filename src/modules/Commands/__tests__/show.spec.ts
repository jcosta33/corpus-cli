import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../useCases/show.ts';

vi.mock('../../Workspace/useCases/index.ts', () => ({
    get_repo_root: vi.fn(() => '/tmp/repo'),
    worktree_list: vi.fn(() => []),
    is_worktree_dirty: vi.fn(() => false),
    get_status_summary: vi.fn(() => 'M file.ts'),
}));

vi.mock('../../AgentState/useCases/index.ts', () => ({
    read_state: vi.fn(() => ({})),
    is_process_running: vi.fn(() => true),
}));

vi.mock('../../Terminal/useCases/index.ts', async (importOriginal) => {
    const actual = await importOriginal();
    return { ...(actual as object), fzf_select: vi.fn(), box: vi.fn(), format_markdown: vi.fn((t: string) => t), yellow: vi.fn((t: string) => t), red: vi.fn((t: string) => t), green: vi.fn((t: string) => t), dim: vi.fn((t: string) => t) };
});

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return { ...actual, existsSync: vi.fn(() => false), readFileSync: vi.fn(() => '') };
});

import { worktree_list, get_repo_root } from '../../Workspace/useCases/index.ts';
import { fzf_select } from '../../Terminal/useCases/index.ts';
import { existsSync } from 'fs';
import { read_state } from '../../AgentState/useCases/index.ts';

describe('show', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(get_repo_root).mockReturnValue('/tmp/repo');
        vi.mocked(worktree_list).mockReturnValue([]);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns 1 when not in a git repo', () => {
        vi.mocked(get_repo_root).mockImplementation(() => { throw new Error('not a repo'); });
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when slug is missing and no sandboxes exist', () => {
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('shows sandbox via fzf selection', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(fzf_select).mockReturnValue('foo');
        process.argv = ['node', 'script'];
        expect(run()).toBe(0);
    });

    it('returns 1 when fzf selection is empty', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(fzf_select).mockReturnValue(null);
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when fzf throws', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(fzf_select).mockImplementation(() => { throw new Error('fzf not found'); });
        process.argv = ['node', 'script'];
        expect(run()).toBe(1);
    });

    it('returns 1 when sandbox not found', () => {
        vi.mocked(worktree_list).mockReturnValue([]);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(1);
    });

    it('shows sandbox details with task file', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(existsSync).mockReturnValue(true);
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(0);
    });

    it('shows sandbox details with state fields', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        vi.mocked(read_state).mockReturnValue({
            foo: { status: 'running', backend: 'test', agent: 'claude', pid: 1234, lastUpdated: '2024-01-01' },
        });
        process.argv = ['node', 'script', 'foo'];
        expect(run()).toBe(0);
    });
});
