import { afterEach, describe, expect, it } from 'vitest';
import { xsrfHeaders } from '../http/csrf';

describe('XSRF header for vault mutations', () => {
    afterEach(() => {
        document.cookie =
            'XSRF-TOKEN=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    });

    it('sends the decoded Laravel cookie without needing a csrf meta tag', () => {
        document.cookie = 'XSRF-TOKEN=eyJpdiI6IjEyMyJ9%3D; path=/';

        expect(document.querySelector('meta[name="csrf-token"]')).toBeNull();
        expect(xsrfHeaders()).toEqual({
            'X-XSRF-TOKEN': 'eyJpdiI6IjEyMyJ9=',
        });
    });

    it('asks for a reload when the cookie is missing', () => {
        expect(() => xsrfHeaders()).toThrow(
            'Token CSRF indisponível. Recarregue a página.',
        );
    });
});
