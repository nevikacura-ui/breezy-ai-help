# Actually deliver reminder notifications

Right now people can switch notifications on, but nothing in AskEasy ever sends one. Reminders are saved to the database and then just sit there. This plan makes a reminder actually arrive — as a phone/desktop notification, with email as a backup.

## What the user will experience

1. They ask Eazy to remind them about something at a time.
2. At that time, a notification pops up on every device where they turned notifications on.
3. Tapping it opens AskEasy.
4. If they have no device registered, they get the reminder by email instead.
5. The reminder is marked done so it never fires twice.

## How it works

- A new internal endpoint at `src/routes/api/public/cron/reminders.ts` runs the delivery pass. It is protected by a shared secret header — callers without it get a 401 and nothing runs.
- The endpoint uses privileged database access to find every reminder that is `open` and whose due time has passed (with a small look-back window so nothing is skipped).
- For each one it looks up that user's registered devices and sends through the existing Firebase gateway (the same call `sendPushToMe` already makes, moved into a shared helper in `src/lib/push-send.server.ts` so both paths use one implementation).
- Dead device tokens returned by Firebase are deleted, so the list stays clean.
- If a user has no devices, the reminder goes out by email using the existing Resend helper.
- Each delivered reminder is flipped to `sent` in the same pass, so repeats are impossible.

## Scheduling

A scheduled database job runs the endpoint every minute against the stable app URL. This needs one migration to enable the scheduler and register the job, plus one new secret (`CRON_SECRET`) that both the job and the endpoint share.

## Also included

- `sendPushToMe` is rewired onto the shared helper so there is one sender, not two.
- A short "Send test notification" action next to the notifications switch in Settings, so a user can confirm delivery works on their device right after turning it on.

## Not included

- Push for chat replies while the app is closed (there is no background reply generation yet).
- Recurring/repeating reminders.
