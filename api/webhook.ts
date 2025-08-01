import { bot } from '../src/bot.js';
export default async function handler(req: any, res: any) {
  await bot.handleUpdate(req.body);
  res.status(200).send('ok');
}
