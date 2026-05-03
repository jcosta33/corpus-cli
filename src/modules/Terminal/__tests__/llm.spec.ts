import { describe, expect, it, vi } from 'vitest';
import { summarize_insight } from '../useCases/llm.ts';

vi.mock('fs', async (importOriginal) => {
    const actual = await importOriginal<typeof import('fs')>();
    return {
        ...actual,
        existsSync: vi.fn(),
        readFileSync: vi.fn(),
    };
});

import { existsSync, readFileSync } from 'fs';

describe('summarize_insight', () => {
    it('returns null when .env is missing', async () => {
        vi.mocked(existsSync).mockReturnValue(false);
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('returns null when .env cannot be read', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockImplementation(() => { throw new Error('fail'); });
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('returns null when no API keys are present', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('');
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('returns insight from anthropic response', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('ANTHROPIC_API_KEY=sk-test');
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ content: [{ text: '  Insight text  ' }] }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBe('Insight text');
    });

    it('returns null on anthropic fetch failure', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('ANTHROPIC_API_KEY=sk-test');
        const mockResponse = { ok: false };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('returns null on invalid anthropic response shape', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('ANTHROPIC_API_KEY=sk-test');
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ unexpected: true }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('returns insight from openai response', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('OPENAI_API_KEY=sk-test');
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ choices: [{ message: { content: '  OpenAI insight  ' } }] }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBe('OpenAI insight');
    });

    it('returns null on openai fetch failure', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('OPENAI_API_KEY=sk-test');
        const mockResponse = { ok: false };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('returns null on invalid openai response shape', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('OPENAI_API_KEY=sk-test');
        const mockResponse = {
            ok: true,
            json: vi.fn().mockResolvedValue({ unexpected: true }),
        };
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(mockResponse));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });

    it('handles fetch exceptions gracefully', async () => {
        vi.mocked(existsSync).mockReturnValue(true);
        vi.mocked(readFileSync).mockReturnValue('ANTHROPIC_API_KEY=sk-test');
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network')));
        const result = await summarize_insight('/repo', 'test prompt');
        expect(result).toBeNull();
    });
});
