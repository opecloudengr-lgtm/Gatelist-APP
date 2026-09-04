import type { Server as IOServer } from "socket.io";

let io: IOServer | undefined;

export function setIO(server: IOServer) {
  io = server;
}

export function eventRoom(eventId: string): string {
  return `event:${eventId}`;
}

export function emitToEvent(eventId: string, event: string, payload: unknown) {
  io?.to(eventRoom(eventId)).emit(event, payload);
}
