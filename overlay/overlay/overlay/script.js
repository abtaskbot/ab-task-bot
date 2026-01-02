const SCROLL_SPEED = 25; // 👈 change later if needed

const ws = new WebSocket(
  location.origin.replace("http", "ws")
);

ws.onmessage = e => {
  const data = JSON.parse(e.data);

  const container = document.getElementById("task-container");
  container.innerHTML = "";

  Object.entries(data.tasks).forEach(([user, info]) => {
    const div = document.createElement("div");
    div.className = "task";
    div.style.animationDuration = `${SCROLL_SPEED}s`;
    div.innerText = `${user}: ${info.task} ${info.done ? "✔" : ""}`;
    container.appendChild(div);
  });

  document.getElementById("counter").innerText =
    `${data.completedCount} / ${Object.keys(data.tasks).length}`;
};
