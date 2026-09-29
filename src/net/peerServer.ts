/**
 * Which PeerJS signalling server to use (D-078): the public one unless the page's
 * `?peer=<host>:<port>[/path]` names another, e.g. a group's own `peer` server or the local one
 * the browser tests start. Secure (wss) unless the host is `localhost` or `127.0.0.1`.
 */

export interface PeerServer {
  readonly host: string;
  readonly port: number;
  readonly path: string;
  readonly secure: boolean;
}

const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1']);
const SERVER = /^([a-z0-9.-]+):(\d{1,5})(\/[\w./-]*)?$/i;

/** The server named by the page's query string, or `null` for PeerJS's public server. */
export function peerServerFrom(search: string): PeerServer | null {
  const value = new URLSearchParams(search).get('peer');
  if (value === null) return null;
  const match = SERVER.exec(value.trim());
  if (match === null) return null;
  const [, host = '', portText = '', path = '/'] = match;
  const port = Number(portText);
  if (port < 1 || port > 65_535) return null;
  return { host, port, path, secure: !LOCAL_HOSTS.has(host.toLowerCase()) };
}
