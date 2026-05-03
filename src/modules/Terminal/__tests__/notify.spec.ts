import { describe, expect, it, vi } from 'vitest';
import { notify } from '../useCases/notify.ts';

vi.mock('child_process', () => ({
    execSync: vi.fn(),
}));

vi.mock('os', () => ({
    platform: vi.fn(),
}));

import { execSync } from 'child_process';
import { platform } from 'os';

describe('notify', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('sends macOS notification', () => {
        vi.mocked(platform).mockReturnValue('darwin');
        notify('Title', 'Hello');
        expect(execSync).toHaveBeenCalled();
    });

    it('sends Linux notification', () => {
        vi.mocked(platform).mockReturnValue('linux');
        notify('Title', 'Hello');
        expect(execSync).toHaveBeenCalled();
    });

    it('sends Windows notification', () => {
        vi.mocked(platform).mockReturnValue('win32');
        notify('Title', 'Hello');
        expect(execSync).toHaveBeenCalled();
    });

    it('silently ignores unsupported platform', () => {
        vi.mocked(platform).mockReturnValue('freebsd');
        expect(() => notify('Title', 'Hello')).not.toThrow();
        expect(execSync).not.toHaveBeenCalled();
    });

    it('silently ignores exec errors', () => {
        vi.mocked(platform).mockReturnValue('darwin');
        vi.mocked(execSync).mockImplementation(() => { throw new Error('fail'); });
        expect(() => notify('Title', 'Hello')).not.toThrow();
    });
});
