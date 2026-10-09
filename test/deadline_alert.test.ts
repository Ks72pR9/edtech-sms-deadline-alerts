import assert from "node:assert/strict";
import { sendDeadlineAlert } from "../src/deadline_alert_service.js";

const now = new Date("2026-09-09T08:00:00.000Z");
const result = await sendDeadlineAlert({
  learnerId: "learner-7",
  learnerPhone: "+15550001111",
  courseTitle: "Editing a short documentary",
  deadline: "2026-09-11T08:00:00.000Z",
  reminderHours: 24
}, now);

assert.equal(result.sent, false);
assert.equal(result.reason, "outside-reminder-window");
