// iOS 26 / Hermes enforces WHATWG URL spec: all URL properties are read-only getters.
// Expo's getManifestBaseUrl mutates .protocol and .pathname, which crashes.
// Replace global.URL with a mutable wrapper before any Expo code runs.

if (typeof URL !== 'undefined') {
  const NativeURL = URL;

  function buildHref(p: {
    protocol: string;
    username: string;
    password: string;
    hostname: string;
    port: string;
    pathname: string;
    search: string;
    hash: string;
  }): string {
    const proto = p.protocol.endsWith(':') ? p.protocol : p.protocol + ':';
    let href = proto + '//';
    if (p.username) {
      href += p.username;
      if (p.password) href += ':' + p.password;
      href += '@';
    }
    href += p.hostname;
    if (p.port) href += ':' + p.port;
    href += p.pathname || '/';
    if (p.search && p.search !== '?') href += p.search;
    if (p.hash && p.hash !== '#') href += p.hash;
    return href;
  }

  class MutableURL {
    private _p: {
      protocol: string; username: string; password: string;
      hostname: string; port: string; pathname: string;
      search: string; hash: string; origin: string; host: string;
    };
    searchParams: URLSearchParams;

    constructor(input: string, base?: string) {
      const n = new NativeURL(input, base);
      this._p = {
        protocol: n.protocol, username: n.username, password: n.password,
        hostname: n.hostname, port: n.port, pathname: n.pathname,
        search: n.search, hash: n.hash, origin: n.origin, host: n.host,
      };
      this.searchParams = n.searchParams;
    }

    get protocol() { return this._p.protocol; }
    set protocol(v: string) { this._p.protocol = v.endsWith(':') ? v : v + ':'; }

    get username() { return this._p.username; }
    set username(v: string) { this._p.username = v; }

    get password() { return this._p.password; }
    set password(v: string) { this._p.password = v; }

    get hostname() { return this._p.hostname; }
    set hostname(v: string) {
      this._p.hostname = v;
      this._p.host = v + (this._p.port ? ':' + this._p.port : '');
    }

    get host() { return this._p.host; }
    set host(v: string) {
      const [h, port] = v.split(':');
      this._p.hostname = h;
      this._p.port = port ?? '';
      this._p.host = v;
    }

    get port() { return this._p.port; }
    set port(v: string) {
      this._p.port = v;
      this._p.host = this._p.hostname + (v ? ':' + v : '');
    }

    get pathname() { return this._p.pathname; }
    set pathname(v: string) { this._p.pathname = v; }

    get search() { return this._p.search; }
    set search(v: string) { this._p.search = v; }

    get hash() { return this._p.hash; }
    set hash(v: string) { this._p.hash = v; }

    get origin() { return this._p.origin; }

    get href(): string { return buildHref(this._p); }
    set href(v: string) {
      const n = new NativeURL(v);
      this._p = {
        protocol: n.protocol, username: n.username, password: n.password,
        hostname: n.hostname, port: n.port, pathname: n.pathname,
        search: n.search, hash: n.hash, origin: n.origin, host: n.host,
      };
      this.searchParams = n.searchParams;
    }

    toString() { return this.href; }
    toJSON() { return this.href; }
  }

  // Forward static methods
  (MutableURL as any).canParse = (NativeURL as any).canParse?.bind(NativeURL);
  (MutableURL as any).createObjectURL = (NativeURL as any).createObjectURL?.bind(NativeURL);
  (MutableURL as any).revokeObjectURL = (NativeURL as any).revokeObjectURL?.bind(NativeURL);

  // @ts-ignore
  global.URL = MutableURL;
}
