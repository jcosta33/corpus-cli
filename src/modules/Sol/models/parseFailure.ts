import type { AppError } from '../../../infra/errors/createAppError.ts';

// A parse failure — the error arm of the parser's Result. A failure is a whole-document "cannot
// produce a record at all" condition; ill-formed *blocks* would be diagnostics, not failures (a later
// increment), so the parser would report them and keep going rather than fail the parse.
//
// Modeled as the repo's AppError (src/infra/errors): `_tag: 'ParseFailure'`, `reason` names which
// failure, `line` the 1-based source line when known. A type-only model — no runtime surface.
export type ParseFailureCode = 'unparseable-frontmatter' | 'unknown-block-type';

export type ParseFailure = AppError<'ParseFailure', { reason: ParseFailureCode; line: number | null }>;
