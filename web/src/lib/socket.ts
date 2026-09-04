import { io, type Socket } from "socket.io-client";
import { useAuthStore } from "../store/auth";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io({
      path: "/socket.io",
      autoConnect: false,
      auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
    });
  }
  return socket;
}

export function joinEventRoom(eventId: string) {
  const s = getSocket();
  if (!s.connected) s.connect();
  s.emit("join-event", eventId);
}

export function leaveEventRoom(eventId: string) {
  if (socket?.connected) socket.emit("leave-event", eventId);
}
