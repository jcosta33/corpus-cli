import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { run } from '../useCases/prune.ts';

vi.mock('../../Workspace/useCases/index.ts', () => ({
    get_repo_root: vi.fn(() => '/tmp/repo'),
    worktree_list: vi.fn(),
    is_branch_merged_into: vi.fn(() => true),
    worktree_remove: vi.fn((path: string) => ({ ok: true, value: { path } })),
    delete_branch: vi.fn((branch: string) => ({ ok: true, value: { branch } })),
    worktree_prune: vi.fn(),
}));

vi.mock('../../AgentState/useCases/index.ts', () => ({
    remove_state: vi.fn(),
}));

import { worktree_list, get_repo_root, worktree_remove, delete_branch, is_branch_merged_into } from '../../Workspace/useCases/index.ts';

describe('prune', () => {
    beforeEach(() => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        vi.spyOn(console, 'error').mockImplementation(() => {});
        vi.mocked(get_repo_root).mockReturnValue('/tmp/repo');
        vi.mocked(worktree_list).mockReturnValue([]);
        vi.mocked(worktree_remove).mockReturnValue({ ok: true, value: { path: '/tmp/repo/.agents/agent-foo' } });
        vi.mocked(delete_branch).mockReturnValue({ ok: true, value: { branch: 'agent/foo' } });
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('returns 1 when not in a git repo', () => {
        vi.mocked(get_repo_root).mockImplementation(() => { throw new Error('not a repo'); });
        expect(run()).toBe(1);
    });

    it('returns 0 when no merged sandboxes exist', () => {
        vi.mocked(worktree_list).mockReturnValue([]);
        expect(run()).toBe(0);
    });

    it('prunes merged sandboxes', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        expect(run()).toBe(0);
    });

    it('skips unmerged sandboxes', () => {
        vi.mocked(is_branch_merged_into).mockReturnValue(false);
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        expect(run()).toBe(0);
    });

    it('skips main and base branch sandboxes', () => {
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo', branch: 'main', head: 'abc' },
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        expect(run()).toBe(0);
    });

    it('continues when worktree removal fails', () => {
        vi.mocked(worktree_remove).mockReturnValue({
            ok: false,
            error: Object.assign(new Error('git error'), { _tag: 'WorktreeRemoveFailed' as const }),
        });
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        expect(run()).toBe(0);
    });

    it('continues when branch deletion fails', () => {
        vi.mocked(delete_branch).mockReturnValue({
            ok: false,
            error: Object.assign(new Error('git error'), { _tag: 'BranchDeleteFailed' as const }),
        });
        vi.mocked(worktree_list).mockReturnValue([
            { path: '/tmp/repo/.agents/agent-foo', branch: 'agent/foo', head: 'abc' },
        ]);
        expect(run()).toBe(0);
    });
});
