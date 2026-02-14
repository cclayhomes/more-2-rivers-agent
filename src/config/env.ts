import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const schema = z.object({
  PORT: z.string().default('3000'),
  DATABASE_URL: z.string().default('file:./prisma/dev.db'),
  TWILIO_ACCOUNT_SID: z.string().optional(),
  TWILIO_AUTH_TOKEN: z.string().optional(),
  TWILIO_FROM_NUMBER: z.string().optional(),
  APPROVER_PHONE: z.string().optional(),
  FB_PAGE_ID: z.string().optional(),
  FB_PAGE_ACCESS_TOKEN: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  BASE_URL: z.string().default('http://localhost:3000'),
  GOOGLE_SHEETS_ID: z.string().optional(),
  GOOGLE_SERVICE_ACCOUNT_EMAIL: z.string().optional(),
  GOOGLE_PRIVATE_KEY: z.string().optional()
});

export const env = schema.parse(process.env);
