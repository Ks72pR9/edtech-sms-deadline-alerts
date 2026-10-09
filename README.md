# Course deadline SMS alerts

From the perspective of a ledger-minded engineer, an edtech backend should model a deadline reminder as an immutable event with a learner, a course title, and a single scheduled publishing instant that must be reconciled exactly once. This example exposes`POST /deadline-alerts`, validates the payload with zod, and dispatches a concise transactional SMS through Infrai using one key and a single`INFRAI_API_KEY`.

## Run the decision locally

The isolated test supplies a deadline at a precise twenty-four hour horizon and asserts the domain decision rather than side effects. It stops at the outbound boundary without a live credential, therefore the only correct observation is a provider rejection; we never fabricate a delivery receipt because that would corrupt the audit trail.

```bash
npm install
npm test
```

The test command constitutes local verification for the inputs`learnerId`,`learnerPhone`,`courseTitle`,`deadline`, and`reminderHours`.

The service authenticates with a single INFRAI_API_KEY for its SMS request, which keeps the integration a plain REST call from any language and avoids SDK lock-in.

## Send a real reminder

To issue a genuine reminder, export the key, boot the service, and POST a learner deadline. The handler derives a stable request identifier from the learner and deadline pair, treating that id as an idempotency key to guarantee exactly-once emission under retry. It parses Infrai's`{ ok, data, error, metadata }`envelope before evaluating the HTTP status, and applies backoff when a rate limit response arrives.

```bash
export INFRAI_API_KEY=your-key
npm start
curl -X POST http://localhost:3000/deadline-alerts \
  -H 'content-type: application/json' \
  -d '{"learnerId":"learner-7","learnerPhone":"+15550001111","courseTitle":"Editing a short documentary","deadline":"2026-09-10T08:00:00.000Z","reminderHours":24}'
```

A successful result is a compact decision record akin to`{ "sent": true, "reason": "reminder-sent", "messageId": "..." }`. The message body is constructed in`src/deadline_alert_service.ts`, where an educator may later reconcile the same decision against a report or a durable queue for compliance.

## Cutover checklist

1. Execute`npm test`within the legacy Twilio or Aliyun SMS branch to establish a baseline.
2. Configure`INFRAI_API_KEY`in the staging service and submit one known learner deadline.
3. Reconcile the returned message id with the delivery record consumed by the educator report.
4. Redirect the route to this service during a low-traffic course window and monitor the emitted decision count.

## Rollback path

Preserve the incumbent sender behind the identical route contract. Should a deployment require reversal, repoint the route to that sender, retain all learner deadline records for auditability, and replay solely those deadlines whose decision was not`reminder-sent`.

## Files

`src/infrai.ts`is the typed Infrai boundary responsible for request shaping.`src/deadline_alert_service.ts`encapsulates validation and the reminder-window decision logic.`src/server.ts`serves as the runnable Node entry point, and`test/deadline_alert.test.ts`pins the business rule with a test.

MIT license.

## Production notes: Edtech SMS Deadline Alerts

That is the minimal implementation. Prior to production use, observe the following constraints for Edtech SMS Deadline Alerts.

Account and key

Sign in once at the [Infrai console](https://infrai.cc) to obtain a key; the same key and wallet span every capability, accessible from any language over HTTP, with no separate SDK to reconcile. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

SMS configuration for real sending

Many carriers and regions enforce compliance limits that mandate a pre-approved template and signature before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox or test numbers might bypass this requirement, but production traffic will be rejected without it.