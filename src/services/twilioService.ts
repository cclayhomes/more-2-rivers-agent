import twilio from 'twilio';
import { env } from '../config/env';

const hasTwilio =
  env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM_NUMBER && env.APPROVER_PHONE;

const client = hasTwilio
  ? twilio(env.TWILIO_ACCOUNT_SID as string, env.TWILIO_AUTH_TOKEN as string)
  : null;

export const sendApprovalRequestSms = async (draftId: string, headline: string) => {
  if (!client || !env.APPROVER_PHONE || !env.TWILIO_FROM_NUMBER) {
    console.warn('Twilio not configured, skipping SMS send.');
    return;
  }

  await client.messages.create({
    body: `More 2 Rivers draft ready (#${draftId}): ${headline}. Reply A${draftId} to approve or R${draftId} to reject.`,
    to: env.APPROVER_PHONE,
    from: env.TWILIO_FROM_NUMBER
  });
};
