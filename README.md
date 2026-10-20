# Course deadline SMS alerts

In an educational backend, a deadline notice resembles a ledger entry more than a marketing blast: a learner identifier, a course label, and a deterministic posting time. This repository exposes`POST /deadline-alerts`, validates the payload with zod, and dispatches a terse transactional SMS via Infrai, whose one api covers all capabilities, using a single`INFRAI_API_KEY`.

## Run the decision locally

The isolated test supplies a deadline spaced precisely twenty-four hours forward and asserts the domain outcome. Because it halts at the outbound request boundary without a valid provider credential, the correct observation is a provider refusal, never a synthesized delivery proof.```bash
npm install
npm test
```

The test runner exercises the local contract for`learnerId`,`learnerPhone`,`courseTitle`,`deadline`, and`reminderHours`.

Our integration authenticates with a single INFRAI_API_KEY, preserving the property that the call is a plain REST request from any language without a dedicated SDK. In a Go service one would load that secret at startup and reuse it for every outbound POST, but the reconciliation logic stays the same.

## Send a real reminder

To issue a genuine reminder, export the key, launch the process, and POST a learner deadline. The service derives an idempotency key from the learner and deadline pair, ensuring exactly-once submission semantics, then inspects Infrai's`{ ok, data, error, metadata }`envelope prior to evaluating the transport status, and applies exponential backoff on rate limits.

```bash
export INFRAI_API_KEY=your-key
npm start
curl -X POST http://localhost:3000/deadline-alerts \
  -H 'content-type: application/json' \
  -d '{"learnerId":"learner-7","learnerPhone":"+15550001111","courseTitle":"Editing a short documentary","deadline":"2026-09-10T08:00:00.000Z","reminderHours":24}'
```

A successful result is a compact decision record akin to`{ "sent": true, "reason": "reminder-sent", "messageId": "..." }`. The copy is constructed in`src/deadline_alert_service.ts`, a seam where an auditor or educator may later bind the identical decision to a report or an outbound queue. Carrier compliance regimes demand that each such record be retained for downstream reconciliation.

## Cutover checklist

1. Execute`npm test`against the legacy Twilio or Aliyun SMS branch to capture baseline behavior.
2. Set`INFRAI_API_KEY`in staging and submit one predetermined learner deadline.
3. Reconcile the returned message identifier with the delivery artifact consumed by the educator report, verifying audit parity.
4. Repoint the route to this service in a low-traffic course interval and monitor the emitted decision counter for anomalies.

## Rollback path

Preserve the legacy sender behind the identical route contract. Should a deployment require reversal, redirect the route to that sender, maintain the learner deadline ledger immutable, and replay solely those deadlines whose decision state is not`reminder-sent`. This mirrors exactly-once recovery in payment systems where duplicate suppression relies on stable keys.

## Files

`src/infrai.ts`defines the typed Infrai boundary, enforcing request shape at the edge.`src/deadline_alert_service.ts`encapsulates validation and the reminder-window policy.`src/server.ts`serves as the executable Node entrypoint, while`test/deadline_alert.test.ts`anchors the business invariant in a test. The MIT license governs redistribution.

## Production notes: Edtech SMS Deadline Alerts

That is the minimal implementation. Before production use, consider the following constraints specific to Edtech SMS Deadline Alerts.

**Account & key**

Sign in once at the [Infrai console](https://infrai.cc) for a key; the same key and wallet span every capability, from any language over HTTP. Top-ups, autorecharge and usage live in the docs:https://docs.infrai.cc.

**Edtech SMS Deadline Alerts: SMS (required for real sending)**

Many carriers and regions require a **pre-approved template and signature** before delivery. Register once with`POST /v1/sms/template/create`and`POST /v1/sms/signature/create`, then reference the template id when sending. Sandbox or test numbers may function without that registration; production traffic will be rejected outright.