/** What to tell the player when an action is refused, by the reason code `core/` returns. */

const PROBLEMS: Readonly<Record<string, string>> = {
  biddingOpen: 'Finish the bidding rounds first.',
  biddingEnded: 'The bidding is over for this round.',
  cannotAffordPayroll: 'Your wallet can’t cover the payroll. Release or bench someone.',
  notEnoughGold: 'Not enough gold.',
  breaksBids: 'That would break one of your open bids.',
  belowAsk: 'A bid must be at least the asking price.',
  duplicateBid: 'You already bid on that unit.',
  noPlace: 'No free slot or bench place for that unit.',
  cannotAfford: 'Your bids plus the payroll would be more than your wallet.',
  unknownUnit: 'That unit isn’t available any more.',
  wrongRole: 'MCs go in MC slots, support units in support slots.',
  benchFull: 'The bench is full.',
  noSuchPlace: 'There is no such place.',
  lockedIn: 'You are locked in for this round.',
  unknownCrew: 'Your crew isn’t in this round.',
  noRound: 'No round is open.',
  empty: 'Your crew needs a name.',
  tooLong: 'That name is too long.',
  taken: 'Another crew already has that name.',
  notJson: 'The saved league is damaged and can’t be loaded.',
  notASave: 'The saved data isn’t a Mic Drop League save.',
  newerVersion: 'The saved league is from a newer version of the game.',
  invalid: 'The saved league is damaged and can’t be loaded.',
  unavailable: 'This browser blocks storage, so the league can’t be saved.',
  noPlayer: 'The saved league has no player crew.',
};

export function problemText(reason: string): string {
  return PROBLEMS[reason] ?? `That didn’t work (${reason}).`;
}
