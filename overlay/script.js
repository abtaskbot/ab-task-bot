import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import fetch from "node-fetch";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const PORT = process.env.PORT || 3000;
const YT_API_KEY = process.env.YT_API_KEY;
const LIVE_CHAT_ID = process.env.LIVE_CHAT_ID;

let tasks = {};
let completedCount = 0;

// Serve overlay files
app.use("/overlay", express.static("overlay"));

// WebSocket connection for overlay
wss.on("connection", ws => {
  ws.send(JSON.stringify({ tasks, completedCount }));
});

// Broadcast updates to overlay
function broadcast() {
  const data = JSON.stringify({ tasks, completedCount });
  wss.clients.forEach(client => {
    if (client.readyState === 1) {
      client.send(data);
    }
  });
}

// Poll YouTube live chat
async function pollChat() {
  if (!YT_API_KEY || !LIVE_CHAT_ID) return;

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/liveChat/messages?liveChatId=${LIVE_CHAT_ID}&part=snippet,authorDetails&key=${YT_API_KEY}`
    );

    const data = await res.json();
    if (!data.items) return;

    for (const msg of data.items) {
      const user = msg.authorDetails.displayName.toLowerCase();
      const text = msg.snippet.displayMessage.toLowerCase();

      // !add task
      if (text.startsWith("!add ")) {
        if (!tasks[user]) {
          tasks[user] = { task: text.replace("!add ", ""), done: false };
          broadcast();
        }
      }

      // !done
      if (text === "!done" && tasks[user] && !tasks[user].done) {
        tasks[user].done = true;
        completedCount++;
        broadcast();
      }

      // !remove
      if (text === "!remove" && tasks[user]) {
        delete tasks[user];
        broadcast();
      }
    }
  } catch (err) {
    console.error("Chat poll error:", err.message);
  }
}

// Poll every 5 seconds
setInterval(pollChat, 5000);

server.listen(PORT, () => {
  console.log(`AB TASK running on port ${PORT}`);
});
