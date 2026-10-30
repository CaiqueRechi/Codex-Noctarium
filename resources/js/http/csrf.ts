const xsrfCookieName = 'XSRF-TOKEN';

// Laravel refreshes this cookie on every response, so it survives the session
// regeneration on login, while a token printed in the host's markup would not.
export function xsrfHeaders(): Record<string, string> {
    const token = readCookie(xsrfCookieName);

    if (!token) {
        throw new Error('Token CSRF indisponível. Recarregue a página.');
    }

    return { 'X-XSRF-TOKEN': token };
}

function readCookie(name: string): string | null {
    const prefix = `${name}=`;
    const cookie = document.cookie
        .split('; ')
        .find((entry) => entry.startsWith(prefix));

    return cookie ? decodeURIComponent(cookie.slice(prefix.length)) : null;
}
