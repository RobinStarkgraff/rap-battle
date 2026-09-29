/**
 * A sitting with friends (§7 League state and hosting): the host opens a room for its saved
 * league and plays through its own league client like every guest (D-083); guests join by
 * room code. This turns the league client's events into the game's screens, keeps the league
 * saved after every round, and serves the lobby and the hub.
 */

import {
  awaySummary,
  TUNABLES,
  type AwaySummary,
  type Bid,
  type CrewId,
  type CrewIdentity,
  type League,
  type Place,
  type UnitId,
} from '../core';
import {
  connectLeagueClient,
  createLeagueHost,
  linkedPair,
  newRoomCode,
  type ClientEvent,
  type Link,
  type LeagueClient,
  type LeagueHost,
  type Network,
  type NoticeReason,
  type RoomCode,
  type PlayerAction,
} from '../net';
import type {
  HubController,
  HubState,
  LobbyController,
  LobbyInfo,
  LobbyPhase,
  LobbyRole,
  LobbySeat,
  LobbyState,
  PlayerStatus,
  SittingPlayer,
  SittingView,
} from '../render';
import { playedRound, type PlayedRound, type PlayerBattle } from './localLeague';

/** How often the host tries a new room code when one is taken. */
const CODE_ATTEMPTS = 3;

/** The screens a sitting shows; the game flow shows them. */
export type SittingScreen =
  | { readonly kind: 'lobby' }
  | {
      readonly kind: 'founding';
      readonly joining: { readonly replaces: string | null };
      readonly notice: string | null;
    }
  | { readonly kind: 'hub' }
  | { readonly kind: 'battle'; readonly battle: PlayerBattle }
  | {
      readonly kind: 'result';
      readonly crewId: CrewId;
      readonly played: PlayedRound;
      readonly saved: boolean;
    };

/** What a sitting needs from the game flow. */
export interface SittingShell {
  show(screen: SittingScreen): void;
  /** The lobby's or the hub's state changed within the screen. */
  changed(): void;
  /** The player left the sitting. */
  left(): void;
  /** Saves the league with the player's crew; `false` if the browser refused. */
  save(league: League, crewId: CrewId): boolean;
}

export interface Sitting {
  readonly lobby: LobbyController;
  /** The hub while this player's crew shops in a running round. */
  hub(): HubController | null;
  /** Founding (joining): found the crew that joins the host's league. */
  found(identity: CrewIdentity): void;
  /** The battle playback is over. */
  battleWatched(): void;
  /** Result: on to the next round, or the lobby until the host starts it. */
  nextRound(): void;
  /** Leaves the sitting (the host closes it). */
  close(): void;
}

export interface HostSittingOptions {
  readonly network: Network;
  readonly random: () => number;
  readonly league: League;
  readonly crewId: CrewId;
}

export interface JoinSittingOptions {
  readonly network: Network;
  readonly code: RoomCode;
  /** This browser's saved league and the player's crew in it. */
  readonly saved: League | null;
  readonly savedCrewId: CrewId | null;
}

/** Opens a room for the saved league and seats guests as they arrive. */
export function hostSitting(options: HostSittingOptions, shell: SittingShell): Sitting {
  const host = createLeagueHost({ league: options.league, hostCrewId: options.crewId });
  const player = createPlayer('host', shell, options.league, host);
  const [clientEnd, hostEnd] = linkedPair();
  host.addLink(hostEnd, true);
  host.onChange(player.changed);
  player.onClose(() => {
    host.close();
  });
  void player.connect(clientEnd, options.league, options.crewId);

  const open = async (): Promise<void> => {
    for (let attempt = 0; attempt < CODE_ATTEMPTS; attempt++) {
      const code = newRoomCode(options.random);
      const hosted = await options.network.host(code);
      if (player.hasLeft()) {
        if (hosted.ok) hosted.value.close();
        return;
      }
      if (!hosted.ok) {
        if (hosted.error === 'codeTaken') continue;
        player.update({ phase: 'closed', notice: hosted.error });
        return;
      }
      const room = hosted.value;
      player.onClose(() => {
        room.close();
      });
      room.onGuest((link) => {
        host.addLink(link);
      });
      room.onLost(() => {
        player.update({ notice: 'roomLost' });
      });
      player.update({ code, phase: 'open' });
      return;
    }
    player.update({ phase: 'closed', notice: 'codeTaken' });
  };
  void open();
  return player.sitting;
}

/** Joins the room with the code, telling the host about this browser's saved league. */
export function joinSitting(options: JoinSittingOptions, shell: SittingShell): Sitting {
  const player = createPlayer('guest', shell, options.saved, null);
  const connect = async (): Promise<void> => {
    const joined = await options.network.join(options.code);
    if (player.hasLeft()) {
      if (joined.ok) joined.value.close();
      return;
    }
    if (!joined.ok) {
      player.update({ phase: 'closed', notice: joined.error });
      return;
    }
    player.update({ code: options.code });
    await player.connect(joined.value, options.saved, options.savedCrewId);
  };
  void connect();
  return player.sitting;
}

interface LobbyFields {
  code: string | null;
  phase: LobbyPhase;
  notice: string | null;
}

type Shown = SittingScreen['kind'];

interface Player {
  readonly sitting: Sitting;
  readonly changed: () => void;
  readonly update: (change: Partial<LobbyFields>) => void;
  readonly hasLeft: () => boolean;
  readonly onClose: (listener: () => void) => void;
  readonly connect: (link: Link, league: League | null, crewId: CrewId | null) => Promise<void>;
}

/** The part of a sitting every player has, the host too: its client and its screens. */
function createPlayer(
  role: LobbyRole,
  shell: SittingShell,
  saved: League | null,
  host: LeagueHost | null,
): Player {
  const fields: LobbyFields = { code: null, phase: 'opening', notice: null };
  let client: LeagueClient | null = null;
  let shown: Shown = 'lobby';
  let open = true;
  /** The league as this player last saw it, for the away summary. */
  let baseline: League | null = saved;
  let away: AwaySummary | null = null;
  /** Whether this player's crew played the round that just finished. */
  let justPlayed = false;
  /** Whether the running round's battles were played (so a host drop no longer voids it). */
  let roundPlayed = false;
  /** Crews whose players dropped out of the running round. */
  let left: CrewId[] = [];
  /** The last nudge this player got. */
  let nudge: { readonly from: string; readonly count: number } | null = null;
  let played: PlayedRound | null = null;
  let lastSaved = false;
  const closeListeners: (() => void)[] = [];
  const listeners = new Set<() => void>();

  const changed = (): void => {
    for (const listener of [...listeners]) listener();
    shell.changed();
  };
  const show = (screen: SittingScreen): void => {
    shown = screen.kind;
    shell.show(screen);
  };
  const update = (change: Partial<LobbyFields>): void => {
    Object.assign(fields, change);
    changed();
  };
  const you = (): CrewId | null => client?.crewId() ?? null;
  const inRound = (): boolean => {
    const crewId = you();
    return crewId !== null && (client?.round()?.humans.includes(crewId) ?? false);
  };
  /** The crew of the other league saved in this browser, which joining would replace. */
  const replaces = (): string | null => {
    if (saved === null || client?.league()?.seed === saved.seed) return null;
    const own = saved.members.find((member) => member.kind === 'player')?.crewId;
    return saved.crews.find((crew) => crew.id === own)?.identity.name ?? null;
  };
  const showFounding = (notice: string | null): void => {
    show({ kind: 'founding', joining: { replaces: replaces() }, notice });
  };

  function onEvent(event: ClientEvent): void {
    switch (event.kind) {
      case 'league':
        onLeague(event.league, event.you);
        return;
      case 'roundStarted':
        away = null;
        justPlayed = false;
        roundPlayed = false;
        left = [];
        nudge = null;
        if (inRound() && shown === 'lobby') show({ kind: 'hub' });
        else changed();
        return;
      case 'changed':
        changed();
        return;
      case 'played':
        onPlayed(event.played.finished, event.played.crews);
        return;
      case 'refused':
        if (shown === 'founding') showFounding(event.reason);
        else update({ notice: event.reason });
        return;
      case 'desync':
        // A broken round is sent again; a different result is replaced by the host's league.
        update({ notice: event.reason === 'result' ? 'desync' : 'resyncing' });
        return;
      case 'notice':
        onNotice(event.reason, event.crewId);
        return;
      case 'nudged':
        nudge = { from: crewName(client, event.from), count: (nudge?.count ?? 0) + 1 };
        changed();
        return;
      case 'hostLeft':
        fields.phase = 'closed';
        // Mid-round, the round is void: everyone falls back to the last completed round (§7).
        fields.notice =
          (client?.round() ?? null) !== null && !roundPlayed ? 'roundVoided' : 'hostLeft';
        if (shown === 'hub' || shown === 'founding') show({ kind: 'lobby' });
        else changed();
        return;
    }
  }

  function onLeague(league: League, crewId: CrewId | null): void {
    if (crewId !== null) {
      lastSaved = shell.save(league, crewId);
      if (!justPlayed && baseline?.seed === league.seed) {
        away = awaySummary(baseline, league, crewId) ?? away;
      }
      baseline = league;
    }
    justPlayed = false;
    if (crewId === null && role === 'guest' && shown === 'lobby') {
      showFounding(null);
    } else if (crewId !== null && shown === 'founding') {
      show({ kind: 'lobby' });
    } else {
      changed();
    }
  }

  function onNotice(reason: NoticeReason, crewId: CrewId): void {
    if (reason === 'playerLeft') left = [...left, crewId];
    else fields.notice = 'peerOutOfSync';
    changed();
  }

  function onPlayed(
    finished: PlayedRound['finished'],
    crews: Parameters<typeof playedRound>[1],
  ): void {
    roundPlayed = true;
    const crewId = you();
    if (crewId === null) return;
    // The round is complete once its battles are played: save it now, in case the host drops.
    lastSaved = shell.save(finished.league, crewId);
    if (!inRound()) return;
    justPlayed = true;
    played = playedRound(finished, crews, crewId);
    if (played.battle === null) showResult();
    else show({ kind: 'battle', battle: played.battle });
  }

  function showResult(): void {
    const crewId = you();
    if (played === null || crewId === null) return;
    show({ kind: 'result', crewId, played, saved: lastSaved });
  }

  const seats = (): LobbySeat[] => {
    const statuses = new Map(playerStatuses(client, left).map((row) => [row.crewId, row.status]));
    return (client?.seats() ?? []).map((seat) => ({
      crew: seat.crew,
      isHost: seat.isHost,
      isYou: seat.seat === client?.seat,
      status: seat.crewId === null ? null : (statuses.get(seat.crewId) ?? null),
    }));
  };
  const info = (): LobbyInfo | null => {
    if (client === null) return null;
    if (client.round() !== null) return inRound() ? 'roundRunning' : 'watching';
    if (client.league() !== null && you() === null) return 'needCrew';
    return null;
  };
  const lobbyState = (): LobbyState => ({
    role,
    code: fields.code,
    phase: fields.phase,
    seats: seats(),
    notice: fields.notice,
    canStart: host !== null && fields.phase === 'open' && !host.roundRunning() && you() !== null,
    info: info(),
    away,
    timerSeconds: host?.timerSeconds() ?? client?.timerSeconds() ?? null,
  });

  const close = (): void => {
    if (!open) return;
    open = false;
    client?.leave();
    for (const listener of closeListeners) listener();
  };
  const subscribe = (listener: () => void): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };
  const leave = (): void => {
    close();
    shell.left();
  };
  const lobby: LobbyController = {
    isOpen: () => open && shown === 'lobby',
    state: lobbyState,
    subscribe,
    start: () => {
      if (host === null) return;
      fields.notice = null;
      const started = host.startRound();
      if (!started.ok) update({ notice: started.error });
    },
    toggleTimer: () => {
      host?.setTimer(host.timerSeconds() === null ? TUNABLES.SHOP_TIMER_SECONDS : null);
    },
    leave,
  };

  const act = (action: PlayerAction): string | null =>
    client === null ? 'noRound' : client.act(action);
  const hub: HubController = {
    isOpen: () => open && shown === 'hub' && inRound(),
    state: () => hubState(client, left, nudge),
    subscribe,
    bid: (bids: readonly Bid[]) => act({ kind: 'bid', bids }),
    scout: () => act({ kind: 'scout' }),
    signScouted: (unitId: UnitId) => act({ kind: 'signScouted', unitId }),
    release: (unitId: UnitId) => act({ kind: 'release', unitId }),
    move: (unitId: UnitId, to: Place) => act({ kind: 'move', unitId, to }),
    lockIn: () => (client === null ? 'noRound' : client.lockIn()),
    nudge: (crewId: CrewId) => {
      client?.nudge(crewId);
    },
    quitToTitle: leave,
  };

  const sitting: Sitting = {
    lobby,
    hub: () => (hub.isOpen() ? hub : null),
    found: (identity) => {
      client?.found(identity);
    },
    battleWatched: () => {
      if (shown === 'battle') showResult();
    },
    nextRound: () => {
      if (shown !== 'result') return;
      played = null;
      show({ kind: inRound() ? 'hub' : 'lobby' });
    },
    close,
  };

  return {
    sitting,
    changed,
    update,
    hasLeft: () => !open,
    onClose: (listener) => {
      closeListeners.push(listener);
    },
    connect: async (link, league, crewId) => {
      const connected = await connectLeagueClient(link, { saved: league, savedCrewId: crewId });
      if (!open) {
        if (connected.ok) connected.value.leave();
        return;
      }
      if (!connected.ok) {
        update({ phase: 'closed', notice: connected.error });
        return;
      }
      client = connected.value;
      if (role === 'guest') fields.phase = 'open';
      client.onEvent(onEvent);
      changed();
    },
  };
}

function crewName(client: LeagueClient | null, crewId: CrewId): string {
  return client?.league()?.crews.find((crew) => crew.id === crewId)?.identity.name ?? crewId;
}

/** Where each human crew of the running round is (§7 Slow players), in league order. */
function playerStatuses(client: LeagueClient | null, left: readonly CrewId[]): SittingPlayer[] {
  const round = client?.round() ?? null;
  if (round === null || client === null) return [];
  const { state, humans } = round;
  const status = (crewId: CrewId, bids: unknown): PlayerStatus => {
    if (left.includes(crewId)) return 'left';
    if (state.lockedIn.includes(crewId)) return 'lockedIn';
    if (state.bidding.ended) return 'shopping';
    return bids === null ? 'bidding' : 'bidIn';
  };
  return state.shops
    .filter((shop) => humans.includes(shop.crew.id))
    .map((shop) => ({
      crewId: shop.crew.id,
      name: shop.crew.identity.name,
      status: status(shop.crew.id, shop.bids),
      isYou: shop.crew.id === client.crewId(),
    }));
}

/** The hub's state from the client's copy of the running round. */
function hubState(
  client: LeagueClient | null,
  left: readonly CrewId[],
  nudge: SittingView['nudge'],
): HubState {
  const league = client?.league() ?? null;
  const round = client?.round() ?? null;
  const crewId = client?.crewId() ?? null;
  if (client === null || league === null || round === null || crewId === null) {
    throw new RangeError('hub: no round is open');
  }
  const players = playerStatuses(client, left);
  const waitingFor = players
    .filter(
      (player) => !player.isYou && (player.status === 'bidding' || player.status === 'shopping'),
    )
    .map((player) => player.name);
  return {
    league,
    round: round.state,
    crewId,
    start: round.start,
    lastAwards: round.lastAwards,
    sitting: {
      waitingFor,
      left: left.map((id) => crewName(client, id)),
      players,
      timerEndsAt: client.timer()?.endsAt ?? null,
      nudge,
    },
  };
}
