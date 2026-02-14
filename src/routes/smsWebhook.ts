import { Router } from 'express';
import { approveDraft, rejectDraft } from '../services/draftService';
import { parseSmsCommand } from '../utils/sms';

const router = Router();

router.post('/twilio/inbound', async (req, res) => {
  const body = String(req.body.Body || '');
  const command = parseSmsCommand(body);

  try {
    if (command.action === 'APPROVE') {
      await approveDraft(command.draftId);
      return res.type('text/xml').send('<Response><Message>Draft approved and posted.</Message></Response>');
    }

    if (command.action === 'REJECT') {
      await rejectDraft(command.draftId);
      return res.type('text/xml').send('<Response><Message>Draft rejected.</Message></Response>');
    }

    return res.type('text/xml').send('<Response><Message>Unknown command. Use A#ID or R#ID.</Message></Response>');
  } catch (error) {
    return res.type('text/xml').status(500).send('<Response><Message>Could not process request.</Message></Response>');
  }
});

export default router;
