export {
    write_state,
    read_state,
    remove_state,
    is_process_running,
} from './state.ts';

export { claim_lock, release_lock, list_locks } from './locks.ts';

export { persist_event, read_events } from './persistEvent.ts';

// FINDING: services/telemetry.ts touches sqlite (I/O) and is the actual use-case
// implementation, not a "pure stateless helper" per AGENTS.md. It belongs in
// useCases/ (or a future repositories/). Re-exporting from services/ here is a
// known violation of the "barrels re-export from useCases/ only" rule. Move
// requires an explicit instruction (safety rules forbid unprompted file moves).
export {
    record_session,
    query_sessions,
    prune_events,
    prune_sessions,
} from '../services/telemetry.ts';
