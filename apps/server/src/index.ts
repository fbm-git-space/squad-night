import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import type { ClientMessage } from "@party/shared";
import { GameRoom } from "./room.js";

const PORT = Number(process.env.PORT) || 3001;
const rooms = new Map<string, GameRoom>();

const app = express();
app.use(cors({ origin: true }));
app.get("/", (_req, res) => {
  res.json({ ok: true, service: "squad-night-game-server" });
});
app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: true },
});

function getOrCreateRoom(code: string): GameRoom {
  const key = code.toUpperCase();
  let room = rooms.get(key);
  if (!room) {
    room = new GameRoom(key, io);
    rooms.set(key, room);
  }
  return room;
}

io.on("connection", (socket) => {
  const rawCode = socket.handshake.query.room;
  const roomCode = typeof rawCode === "string" ? rawCode : rawCode?.[0];
  if (!roomCode) {
    socket.emit("server", { type: "error", message: "Room code required" });
    socket.disconnect();
    return;
  }

  const room = getOrCreateRoom(roomCode);
  socket.join(room.code);

  socket.on("client", (message: ClientMessage) => {
    room.handleMessage(socket, message);
  });

  socket.on("disconnect", () => {
    room.handleDisconnect(socket);
    if (room.isEmpty()) {
      rooms.delete(room.code);
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Game server listening on port ${PORT}`);
});
