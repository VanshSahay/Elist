import { bot } from '../src/bot';
import { VercelRequest, VercelResponse } from '@vercel/node';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  await bot.handleUpdate(req.body);
  res.status(200).send('ok');
}
