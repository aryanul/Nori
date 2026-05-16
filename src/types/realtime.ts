export type UserIdentity = {
  id: string;
  name: string;
  color: string;
};

export type PeerCursor = {
  x: number;
  y: number;
};

export type PeerState = {
  clientId: number;
  user: UserIdentity;
  cursor: PeerCursor | null;
};
