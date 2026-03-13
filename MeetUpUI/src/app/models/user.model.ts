export interface User {
  id: string;
  username: string;
  isInCall: boolean;
  roomId?: string | null;
}
