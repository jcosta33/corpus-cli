// The dispatchable command catalog (AC-004: advertised == dispatchable). One list, single-sourced:
// the dispatcher routes to each command's run(), `help` renders this, and the parity test
// cross-checks it against the useCases/ files. Exactly the M1 reconcile-only surface — no agent
// verbs, no garden.
export const COMMAND_CATALOG = [
    { name: 'init', description: 'Scaffold a Swarm workspace from the kit (conflict-safe)' },
    { name: 'check', description: 'Lint a spec, or render the whole-workspace verdict' },
    { name: 'worktree', description: 'Create / list / remove / prune isolated task worktrees' },
    { name: 'status', description: 'The workspace board — specs, tasks, reviews, gaps' },
    { name: 'new', description: 'Cut a task packet from a spec, or scaffold a new spec' },
    { name: 'help', description: 'Show this command reference' },
] as const;
