import { Telegraf, Context } from 'telegraf';
import Person from '@/models/Person';
import User from '@/models/User';
import dbConnect from '@/lib/mongoose';
import { autoGeocode } from '@/lib/geocode';

const BOT_TOKEN = process.env.BOT_TOKEN;

if (!BOT_TOKEN) {
  console.warn('BOT_TOKEN is not defined. Telegram bot functionality will not work.');
}

const bot = new Telegraf(BOT_TOKEN || 'dummy-token-to-prevent-crash');

// ─── Step-by-step submission state ───────────────────────────────────────────
type SubmissionStep = 'fullName' | 'status' | 'dob' | 'unit' | 'dateOfEvent' | 'locationOfEvent' | 'extraInfo' | 'confirm';

import BotSession from '@/models/BotSession';

// We'll keep the SubmissionState interface for types
interface SubmissionState {
  step: SubmissionStep;
  data: {
    fullName: string;
    status: string;
    dob: string;
    unit: string;
    dateOfEvent: string;
    locationOfEvent: string;
    extraInfo: string;
  };
}

const STEP_PROMPTS: Record<SubmissionStep, string> = {
  fullName: 'Крок 1 з 7.\nВведіть ПІБ (Прізвище Ім\'я По-батькові):\n\n*(Ви можете перервати заповнення в будь-який момент, надіславши /cancel)*',
  status: 'Крок 2 з 7.\nОберіть статус:\n\n1. Загинув\n2. Зник безвісти\n3. Полонений\n4. Невідомо\n\nВведіть відповідну цифру (від 1 до 4):',
  dob: 'Крок 3 з 7.\nВведіть дату народження (наприклад: 15.03.1990).\n\nЯкщо не знаєте, введіть "-" (дефіс).',
  unit: 'Крок 4 з 7.\nВведіть назву підрозділу або номер військової частини.\n\nЯкщо не знаєте, введіть "-".',
  dateOfEvent: 'Крок 5 з 7.\nВведіть дату події або зникнення.\n\nЯкщо не знаєте, введіть "-".',
  locationOfEvent: 'Крок 6 з 7.\nВведіть місце події (населений пункт, район, напрямок тощо).\n\nЯкщо не знаєте, введіть "-".',
  extraInfo: 'Крок 7 з 7.\nВведіть будь-яку додаткову інформацію: позивний, особливі прикмети, обставини події.\n\nЯкщо не знаєте, введіть "-".',
  confirm: '', // Generated dynamically
};

function formatStatusText(s: string): string {
  switch (s) {
    case 'KILLED': return 'Загинув';
    case 'MISSING': return 'Зник безвісти';
    case 'CAPTURED': return 'Полонений';
    default: return 'Невідомо';
  }
}

function parseStatus(input: string): string {
  switch (input.trim()) {
    case '1': return 'KILLED';
    case '2': return 'MISSING';
    case '3': return 'CAPTURED';
    case '4': return 'UNKNOWN';
    default: return '';
  }
}

function buildConfirmMessage(data: SubmissionState['data']): string {
  const dash = (v: string) => v && v !== '-' ? v : '—';
  return `Перевірте введені дані перед відправкою:\n\n` +
    `ПІБ:\n${data.fullName}\n\n` +
    `Статус:\n${formatStatusText(data.status)}\n\n` +
    `Дата народження:\n${dash(data.dob)}\n\n` +
    `Підрозділ:\n${dash(data.unit)}\n\n` +
    `Дата події:\n${dash(data.dateOfEvent)}\n\n` +
    `Місце події:\n${dash(data.locationOfEvent)}\n\n` +
    `Додаткова інформація:\n${dash(data.extraInfo)}\n\n` +
    `Все вірно? Введіть "так" для підтвердження, або "ні" щоб скасувати.`;
}

// ─── Commands ────────────────────────────────────────────────────────────────

bot.start(async (ctx) => {
  await dbConnect();
  await BotSession.deleteOne({ chatId: ctx.chat.id });
  ctx.reply(
    'Вітаю! Це бот проєкту «Пропащі».\n\n' +
    'З моєю допомогою ви можете шукати зниклих безвісти окупантів або повідомляти про них.\n\n' +
    'Команди:\n' +
    '/search [прізвище] — швидкий пошук\n' +
    '/submit — додати інформацію (покроково)\n' +
    '/cancel — скасувати поточне заповнення\n' +
    '/link [код] — підключити акаунт на сайті'
  );
});

bot.command('cancel', async (ctx) => {
  await dbConnect();
  const deleted = await BotSession.findOneAndDelete({ chatId: ctx.chat.id });
  if (deleted) {
    ctx.reply('Заповнення скасовано.');
  } else {
    ctx.reply('Немає активного заповнення.');
  }
});

// /submit starts the step-by-step flow
bot.command('submit', async (ctx) => {
  await dbConnect();
  await BotSession.findOneAndUpdate(
    { chatId: ctx.chat.id },
    {
      chatId: ctx.chat.id,
      step: 'fullName',
      data: { fullName: '', status: 'UNKNOWN', dob: '', unit: '', dateOfEvent: '', locationOfEvent: '', extraInfo: '' }
    },
    { upsert: true, new: true }
  );
  ctx.reply(STEP_PROMPTS.fullName, { parse_mode: 'Markdown' });
});

// /link command
bot.command('link', async (ctx) => {
  try {
    // @ts-ignore
    const message = ctx.message?.text || '';
    const token = message.split(' ').slice(1).join(' ').trim();
    
    if (!token) {
      return ctx.reply('Вкажіть токен. Наприклад: /link 123456');
    }

    await dbConnect();
    
    const user = await User.findOne({ telegramLinkToken: token });
    if (!user) {
      return ctx.reply('Недійсний токен. Згенеруйте новий на сайті у вашому профілі.');
    }

    user.telegramChatId = String(ctx.chat.id);
    user.telegramLinkToken = undefined; // clear token
    await user.save();

    ctx.reply('Ваш Telegram успішно підключено до акаунта на сайті! Тепер ви отримуватимете сюди сповіщення щодо ваших заявок.');
  } catch (error) {
    console.error('Bot link error:', error);
    ctx.reply('Сталася помилка при підключенні. Спробуйте пізніше.');
  }
});

// ─── Handle text messages (step-by-step + fallback) ──────────────────────────
bot.on('text', async (ctx) => {
  try {
    const text = ctx.message.text.trim();
    
    // Handle /search command with parameters
    if (text.startsWith('/search')) {
      const query = text.split(' ').slice(1).join(' ').trim();
      
      if (!query || query.length < 3) {
        return ctx.reply('Введіть принаймні 3 літери прізвища. Приклад: /search Іванов');
      }

      await dbConnect();
      
      // Auto-cancel any active session to prevent confusion
      await BotSession.deleteOne({ chatId: ctx.chat.id });
      
      const results = await Person.find({
        fullName: { $regex: query, $options: 'i' },
        isApproved: true
      }).limit(5).lean();

      if (results.length === 0) {
        return ctx.reply('За вашим запитом нічого не знайдено.');
      }

      let reply = `Знайдено ${results.length} записів:\n\n`;
      results.forEach((r: any, idx: number) => {
        const parts = r.fullName.split(' ').filter((p: string) => p.trim() !== '');
        let obfuscated = r.fullName;
        if (parts.length > 0) {
          const lastName = parts[0];
          const initials = parts.slice(1).map((part: string) => part[0].toUpperCase() + '.').join(' ');
          obfuscated = initials ? `${lastName} ${initials}` : lastName;
        }
        
        const status = formatStatusText(r.status);
        reply += `${idx + 1}. ${status}\nПІБ: ${obfuscated}\nДата події: ${r.dateOfEvent || '-'}\n\n`;
      });

      reply += 'Для більш детального пошуку скористайтеся сайтом.';
      return ctx.reply(reply);
    }
    
    // Ignore other unhandled commands
    if (text.startsWith('/')) return;

    await dbConnect();
    const chatId = ctx.chat.id;
    const session = await BotSession.findOne({ chatId });

    // If no active session
    if (!session) {
      // If user typed something that looks like a name (3+ letters, mostly Cyrillic), offer search
      if (text.length >= 3 && /[\p{L}]{3,}/u.test(text)) {
        // This looks like a name - offer search
        const results = await Person.find({
          fullName: { $regex: text, $options: 'i' },
          isApproved: true
        }).limit(3).lean();

        if (results.length > 0) {
          let reply = `Знайдено ${results.length} результатів:\n\n`;
          results.forEach((r: any, idx: number) => {
            const parts = r.fullName.split(' ').filter((p: string) => p.trim() !== '');
            let obfuscated = r.fullName;
            if (parts.length > 0) {
              const lastName = parts[0];
              const initials = parts.slice(1).map((part: string) => part[0].toUpperCase() + '.').join(' ');
              obfuscated = initials ? `${lastName} ${initials}` : lastName;
            }
            reply += `${idx + 1}. ${obfuscated}\n`;
          });
          reply += '\nДля більш детального пошуку напишіть: /search [прізвище]';
          return ctx.reply(reply);
        }
      }

      // Default fallback
      return ctx.reply('Використовуйте /submit для додавання запису або /search [прізвище] для пошуку.');
    }

    // ── Process current step ──
    const { step, data } = session;
    const skip = text === '-';

    switch (step) {
      case 'fullName': {
        if (text.length < 3) {
          return ctx.reply('Увага: ПІБ має бути не менше 3 символів. Спробуйте ще раз:');
        }
        session.data.fullName = text;
        session.step = 'status';
        await session.save();
        return ctx.reply(STEP_PROMPTS.status, { parse_mode: 'Markdown' });
      }

      case 'status': {
        const parsed = parseStatus(text);
        if (!parsed) {
          return ctx.reply('Невірне значення. Введіть цифру від 1 до 4:');
        }
        session.data.status = parsed;
        session.step = 'dob';
        await session.save();
        return ctx.reply(STEP_PROMPTS.dob, { parse_mode: 'Markdown' });
      }

      case 'dob': {
        session.data.dob = skip ? '' : text;
        session.step = 'unit';
        await session.save();
        return ctx.reply(STEP_PROMPTS.unit, { parse_mode: 'Markdown' });
      }

      case 'unit': {
        session.data.unit = skip ? '' : text;
        session.step = 'dateOfEvent';
        await session.save();
        return ctx.reply(STEP_PROMPTS.dateOfEvent, { parse_mode: 'Markdown' });
      }

      case 'dateOfEvent': {
        session.data.dateOfEvent = skip ? '' : text;
        session.step = 'locationOfEvent';
        await session.save();
        return ctx.reply(STEP_PROMPTS.locationOfEvent, { parse_mode: 'Markdown' });
      }

      case 'locationOfEvent': {
        session.data.locationOfEvent = skip ? '' : text;
        session.step = 'extraInfo';
        await session.save();
        return ctx.reply(STEP_PROMPTS.extraInfo, { parse_mode: 'Markdown' });
      }

      case 'extraInfo': {
        session.data.extraInfo = skip ? '' : text;
        session.step = 'confirm';
        await session.save();
        return ctx.reply(buildConfirmMessage(session.data), { parse_mode: 'Markdown' });
      }

      case 'confirm': {
        const answer = text.toLowerCase();
        if (answer === 'так' || answer === 'yes' || answer === 'да') {
          // Auto-geocode from location and extra info
          const geoText = [data.locationOfEvent, data.extraInfo].filter(Boolean).join(' ');
          const autoCoords = geoText ? await autoGeocode(geoText) : null;

          await Person.create({
            fullName: data.fullName,
            status: data.status,
            dob: data.dob || undefined,
            unit: data.unit || undefined,
            dateOfEvent: data.dateOfEvent || undefined,
            locationOfEvent: data.locationOfEvent || undefined,
            extraInfo: (data.extraInfo || '') + `\n\n[Додано через Telegram користувачем @${ctx.from.username || ctx.from.id}]`,
            coordinates: autoCoords || undefined,
            isApproved: false,
          });

          await sendNotificationToAdmin(`Нова заявка з Telegram!\nПІБ: ${data.fullName}\nСтатус: ${formatStatusText(data.status)}\nПеревірте панель модерації.`);

          await BotSession.deleteOne({ chatId });
          return ctx.reply('Дякуємо! Вашу інформацію успішно передано на модерацію.\nВона з\'явиться в базі після перевірки.');
        } else {
          await BotSession.deleteOne({ chatId });
          return ctx.reply('Заповнення скасовано. Щоб почати заново, введіть /submit');
        }
      }
    }
  } catch (error) {
    console.error('Bot text handler error:', error);
    await BotSession.deleteOne({ chatId: ctx.chat.id });
    ctx.reply('Сталася помилка. Спробуйте ще раз з /submit');
  }
});

// ─── Notification helpers ────────────────────────────────────────────────────

export const sendNotificationToAdmin = async (message: string) => {
  if (!BOT_TOKEN) return;
  
  try {
    // 1. Try environment variable first
    if (process.env.ADMIN_CHAT_ID) {
      await bot.telegram.sendMessage(process.env.ADMIN_CHAT_ID, message);
      return;
    }

    // 2. Fallback: send to all linked admins/moderators
    await dbConnect();
    const admins = await User.find({
      role: { $in: ['ADMIN', 'MODERATOR'] },
      telegramChatId: { $exists: true, $ne: null, $ne: '' }
    });

    if (admins.length > 0) {
      for (const admin of admins) {
        if (admin.telegramChatId) {
          await bot.telegram.sendMessage(admin.telegramChatId, message).catch(() => {});
        }
      }
    } else {
      console.warn('ADMIN_CHAT_ID is missing and no linked admins found. Admin notification skipped.');
    }
  } catch (err) {
    console.error('Failed to send telegram notification to admins:', err);
  }
};

export const sendNotificationToUser = async (chatId: string, message: string) => {
  if (!BOT_TOKEN || !chatId) return;
  try {
    await bot.telegram.sendMessage(chatId, message);
  } catch (err) {
    console.error(`Failed to send telegram notification to user ${chatId}:`, err);
  }
};

export default bot;
