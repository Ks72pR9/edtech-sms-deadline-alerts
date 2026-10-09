import { createServer } from "node:http";
import { sendDeadlineAlert } from "./deadline_alert_service.js";

const server = createServer(async (request, response) => {
  if (request.method !== "POST" || request.url !== "/deadline-alerts") {
    response.writeHead(404).end("Not found");
    return;
  }
  let raw = "";
  for await (const chunk of request) raw += chunk;
  try {
    const decision = await sendDeadlineAlert(JSON.parse(raw));
    response.writeHead(decision.sent ? 202 : 200, { "Content-Type": "application/json" }).end(JSON.stringify(decision));
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invalid request";
    response.writeHead(400, { "Content-Type": "application/json" }).end(JSON.stringify({ error: message }));
  }
});

server.listen(Number(process.env.PORT ?? 3000), () => console.log("deadline alert service listening"));
