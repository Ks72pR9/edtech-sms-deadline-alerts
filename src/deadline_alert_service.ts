import { z } from "zod";
import { infrai, InfraiError } from "./infrai.js";

export const deadlineAlert = z.object({
  learnerId: z.string().min(1),
  learnerPhone: z.string().min(7),
  courseTitle: z.string().min(1),
  deadline: z.coerce.date(),
  reminderHours: z.number().int().positive().default(24)
});

export type DeadlineAlert = z.infer<typeof deadlineAlert>;
export type AlertDecision = { sent: boolean; reason: string; messageId?: string };

export async function sendDeadlineAlert(input: unknown, now = new Date()): Promise<AlertDecision> {
  const alert = deadlineAlert.parse(input);
  const hoursLeft = (alert.deadline.getTime() - now.getTime()) / 3_600_000;
  if (hoursLeft < 0 || hoursLeft > alert.reminderHours) {
    return { sent: false, reason: "outside-reminder-window" };
  }
  const message = `Reminder: ${alert.courseTitle} is due soon. Deadline: ${alert.deadline.toISOString()}`;
  try {
    const result = await infrai.sms.send({ to: alert.learnerPhone, body: message }, `deadline:${alert.learnerId}:${alert.deadline.toISOString()}`);
    return { sent: true, reason: "reminder-sent", messageId: result.message_id };
  } catch (error) {
    if (error instanceof InfraiError && error.status >= 400 && error.status < 500) {
      return { sent: false, reason: `provider-rejected:${error.code}` };
    }
    throw error;
  }
}
