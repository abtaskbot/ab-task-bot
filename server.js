import express from "express";
import http from "http";
import WebSocket from "ws";
import { google } from "googleapis";

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

const PORT = process.env.PORT || 3000;
const BOT_NAME = "AB TASK";

// In-memory task store
let tasks = {}; // { username: { task, done } }
let completedCount = 0;

// Serve overlay files
app.use("/overlay", express.static("overlay"));

wss.on("connection", ws => {
  ws.send(JSON.stringify({
    type: "INIT",
    tasks,
    completedCount
  }));
});

function broadcast() {
  const data = JSON.stringify({
    type: "UPDATE",
    tasks,
    completedCount
  });
  wss.clients.forEach(c => c.readyState === 1 && c.send(data));
}

const youtube = google.youtube({
  version: "v3",
  auth: process.env.YT_API_KEY
});

// ⚠️ YOU WILL ADD LIVE_CHAT_ID LATER
const LIVE_CHAT_ID = process.env.LIVE_CHAT_ID;

async function pollChat() {
  if (!LIVE_CHAT_ID) return;

  const res = await youtube.liveChatMessages.list({
    liveChatId: LIVE_CHAT_ID,
    part: "snippet,authorDetails"
  });

  for (const msg of res.data.items) {
    const user = msg.authorDetails.displayName.toLowerCase();
    const text = msg.snippet.displayMessage.toLowerCase();

    if (text.startsWith("!add")) {
      if (tasks[user]) continue;
      const task = text.replace("!add", "").trim();
      if (!task) continue;
      tasks[user] = { task, done: false };
      broadcast();
    }

    if (text === "!done" && tasks[user]) {
      tasks[user].done = true;
      completedCount++;
      broadcast();
    }

    if (text === "!remove") {
      delete tasks[user];
      broadcast();
    }
  }

  setTimeout(pollChat, 5000);
}

pollChat();

app.get("/", (req, res) => {
  res.send("AB TASK bot is running");
});

server.listen(PORT, () => {
  console.log("AB TASK running on port", PORT);
});
