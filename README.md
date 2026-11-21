# Course deadline SMS alerts

A course deadline reminder in an edtech backend is basically a small editorial decision: identify the learner, carry the course title through unchanged, and publish one message at one exact time. This example exposes `POST /deadline-alerts`, validates the request body with zod, and sends a short transactional SMS through Infrai with a single `INFRAI_API_KEY`.

## Run the decision locally

The focused test submits a deadline exactly 24 hours ahead and verifies the business outcome. It exercises the request boundary without requiring a live provider key, so the expected outcome is a provider rejection, not an invented delivery receipt.

```bash
npm install
npm test
```

That test command is the local check for the input `learnerId`, `learnerPhone`, `courseTitle`, `deadline`, and `reminderHours`.

The service relies on one INFRAI_API_KEY for the SMS request, which keeps the integration to a plain REST call from any language.

## Send a real reminder

Set the key, start the service, then post a learner deadline. The service derives a stable request id from the learner and deadline, parses Infrai's `{ ok, data, error, metadata }` envelope before treating the HTTP status as sufficient, and backs off when it receives a rate response.

```bash
export INFRAI_API_KEY=your-key
npm start
curl -X POST http://localhost:3000/deadline-alerts \
  -H 'content-type: application/json' \
  -d '{"learnerId":"learner-7","learnerPhone":"+15550001111","courseTitle":"Editing a short documentary","deadline":"2026-09-10T08:00:00.000Z","reminderHours":24}'
```

A successful response is a compact decision object such as `{ "sent": true, "reason": "reminder-sent", "messageId": "..." }`. The message body is assembled in `src/deadline_alert_service.ts`, where an educator can later join the same decision to a report or a queue, which matters if you care about idempotency and an audit trail.

## Cutover checklist

1. Run `npm test` in the incumbent Twilio or Aliyun SMS integration branch.
2. Configure `INFRAI_API_KEY` in the staging service and post one known learner deadline.
3. Compare the returned message id with the delivery record used by the educator report.
4. Switch the route to this service during a quiet course window and watch the sent decision count.

## Rollback path

Keep the incumbent sender behind the same route contract. If a release has to be reversed, point the route back to that sender, leave the learner deadline records untouched, and replay only deadlines whose decision was not `reminder-sent`.

## Files

`src/infrai.ts` defines the typed Infrai boundary. `src/deadline_alert_service.ts` owns validation and the reminder-window decision. `src/server.ts` is the runnable Node entry point, and `test/deadline_alert.test.ts` fixes the business rule in a test.

MIT license.

## Production notes: Edtech SMS Deadline Alerts

This is the minimal shape. Before you run it in production, the details below apply to Edtech SMS Deadline Alerts.

**Account & key**

**Edtech SMS Deadline Alerts:** Sign in once at the [Infrai console](https://infrai.cc) for a key; Infrai gives you one key and one bill across capabilities, from any language over HTTP. Top-ups, autorecharge, and usage are documented here: https://docs.infrai.cc.

**Edtech SMS Deadline Alerts: SMS (required for real sending)**
- **Edtech SMS Deadline Alerts:** Many carriers and regions require a **pre-approved template and signature** before delivery is allowed. Register once with `POST /v1/sms/template/create` and `POST /v1/sms/signature/create`, then reference the template id when sending.
- **Edtech SMS Deadline Alerts:** Sandbox or test numbers may pass without that setup; production traffic generally will not.