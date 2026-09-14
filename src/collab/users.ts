export type CollabUser = {
  id: string;
  username: string;
  color: string;
};

export const COLLAB_USERS: CollabUser[] = [
  {
    id: "alice",
    username: "Alice",
    color: "#e11d48",
  },
  {
    id: "bob",
    username: "Bob",
    color: "#2563eb",
  },
  {
    id: "cara",
    username: "Cara",
    color: "#059669",
  },
];

export const DEFAULT_USER = COLLAB_USERS[0];

export const DEFAULT_ROOM_ID = "text-editor-sandbox-basic";
export const DENTAL_ROOM_ID = "text-editor-sandbox-odtp";

export function resolveUser(userId: string | undefined): CollabUser {
  return (
    COLLAB_USERS.find((candidate) => candidate.id === userId) ?? DEFAULT_USER
  );
}
