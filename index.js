require('dotenv').config();
const TelegramBot = require('node-telegram-bot-api');
const fs = require('fs');
const path = require('path');

// Load environment variables
const BOT_TOKEN = process.env.BOT_TOKEN;
const ADMIN_ID = parseInt(process.env.ADMIN_ID);
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!BOT_TOKEN || !ADMIN_ID || !ADMIN_PASSWORD) {
  console.error('❌ .env faylida BOT_TOKEN, ADMIN_ID va ADMIN_PASSWORD sozlang!');
  process.exit(1);
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

const DATA_DIR = path.join(__dirname, 'data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const PENDING_FILE = path.join(DATA_DIR, 'pending_users.json');
const LOGS_FILE = path.join(DATA_DIR, 'logs.json');
const TEST_HISTORY_FILE = path.join(DATA_DIR, 'test_history.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const initFile = (filePath, defaultData = {}) => {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(defaultData, null, 2));
  }
};

initFile(USERS_FILE, {});
initFile(PENDING_FILE, {});
initFile(LOGS_FILE, []);
initFile(TEST_HISTORY_FILE, {});

const readJSON = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const writeJSON = (filePath, data) => fs.writeFileSync(filePath, JSON.stringify(data, null, 2));

const log = (userId, action, details = {}) => {
  const logs = readJSON(LOGS_FILE);
  logs.push({
    timestamp: new Date().toISOString(),
    userId,
    action,
    details
  });
  writeJSON(LOGS_FILE, logs);
};

const userSessions = {};

const TESTS_DB = require('./database/tests');

const getMainMenu = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '🌐 HTML', callback_data: 'section_HTML' }, { text: '🎨 CSS', callback_data: 'section_CSS' }],
      [{ text: '⚡ JavaScript', callback_data: 'section_JS' }, { text: '📦 GIT', callback_data: 'section_GIT' }],
      [{ text: '💻 BASH', callback_data: 'section_BASH' }],
      [{ text: '📊 Mening natijalarim', callback_data: 'my_results' }],
      [{ text: 'ℹ️ Yordam', callback_data: 'help' }]
    ]
  }
});

const getDifficultyMenu = (section) => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '😊 Oson', callback_data: `test_${section}_easy` }],
      [{ text: '🔥 Qiyin', callback_data: `test_${section}_difficult` }],
      [{ text: '⬅️ Orqaga', callback_data: 'back_main' }]
    ]
  }
});

const getAdminMenu = () => ({
  reply_markup: {
    inline_keyboard: [
      [{ text: '👥 Foydalanuvchilar', callback_data: 'admin_users' }],
      [{ text: '📝 Testlar', callback_data: 'admin_tests' }],
      [{ text: '❓ Savollar', callback_data: 'admin_questions' }],
      [{ text: '📊 Statistika', callback_data: 'admin_statistics' }],
      [{ text: '💾 Zaxira nusxa', callback_data: 'admin_backup' }],
      [{ text: '📊 Loglar', callback_data: 'admin_logs' }],
      [{ text: '🚪 Chiqish', callback_data: 'admin_logout' }]
    ]
  }
});

const isUserApproved = (userId) => {
  const users = readJSON(USERS_FILE);
  return users[userId] && users[userId].approved;
};

const isUserPending = (userId) => {
  const pending = readJSON(PENDING_FILE);
  return pending[userId] !== undefined;
};

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  log(userId, 'start_command');

  if (isUserApproved(userId)) {
    bot.sendMessage(chatId, '🎉 Xush kelibsiz! Test bo\'limini tanlang:', getMainMenu());
    return;
  }

  if (isUserApproved(userId)) {
    bot.sendMessage(chatId, '🎉 Xush kelibsiz! Test bo\'limini tanlang:', getMainMenu());
    return;
  }

  if (isUserPending(userId)) {
    bot.sendMessage(chatId, '⏳ Arizangiz ko\'rib chiqilmoqda. Admin javobini kuting.');
    return;
  }

  userSessions[userId] = { step: 'awaiting_fullname' };
  bot.sendMessage(chatId, '🎉 Assalomu alaykum! Test botiga xush kelibsiz!\n\nIsmingiz va familiyangizni kiriting:');
});

// Add new commands for users
bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const helpText = `ℹ️ Yordam

Har bir test 20 savol, har biriga 20 soniya.

📝 Asosiy buyruqlar:
/start - Bosh menyuga qaytish
/help - Yordam
/stats - Statistikangiz
/profile - Profilingiz

📊 Taraqqiyot:
/history - To\'liq test tarixi
/retry - Oxirgi testni qayta topshirish
/progress - Bo\'limlar bo\'yicha taraqqiyot
/compare - O\'rtacha bilan taqqoslash

🏆 Reyting:
/leaderboard - Eng yuqori natijalar
/rankings HTML - HTML bo\'yicha reyting
/rankings CSS - CSS bo\'yicha reyting
/rankings JS - JavaScript bo\'yicha
/rankings GIT - GIT bo\'yicha
/rankings BASH - BASH bo\'yicha

⚙️ Boshqalar:
/feedback - Fikr bildirish
/settings - Sozlamalar
/faq - Ko\'p so\'raladigan savollar
/contact - Bog\'lanish
/about - Bot haqida`;
  
  bot.sendMessage(chatId, helpText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

// Additional user commands
bot.onText(/\/faq/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  bot.sendMessage(chatId, '❓ Tez-tez so\'raladigan savollar\n\n' +
    '1️⃣ Test qancha davom etadi?\n' +
    '   ➡️ Har bir test 20 savol, har biriga 20 soniya.\n\n' +
    '2️⃣ Natijalarni qanday ko\'rish mumkin?\n' +
    '   ➡️ /stats buyrug\'i orqali.\n\n' +
    '3️⃣ Testni yakunlash mumkinmi?\n' +
    '   ➡️ Ha, test paytida "Testni yakunlash" tugmasini bosing.\n\n' +
    '4️⃣ Ro\'yxatdan o\'tish uchun nima qilish kerak?\n' +
    '   ➡️ /start buyrug\'ini bosib, so\'ralgan ma\'lumotlarni kiriting.', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

bot.onText(/\/contact/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  bot.sendMessage(chatId, '📞 Bog\'lanish\n\n' +
    'Savollar va takliflar uchun:\n' +
    'Telegram: @admin\n' +
    'Email: admin@example.com\n' +
    'Tel: +998 90 123 45 67', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✉️ Xabar yuborish', callback_data: 'send_message_admin' }],
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

bot.onText(/\/about/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  bot.sendMessage(chatId, '📱 Bot haqida\n\n' +
    'Bu bot dasturlash bo\'yicha bilimlaringizni tekshirish uchun yaratilgan.\n\n' +
    'Versiya: 2.0\n' +
    'Yaratilgan: 2023\n' +
    'Dasturchi: @developer', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

bot.onText(/\/stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const history = readJSON(TEST_HISTORY_FILE);
  const userHistory = history[userId] || [];
  
  if (!userHistory.length) {
    return bot.sendMessage(chatId, '📊 Siz hali test topshirmagansiz.');
  }
  
  const totalTests = userHistory.length;
  const avgScore = userHistory.reduce((sum, test) => sum + test.percentage, 0) / totalTests;
  
  bot.sendMessage(chatId, `📊 Statistikangiz:\n\n📋 Jami testlar: ${totalTests}\n📈 O'rtacha ball: ${avgScore.toFixed(1)}%`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

bot.onText(/\/profile/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const users = readJSON(USERS_FILE);
  const user = users[userId];
  
  if (!user) {
    return bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi.');
  }
  
  bot.sendMessage(chatId, `👤 Profilingiz:

Ism: ${user.fullname}
ID: ${userId}
Username: @${user.username || 'Yo\'q'}
Ro\'yxatdan o\'tgan: ${new Date(user.approvedAt).toLocaleString('uz-UZ')}`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

// Implement leaderboard command
bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const users = readJSON(USERS_FILE);
  const history = readJSON(TEST_HISTORY_FILE);
  const userStats = [];
  
  // Calculate stats for each user
  Object.keys(users).forEach(uid => {
    if (users[uid].approved) {
      const userTests = history[uid] || [];
      const totalTests = userTests.length;
      
      if (totalTests > 0) {
        const averageScore = userTests.reduce((sum, test) => sum + test.percentage, 0) / totalTests;
        userStats.push({
          userId: uid,
          name: users[uid].fullname,
          averageScore: averageScore,
          totalTests: totalTests
        });
      }
    }
  });
  
  // Sort by average score
  userStats.sort((a, b) => b.averageScore - a.averageScore);
  
  // Take top 10
  const topUsers = userStats.slice(0, 10);
  
  let message = '🏆 Eng yuqori natijalar\n\n';
  topUsers.forEach((user, index) => {
    message += `${index + 1}. ${user.name}: ${user.averageScore.toFixed(1)}% (${user.totalTests} test)\n`;
  });
  
  if (topUsers.length === 0) {
    message = '📊 Hali natijalar yo\'q';
  }
  
  bot.sendMessage(chatId, message, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

// Implement feedback command
bot.onText(/\/feedback/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  userSessions[userId] = { step: 'awaiting_feedback' };
  bot.sendMessage(chatId, '💬 Fikr va takliflaringizni yuboring:', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔙 Bekor qilish', callback_data: 'back_main' }]
      ]
    }
  });
});

// Implement settings command
bot.onText(/\/settings/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  bot.sendMessage(chatId, '⚙️ Sozlamalar', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '🔄 Profilni yangilash', callback_data: 'update_profile' }],
        [{ text: '🔔 Bildirishnomalar', callback_data: 'notifications' }],
        [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
      ]
    }
  });
});

// History command
bot.onText(/\/history/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const history = readJSON(TEST_HISTORY_FILE);
  const userHistory = history[userId] || [];
  
  if (!userHistory.length) {
    return bot.sendMessage(chatId, '📊 Test tarixi yo\'q.');
  }
  
  let text = '📊 Testlar tarixi:\n\n';
  userHistory.slice(-20).reverse().forEach((t, i) => {
    text += `${i + 1}. ${t.section} (${t.difficulty === 'easy' ? 'Oson' : 'Qiyin'})\n`;
    text += `   ✅ ${t.correct}/${t.total} (${t.percentage}%)\n`;
    text += `   📅 ${new Date(t.timestamp).toLocaleString('uz-UZ')}\n\n`;
  });
  
  bot.sendMessage(chatId, text, getMainMenu());
});

// Retry last test command
bot.onText(/\/retry/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const history = readJSON(TEST_HISTORY_FILE);
  const userHistory = history[userId] || [];
  
  if (!userHistory.length) {
    return bot.sendMessage(chatId, '❌ Siz hali test topshirmadingiz.');
  }
  
  const lastTest = userHistory[userHistory.length - 1];
  
  bot.sendMessage(chatId, `🔄 Oxirgi testni qayta topshirish:

📚 ${lastTest.section}
🔥 ${lastTest.difficulty === 'easy' ? 'Oson' : 'Qiyin'}

Boshlashni xohlaysizmi?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Ha, boshlash', callback_data: `test_${lastTest.section}_${lastTest.difficulty}` }],
        [{ text: '❌ Yo\'q', callback_data: 'back_main' }]
      ]
    }
  });
});

// Rankings by section
bot.onText(/\/rankings (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const section = match[1].toUpperCase();
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  if (!['HTML', 'CSS', 'JS', 'GIT', 'BASH'].includes(section)) {
    return bot.sendMessage(chatId, '❌ Noto\'g\'ri bo\'lim. Foydalanish: /rankings HTML');
  }
  
  const users = readJSON(USERS_FILE);
  const history = readJSON(TEST_HISTORY_FILE);
  const userStats = [];
  
  Object.keys(users).forEach(uid => {
    if (users[uid].approved) {
      const userTests = history[uid] || [];
      const sectionTests = userTests.filter(t => t.section === section);
      
      if (sectionTests.length > 0) {
        const avgScore = sectionTests.reduce((sum, test) => sum + test.percentage, 0) / sectionTests.length;
        userStats.push({
          userId: uid,
          name: users[uid].fullname,
          averageScore: avgScore,
          totalTests: sectionTests.length
        });
      }
    }
  });
  
  userStats.sort((a, b) => b.averageScore - a.averageScore);
  const topUsers = userStats.slice(0, 10);
  
  let message = `🏆 ${section} bo\'yicha reyting\n\n`;
  topUsers.forEach((user, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
    message += `${medal} ${user.name}: ${user.averageScore.toFixed(1)}% (${user.totalTests} test)\n`;
  });
  
  if (topUsers.length === 0) {
    message = `📊 ${section} bo\'yicha hali natijalar yo\'q`;
  }
  
  bot.sendMessage(chatId, message, getMainMenu());
});

// Compare with average
bot.onText(/\/compare/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const history = readJSON(TEST_HISTORY_FILE);
  const userHistory = history[userId] || [];
  
  if (!userHistory.length) {
    return bot.sendMessage(chatId, '❌ Siz hali test topshirmadingiz.');
  }
  
  // Calculate user's average
  const userAvg = userHistory.reduce((sum, test) => sum + test.percentage, 0) / userHistory.length;
  
  // Calculate global average
  let totalTests = 0;
  let totalScore = 0;
  
  Object.values(history).forEach(userTests => {
    userTests.forEach(test => {
      totalTests++;
      totalScore += test.percentage;
    });
  });
  
  const globalAvg = totalTests > 0 ? totalScore / totalTests : 0;
  
  const diff = userAvg - globalAvg;
  const comparison = diff > 0 ? `👍 ${diff.toFixed(1)}% yuqori` : diff < 0 ? `👎 ${Math.abs(diff).toFixed(1)}% past` : '🎯 Bir xil';
  
  let message = `📊 Taqqoslash\n\n`;
  message += `Sizning o\'rtacha: ${userAvg.toFixed(1)}%\n`;
  message += `Umumiy o\'rtacha: ${globalAvg.toFixed(1)}%\n\n`;
  message += `Farq: ${comparison}`;
  
  bot.sendMessage(chatId, message, getMainMenu());
});

// Progress command
bot.onText(/\/progress/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (!isUserApproved(userId)) {
    return bot.sendMessage(chatId, '❌ Avval ro\'yxatdan o\'ting!');
  }
  
  const history = readJSON(TEST_HISTORY_FILE);
  const userHistory = history[userId] || [];
  
  if (!userHistory.length) {
    return bot.sendMessage(chatId, '❌ Siz hali test topshirmadingiz.');
  }
  
  const sectionProgress = {};
  userHistory.forEach(test => {
    if (!sectionProgress[test.section]) {
      sectionProgress[test.section] = { count: 0, avgScore: 0, totalScore: 0 };
    }
    sectionProgress[test.section].count++;
    sectionProgress[test.section].totalScore += test.percentage;
  });
  
  let message = '📈 Taraqqiyotingiz:\n\n';
  
  Object.entries(sectionProgress).forEach(([section, stats]) => {
    const avg = stats.totalScore / stats.count;
    const bar = '█'.repeat(Math.round(avg / 10));
    message += `${section}:\n`;
    message += `   ${bar} ${avg.toFixed(1)}%\n`;
    message += `   Testlar: ${stats.count}\n\n`;
  });
  
  bot.sendMessage(chatId, message, getMainMenu());
});

// Add admin commands
bot.onText(/\/admin_stats/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ Ruxsat yo\'q!');
  }
  
  const history = readJSON(TEST_HISTORY_FILE);
  const users = readJSON(USERS_FILE);
  const pending = readJSON(PENDING_FILE);
  
  const totalUsers = Object.keys(users).length;
  const totalPending = Object.keys(pending).length;
  
  let totalTests = 0;
  let avgScore = 0;
  let testCount = 0;
  
  Object.values(history).forEach(userTests => {
    totalTests += userTests.length;
    userTests.forEach(test => {
      avgScore += test.percentage;
      testCount++;
    });
  });
  
  if (testCount > 0) {
    avgScore = avgScore / testCount;
  }
  
  bot.sendMessage(chatId, `📊 Admin statistikasi:

👥 Jami foydalanuvchilar: ${totalUsers}
⏳ Kutilayotganlar: ${totalPending}
📋 Jami testlar: ${totalTests}
📈 O'rtacha ball: ${avgScore.toFixed(1)}%`, getAdminMenu());
});

bot.onText(/\/block (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ Ruxsat yo\'q!');
  }
  
  const targetUserId = match[1].trim();
  const users = readJSON(USERS_FILE);
  
  if (!users[targetUserId]) {
    return bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi!');
  }
  
  users[targetUserId].blocked = true;
  users[targetUserId].blockedAt = new Date().toISOString();
  writeJSON(USERS_FILE, users);
  
  bot.sendMessage(chatId, `✅ Foydalanuvchi bloklandi: ${users[targetUserId].fullname}`);
  bot.sendMessage(targetUserId, '🚫 Sizning hisobingiz admin tomonidan bloklandi!');
  log(userId, 'user_blocked', { targetUserId });
});

bot.onText(/\/unblock (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ Ruxsat yo\'q!');
  }
  
  const targetUserId = match[1].trim();
  const users = readJSON(USERS_FILE);
  
  if (!users[targetUserId]) {
    return bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi!');
  }
  
  delete users[targetUserId].blocked;
  delete users[targetUserId].blockedAt;
  writeJSON(USERS_FILE, users);
  
  bot.sendMessage(chatId, `✅ Foydalanuvchi blokdan chiqarildi: ${users[targetUserId].fullname}`);
  bot.sendMessage(targetUserId, '✅ Sizning hisobingiz blokdan chiqarildi!');
  log(userId, 'user_unblocked', { targetUserId });
});

bot.onText(/\/user (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ Ruxsat yo\'q!');
  }
  
  const targetUserId = match[1].trim();
  const users = readJSON(USERS_FILE);
  const history = readJSON(TEST_HISTORY_FILE);
  
  if (!users[targetUserId]) {
    return bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi!');
  }
  
  const user = users[targetUserId];
  const userTests = history[targetUserId] || [];
  
  let text = `👤 Foydalanuvchi ma\'lumotlari:\n\n`;
  text += `Ism: ${user.fullname}\n`;
  text += `ID: ${targetUserId}\n`;
  text += `Username: @${user.username || 'Yo\'q'}\n`;
  text += `Ro\'yxatdan o\'tgan: ${new Date(user.approvedAt).toLocaleString('uz-UZ')}\n`;
  text += `Status: ${user.blocked ? '🚫 Bloklangan' : '✅ Faol'}\n`;
  text += `\n📋 Testlar: ${userTests.length}\n`;
  
  if (userTests.length > 0) {
    const avgScore = userTests.reduce((sum, test) => sum + test.percentage, 0) / userTests.length;
    text += `📈 O\'rtacha ball: ${avgScore.toFixed(1)}%`;
  }
  
  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: user.blocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash', callback_data: `toggle_block_${targetUserId}` }],
        [{ text: '📋 Testlar tarixini ko\'rish', callback_data: `view_user_history_${targetUserId}` }]
      ]
    }
  });
});

bot.onText(/\/clear_logs/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ Ruxsat yo\'q!');
  }
  
  writeJSON(LOGS_FILE, []);
  bot.sendMessage(chatId, '✅ Loglar tozalandi!');
  log(userId, 'logs_cleared');
});

bot.onText(/\/broadcast/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;
  
  if (userId !== ADMIN_ID) {
    return bot.sendMessage(chatId, '❌ Ruxsat yo\'q!');
  }
  
  const message = text.substring('/broadcast '.length).trim();
  if (!message) {
    return bot.sendMessage(chatId, '❌ Xabar matnini kiriting!\n\n/broadcast Xabar matni');
  }
  
  const users = readJSON(USERS_FILE);
  let sentCount = 0;
  let errorCount = 0;
  
  for (const userId in users) {
    try {
      await bot.sendMessage(userId, `📢 E'lon:\n\n${message}`);
      sentCount++;
    } catch (error) {
      errorCount++;
      console.error(`Failed to send message to ${userId}:`, error);
    }
  }
  
  bot.sendMessage(chatId, `✅ Xabar yuborildi!\n\n📬 Yuborildi: ${sentCount}\n❌ Xatolar: ${errorCount}`, getAdminMenu());
});

bot.on('message', async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text;

  if (!text || text.startsWith('/')) return;

  const session = userSessions[userId];
  if (!session) return;

  if (session.step === 'awaiting_fullname') {
    const fullname = text.trim();
    if (fullname.length < 3) {
      bot.sendMessage(chatId, '❌ Ism va familiyani to\'liq kiriting!');
      return;
    }

    const pending = readJSON(PENDING_FILE);
    pending[userId] = {
      fullname,
      username: msg.from.username || 'Yo\'q',
      timestamp: new Date().toISOString()
    };
    writeJSON(PENDING_FILE, pending);

    const adminMsg = `🆕 Yangi foydalanuvchi!

👤 Ism: ${fullname}
🆔 ID: ${userId}
📱 Username: @${msg.from.username || 'Yo\'q'}`;

    bot.sendMessage(ADMIN_ID, adminMsg, {
      reply_markup: {
        inline_keyboard: [
          [
            { text: '✅ Tasdiqlash', callback_data: `approve_${userId}` },
            { text: '❌ Rad etish', callback_data: `reject_${userId}` }
          ]
        ]
      }
    });

    bot.sendMessage(chatId, '✅ Arizangiz yuborildi! Admin javobini kuting.');
    delete userSessions[userId];
    log(userId, 'registration_submitted', { fullname });
  } else if (session.step === 'awaiting_admin_password') {
    if (text === ADMIN_PASSWORD) {
      userSessions[userId].isAdmin = true;
      delete userSessions[userId].step;
      bot.sendMessage(chatId, '🔓 Admin paneliga xush kelibsiz!', getAdminMenu());
      log(userId, 'admin_login_success');
    } else {
      bot.sendMessage(chatId, '❌ Noto\'g\'ri parol!');
      delete userSessions[userId];
      log(userId, 'admin_login_failed');
    }
  } else if (session.step === 'awaiting_question_text') {
    // Admin is adding a new question
    session.questionText = text.trim();
    session.step = 'awaiting_question_options';
    session.options = [];
    bot.sendMessage(chatId, '✅ Savol qabul qilindi!\n\nEndi 4 ta javob variantini bir-biridan yangi qatorda yuboring:\n\nMasalan:\nVariant 1\nVariant 2\nVariant 3\nVariant 4', {
      reply_markup: {
        inline_keyboard: [[{ text: '🚫 Bekor qilish', callback_data: 'cancel_add_question' }]]
      }
    });
  } else if (session.step === 'awaiting_question_options') {
    // Collecting options for the new question
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length !== 4) {
      const exampleText = `❌ Iltimos, to'liq 4 ta variant kiriting (har bir variant yangi qatorda)!

Masalan:
Variant 1
Variant 2
Variant 3
Variant 4`;
      return bot.sendMessage(chatId, exampleText);
    }
    
    session.options = lines;
    session.step = 'awaiting_correct_answer';
    
    let optionsText = 'Variantlar:\n';
    lines.forEach((opt, idx) => {
      optionsText += `${idx + 1}. ${opt}\n`;
    });
    
    bot.sendMessage(chatId, optionsText + '\nTo\'g\'ri javob raqamini kiriting (1-4):', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '1', callback_data: 'correct_answer_0' }, { text: '2', callback_data: 'correct_answer_1' }],
          [{ text: '3', callback_data: 'correct_answer_2' }, { text: '4', callback_data: 'correct_answer_3' }],
          [{ text: '🚫 Bekor qilish', callback_data: 'cancel_add_question' }]
        ]
      }
    });
  } else if (session.step === 'awaiting_edit_question_number') {
    // Admin is selecting which question to edit
    const questionNum = parseInt(text.trim());
    
    if (isNaN(questionNum) || questionNum < 1) {
      return bot.sendMessage(chatId, '❌ Iltimos, to\'g\'ri raqam kiriting!');
    }
    
    const section = session.editSection;
    const difficulty = session.editDifficulty;
    const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
    
    if (!fs.existsSync(testFile)) {
      delete userSessions[userId];
      return bot.sendMessage(chatId, '❌ Test fayli topilmadi!', getAdminMenu());
    }
    
    const testsData = readJSON(testFile);
    const questions = testsData[difficulty];
    
    if (!questions || questionNum > questions.length) {
      return bot.sendMessage(chatId, `❌ Bu bo\'limda faqat ${questions.length} ta savol bor. Iltimos, boshqa raqam kiriting:`);
    }
    
    const question = questions[questionNum - 1];
    session.editQuestionIndex = questionNum - 1;
    session.currentQuestion = question;
    
    let questionInfo = `📝 Savol #${questionNum}:

${question.question}

Variantlar:
`;
    question.options.forEach((opt, idx) => {
      questionInfo += `${idx + 1}. ${opt}${idx === question.correct ? ' ✅' : ''}\n`;
    });
    
    bot.sendMessage(chatId, questionInfo + '\nNima tahrirlash kerak?', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '📝 Savol matnini o\'zgartirish', callback_data: 'edit_question_text' }],
          [{ text: '🔄 Variantlarni o\'zgartirish', callback_data: 'edit_question_options' }],
          [{ text: '✅ To\'g\'ri javobni o\'zgartirish', callback_data: 'edit_correct_answer' }],
          [{ text: '🗑️ Savolni o\'chirish', callback_data: 'delete_question' }],
          [{ text: '🚫 Bekor qilish', callback_data: 'back_admin' }]
        ]
      }
    });
    
    session.step = 'edit_question_menu';
  } else if (session.step === 'awaiting_new_question_text') {
    // Admin is changing question text
    session.currentQuestion.question = text.trim();
    saveEditedQuestion(chatId, userId);
  } else if (session.step === 'awaiting_new_options') {
    // Admin is changing options
    const lines = text.trim().split('\n').filter(line => line.trim());
    
    if (lines.length !== 4) {
      return bot.sendMessage(chatId, '❌ Iltimos, to\'liq 4 ta variant kiriting (har bir variant yangi qatorda)!');
    }
    
    session.currentQuestion.options = lines;
    session.step = 'awaiting_new_correct_answer';
    
    let optionsText = 'Yangi variantlar:\n';
    lines.forEach((opt, idx) => {
      optionsText += `${idx + 1}. ${opt}\n`;
    });
    
    bot.sendMessage(chatId, optionsText + '\nEndi to\'g\'ri javob raqamini kiriting (1-4):', {
      reply_markup: {
        inline_keyboard: [
          [{ text: '1', callback_data: 'set_correct_0' }, { text: '2', callback_data: 'set_correct_1' }],
          [{ text: '3', callback_data: 'set_correct_2' }, { text: '4', callback_data: 'set_correct_3' }]
        ]
      }
    });
  } else if (session.step === 'awaiting_feedback') {
    // User is sending feedback to admin
    const feedbackText = text.trim();
    const users = readJSON(USERS_FILE);
    const user = users[userId] || {};
    
    // Send feedback to admin
    bot.sendMessage(ADMIN_ID, `💬 Yangi xabar!

👤 Foydalanuvchi: ${user.fullname || 'Noma\'lum'}
🆔 ID: ${userId}

📝 Xabar:
${feedbackText}`);
    
    // Confirm to user
    bot.sendMessage(chatId, '✅ Xabaringiz adminga yuborildi! Tez orada javob olasiz.', getMainMenu());
    
    log(userId, 'feedback_sent', { message: feedbackText });
    delete userSessions[userId];
  } else if (session.step === 'awaiting_search_query') {
    // Admin is searching for questions
    const searchTerm = text.trim().toLowerCase();
    const results = [];
    
    ['HTML', 'CSS', 'JS', 'GIT', 'BASH'].forEach(section => {
      const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
      const testsData = readJSON(testFile);
      
      ['easy', 'difficult'].forEach(difficulty => {
        if (testsData[difficulty]) {
          testsData[difficulty].forEach((q, idx) => {
            if (q.question.toLowerCase().includes(searchTerm)) {
              results.push({
                section,
                difficulty,
                questionNum: idx + 1,
                question: q.question.substring(0, 100)
              });
            }
          });
        }
      });
    });
    
    if (results.length === 0) {
      return bot.sendMessage(chatId, '❌ Hech narsa topilmadi!', {
        reply_markup: {
          inline_keyboard: [[{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]]
        }
      });
    }
    
    let resultText = `🔍 Qidiruv natijalari: "${searchTerm}"

Topildi: ${results.length} ta

`;
    results.slice(0, 10).forEach((r, idx) => {
      resultText += `${idx + 1}. ${r.section} (${r.difficulty}) #${r.questionNum}\n   ${r.question}...\n\n`;
    });
    
    if (results.length > 10) {
      resultText += `\n... va yana ${results.length - 10} ta natija`;
    }
    
    bot.sendMessage(chatId, resultText, {
      reply_markup: {
        inline_keyboard: [[{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]]
      }
    });
    
    delete userSessions[userId].step;
  }
});

bot.onText(/\/admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;

  log(userId, 'admin_command_attempt');

  if (userId !== ADMIN_ID) {
    log(userId, 'admin_command_denied');
    return;
  }

  userSessions[userId] = { step: 'awaiting_admin_password' };
  bot.sendMessage(chatId, '🔐 Admin parolini kiriting:');
});

// Admin help command
bot.onText(/\/help_admin/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  const helpText = `📚 Admin Buyruqlari Qo'llanmasi

🔑 Asosiy Buyruqlar:
/admin - Admin paneliga kirish
/help_admin - Bu qo'llanma
/admin_stats - Tezkor statistika
/question_count - Savollar soni
/question_format - Savol qo'shish formati ⭐ YANGI
/system_info - Tizim ma\'lumotlari ⭐ YANGI

👥 Foydalanuvchilar:
/user <ID> - Foydalanuvchi ma'lumotlari
/block <ID> - Foydalanuvchini bloklash
/unblock <ID> - Blokdan chiqarish
/reset_user <ID> - Foydalanuvchi tarixini tozalash ⭐ YANGI

📊 Statistika:
/admin_stats - Umumiy statistika
/question_count - Savollar soni bo'yicha
/system_info - Tizim monitoringi ⭐ YANGI
/leaderboard - Eng yaxshi natijalar

📝 Boshqaruv:
/broadcast <xabar> - Barchaga xabar yuborish
/announce - E\'lon rejimi ⭐ YANGI
/clear_logs - Loglarni tozalash
/export_data - Ma\'lumotlarni eksport qilish ⭐ YANGI

❓ Savollar Boshqaruvi:
Bot orqali savollar qo'shish, tahrirlash va o'chirish:
1. /admin buyrug'i
2. "Savollar" menyusi
3. Kerakli amalni tanlang

Yoki:
/question_count - Har bir bo'limdagi savollar sonini ko'ring
/question_format - To'liq format va misollarni ko'ring ⭐

📚 To'liq Qo'llanmalar:
- ADMIN_SAVOL_QOSHISH_QOLLANMA.md (O'zbek)
- ADMIN_ADD_QUESTIONS_GUIDE.md (English)
- COMMANDS_REFERENCE.md ⭐ YANGI

💡 Maslahat: Bot orqali savollarni boshqarish xavfsizroq va osonroq!`;
  
  bot.sendMessage(chatId, helpText);
});

// Question count command for admin
bot.onText(/\/question_count/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  let countText = '📊 Savollar statistikasi\n\n';
  
  ['HTML', 'CSS', 'JS', 'GIT', 'BASH'].forEach(section => {
    const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
    if (fs.existsSync(testFile)) {
      const testsData = readJSON(testFile);
      const easyCount = testsData.easy ? testsData.easy.length : 0;
      const difficultCount = testsData.difficult ? testsData.difficult.length : 0;
      const total = easyCount + difficultCount;
      
      countText += `📚 ${section}:\n`;
      countText += `   😊 Oson: ${easyCount}\n`;
      countText += `   🔥 Qiyin: ${difficultCount}\n`;
      countText += `   📊 Jami: ${total}\n\n`;
    }
  });
  
  bot.sendMessage(chatId, countText, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Savol qo\'shish', callback_data: 'admin_add_question' }],
        [{ text: '📄 Format ko\'rsatish', callback_data: 'show_full_format' }],
        [{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]
      ]
    }
  });
});

// Show question format command
bot.onText(/\/question_format/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  const fullFormat = `📋 SAVOL QO'SHISH TO'LIQ FORMATI

━━━━━━━━━━━━━━━━━━━━━━━━

1️⃣ BIRINCHI QADAM: Savol matni

Misol:
"HTML nima uchun ishlatiladi?"

Yoki:
"<img> tegida rasm manbasini ko'rsatish uchun qaysi atribut?"

━━━━━━━━━━━━━━━━━━━━━━━━

2️⃣ IKKINCHI QADAM: 4 ta variant

⚠️ MUHIM: Har bir variantni YANGI QATORDA yozing!

Misol 1:
Veb-sahifalar yaratish
Ma'lumotlar bazasi
Dasturlash
Grafikalar yaratish

Misol 2:
src
href
link
image

━━━━━━━━━━━━━━━━━━━━━━━━

3️⃣ UCHINCHI QADAM: To'g'ri javob

Raqamni bosing:
1 - Birinchi variant
2 - Ikkinchi variant
3 - Uchinchi variant
4 - To'rtinchi variant

━━━━━━━━━━━━━━━━━━━━━━━━

📄 JSON FORMATIDA (ma'lumotlar bazasiga shunday saqlanadi):

\`\`\`json
{
  "id": 1,
  "question": "HTML nima uchun ishlatiladi?",
  "options": [
    "Veb-sahifalar yaratish",
    "Ma'lumotlar bazasi",
    "Dasturlash",
    "Grafikalar yaratish"
  ],
  "correct": 0
}
\`\`\`

💡 Tushuntirish:
- "id" - Avtomatik beriladi
- "question" - Sizning savol matningiz
- "options" - 4 ta variant array ko'rinishida
- "correct" - To'g'ri javob indeksi:
  * 0 = birinchi variant
  * 1 = ikkinchi variant
  * 2 = uchinchi variant
  * 3 = to'rtinchi variant

━━━━━━━━━━━━━━━━━━━━━━━━

🎯 TO'LIQ MISOL:

Qadam 1 - Savol:
<p> tegi nima uchun ishlatiladi?

Qadam 2 - Variantlar:
Paragraf yaratish
Rasm qo'shish
Havola yaratish
Jadval yaratish

Qadam 3 - To'g'ri javob:
1 (chunki "Paragraf yaratish" to'g'ri)

Natija (JSON):
\`\`\`json
{
  "id": 2,
  "question": "<p> tegi nima uchun ishlatiladi?",
  "options": [
    "Paragraf yaratish",
    "Rasm qo'shish",
    "Havola yaratish",
    "Jadval yaratish"
  ],
  "correct": 0
}
\`\`\`

━━━━━━━━━━━━━━━━━━━━━━━━

✅ Endi boshlash uchun tayyor!
Buyruq: /admin → Savollar → Savol qo'shish`;
  
  bot.sendMessage(chatId, fullFormat, {
    parse_mode: 'Markdown',
    reply_markup: {
      inline_keyboard: [
        [{ text: '➕ Hozir savol qo\'shish', callback_data: 'admin_add_question' }],
        [{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]
      ]
    }
  });
});

// Export all data command
bot.onText(/\/export_data/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  try {
    const users = readJSON(USERS_FILE);
    const pending = readJSON(PENDING_FILE);
    const history = readJSON(TEST_HISTORY_FILE);
    const logs = readJSON(LOGS_FILE);
    
    const exportData = {
      exportDate: new Date().toISOString(),
      users: Object.keys(users).length,
      pending: Object.keys(pending).length,
      totalTests: Object.values(history).reduce((sum, tests) => sum + tests.length, 0),
      data: {
        users,
        pending,
        history,
        logs: logs.slice(-100) // Last 100 logs
      }
    };
    
    const exportPath = path.join(DATA_DIR, `export_${Date.now()}.json`);
    writeJSON(exportPath, exportData);
    
    bot.sendDocument(chatId, exportPath, {}, {
      caption: `💾 Ma\'lumotlar eksporti\n📅 ${new Date().toLocaleString('uz-UZ')}\n\n👥 Foydalanuvchilar: ${exportData.users}\n📊 Testlar: ${exportData.totalTests}`
    });
    
    log(userId, 'data_exported');
  } catch (error) {
    bot.sendMessage(chatId, `❌ Xatolik: ${error.message}`);
  }
});

// System info command
bot.onText(/\/system_info/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  const uptime = process.uptime();
  const hours = Math.floor(uptime / 3600);
  const minutes = Math.floor((uptime % 3600) / 60);
  
  const memoryUsage = process.memoryUsage();
  const formatBytes = (bytes) => (bytes / 1024 / 1024).toFixed(2) + ' MB';
  
  const users = readJSON(USERS_FILE);
  const pending = readJSON(PENDING_FILE);
  const history = readJSON(TEST_HISTORY_FILE);
  
  let totalQuestions = 0;
  ['html', 'css', 'js', 'git', 'bash'].forEach(section => {
    const testFile = path.join(__dirname, 'database', `${section}_tests.json`);
    if (fs.existsSync(testFile)) {
      const data = readJSON(testFile);
      totalQuestions += (data.easy ? data.easy.length : 0) + (data.difficult ? data.difficult.length : 0);
    }
  });
  
  const message = `💻 Tizim ma\'lumotlari

⏱ Ishlash vaqti: ${hours}h ${minutes}m
📊 Xotira: ${formatBytes(memoryUsage.rss)}
👥 Foydalanuvchilar: ${Object.keys(users).length}
⏳ Kutilayotgan: ${Object.keys(pending).length}
📝 Jami savollar: ${totalQuestions}
📊 Jami testlar: ${Object.values(history).reduce((sum, tests) => sum + tests.length, 0)}

💻 Node.js: ${process.version}
🔹 Platform: ${process.platform}`;
  
  bot.sendMessage(chatId, message, getAdminMenu());
});

// Reset user stats command
bot.onText(/\/reset_user (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  const targetUserId = match[1].trim();
  const history = readJSON(TEST_HISTORY_FILE);
  
  if (!history[targetUserId]) {
    return bot.sendMessage(chatId, '❌ Foydalanuvchi topilmadi yoki hali test topshirmagan!');
  }
  
  const users = readJSON(USERS_FILE);
  const user = users[targetUserId];
  
  bot.sendMessage(chatId, `⚠️ ${user?.fullname || 'Noma\'lum'} ning barcha test natijalarini o\'chirmoqchimisiz?`, {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✅ Ha, o\'chirish', callback_data: `confirm_reset_${targetUserId}` }],
        [{ text: '❌ Bekor qilish', callback_data: 'back_admin' }]
      ]
    }
  });
});

// Announce to all users
bot.onText(/\/announce/, async (msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  if (userId !== ADMIN_ID) {
    return;
  }
  
  bot.sendMessage(chatId, '📢 E\'lon matni\n\nBarcha foydalanuvchilarga yuborish uchun e\'lon matnini yuboring:', {
    reply_markup: {
      inline_keyboard: [[{ text: '❌ Bekor qilish', callback_data: 'back_admin' }]]
    }
  });
  
  userSessions[userId] = { ...userSessions[userId], step: 'awaiting_announcement' };
});

bot.on('callback_query', async (query) => {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const data = query.data;
  const messageId = query.message.message_id;

  if (data.startsWith('approve_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });

    const targetUserId = parseInt(data.split('_')[1]);
    const pending = readJSON(PENDING_FILE);
    const users = readJSON(USERS_FILE);

    if (pending[targetUserId]) {
      users[targetUserId] = { ...pending[targetUserId], approved: true, approvedAt: new Date().toISOString() };
      delete pending[targetUserId];
      writeJSON(USERS_FILE, users);
      writeJSON(PENDING_FILE, pending);

      bot.editMessageText('✅ Tasdiqlandi!', { chat_id: chatId, message_id: messageId });
      bot.sendMessage(targetUserId, '🎉 Arizangiz tasdiqlandi! /start ni bosing.');
      log(ADMIN_ID, 'user_approved', { targetUserId });
    }
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('reject_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });

    const targetUserId = parseInt(data.split('_')[1]);
    const pending = readJSON(PENDING_FILE);

    if (pending[targetUserId]) {
      delete pending[targetUserId];
      writeJSON(PENDING_FILE, pending);
      bot.editMessageText('❌ Rad etildi!', { chat_id: chatId, message_id: messageId });
      bot.sendMessage(targetUserId, '❌ Arizangiz rad etildi.');
      log(ADMIN_ID, 'user_rejected', { targetUserId });
    }
    return bot.answerCallbackQuery(query.id);
  }

  if (!userSessions[userId]?.isAdmin && userId !== ADMIN_ID && !isUserApproved(userId)) {
    return bot.answerCallbackQuery(query.id, { text: '❌ Avval ro\'yxatdan o\'ting!' });
  }

  if (data.startsWith('section_')) {
    const section = data.split('_')[1];
    log(userId, 'section_selected', { section });
    bot.editMessageText(`${section} tanlandi!\n\nQiyinlik darajasini tanlang:`, {
      chat_id: chatId, message_id: messageId, ...getDifficultyMenu(section)
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('test_')) {
    const [, section, difficulty] = data.split('_');
    startTest(chatId, userId, section, difficulty, messageId);
    return bot.answerCallbackQuery(query.id, { text: '📝 Test boshlandi!' });
  }

  if (data === 'back_main') {
    bot.editMessageText('🎉 Test bo\'limini tanlang:', { chat_id: chatId, message_id: messageId, ...getMainMenu() });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'my_results') {
    showUserResults(chatId, userId, messageId);
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'help') {
    bot.editMessageText('ℹ️ Yordam\n\nHar bir test 20 savol, har biriga 20 soniya.\n\nOmad!', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_main' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }
  
  // User command callbacks
  if (data === 'update_profile') {
    bot.editMessageText('🔄 Profilni yangilash\n\nProfilingizni yangilash uchun ma\'lumotlaringizni kiriting:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'settings_menu' }]] }
    });
    userSessions[userId] = { ...userSessions[userId], waitingFor: 'profile_update' };
    return bot.answerCallbackQuery(query.id);
  }
  
  if (data === 'notifications') {
    const users = readJSON(USERS_FILE);
    const user = users[userId] || {};
    const notificationsEnabled = user.notifications !== false; // Default is true
    
    bot.editMessageText('🔔 Bildirishnomalar\n\nBildirishnomalar holati:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: notificationsEnabled ? '✅ Yoqilgan' : '❌ O\'chirilgan', callback_data: 'toggle_notifications' }],
          [{ text: '⬅️ Orqaga', callback_data: 'settings_menu' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }
  
  if (data === 'toggle_notifications') {
    const users = readJSON(USERS_FILE);
    if (!users[userId]) users[userId] = {};
    users[userId].notifications = users[userId].notifications === false ? true : false;
    writeJSON(USERS_FILE, users);
    
    const notificationsEnabled = users[userId].notifications !== false;
    bot.editMessageText('🔔 Bildirishnomalar\n\nBildirishnomalar holati:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: notificationsEnabled ? '✅ Yoqilgan' : '❌ O\'chirilgan', callback_data: 'toggle_notifications' }],
          [{ text: '⬅️ Orqaga', callback_data: 'settings_menu' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id, { text: notificationsEnabled ? '✅ Bildirishnomalar yoqildi' : '❌ Bildirishnomalar o\'chirildi' });
  }
  
  if (data === 'settings_menu') {
    bot.editMessageText('⚙️ Sozlamalar', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔄 Profilni yangilash', callback_data: 'update_profile' }],
          [{ text: '🔔 Bildirishnomalar', callback_data: 'notifications' }],
          [{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // Show full format for questions
  if (data === 'show_full_format') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const fullFormat = `📋 SAVOL QO'SHISH FORMATI

📄 JSON ko'rinishi:
\`\`\`json
{
  "id": 1,
  "question": "Savol matni?",
  "options": [
    "Variant 1",
    "Variant 2",
    "Variant 3",
    "Variant 4"
  ],
  "correct": 0
}
\`\`\`

💡 Tushuntirish:
- id: Avtomatik
- question: Savol matni
- options: 4 ta variant
- correct: 0,1,2,3 (to'g'ri javob)

🔥 To'liq format: /question_format`;
    
    bot.sendMessage(chatId, fullFormat, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Savol qo\'shish', callback_data: 'admin_add_question' }]
        ]
      }
    });
    
    return bot.answerCallbackQuery(query.id, { text: '📄 Format yuborildi' });
  }

  if (data === 'admin_pending') {
    showPendingUsers(chatId, messageId);
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'admin_approved') {
    showApprovedUsers(chatId, messageId);
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'admin_results') {
    showAllResults(chatId, messageId);
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'admin_logs') {
    showLogs(chatId, messageId);
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'admin_logout') {
    delete userSessions[userId];
    bot.editMessageText('👋 Chiqildi.', { chat_id: chatId, message_id: messageId });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'admin_users') {
    bot.editMessageText('👥 Foydalanuvchilar boshqaruvi', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏳ Kutilayotganlar', callback_data: 'admin_pending' }],
          [{ text: '✅ Tasdiqlangan', callback_data: 'admin_approved' }],
          [{ text: '🚫 Bloklangan', callback_data: 'admin_blocked' }],
          [{ text: '🔍 Qidirish', callback_data: 'admin_search_user' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }
  
  if (data === 'admin_tests') {
    bot.editMessageText('📝 Testlar boshqaruvi', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📊 Natijalar', callback_data: 'admin_results' }],
          [{ text: '📋 Test statistikasi', callback_data: 'admin_test_stats' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }
  
  if (data === 'admin_test_stats') {
    const history = readJSON(TEST_HISTORY_FILE);
    let totalTests = 0;
    let sectionStats = {};
    
    Object.values(history).forEach(userTests => {
      userTests.forEach(test => {
        totalTests++;
        if (!sectionStats[test.section]) {
          sectionStats[test.section] = { count: 0, avgScore: 0, totalScore: 0 };
        }
        sectionStats[test.section].count++;
        sectionStats[test.section].totalScore += test.percentage;
      });
    });
    
    let text = '📊 Test statistikasi:\n\n';
    text += `Jami testlar: ${totalTests}\n\n`;
    
    Object.entries(sectionStats).forEach(([section, stats]) => {
      const avgScore = Math.round(stats.totalScore / stats.count);
      text += `${section}: ${stats.count} ta test, o'rtacha: ${avgScore}%\n`;
    });
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_tests' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }
  
  if (data === 'admin_search_user') {
    bot.editMessageText('🔍 Foydalanuvchi qidirish\n\nFoydalanuvchi ID raqamini kiriting:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_users' }]] }
    });
    userSessions[userId] = { ...userSessions[userId], waitingFor: 'search_user' };
    return bot.answerCallbackQuery(query.id);
  }
  
  if (data === 'back_admin') {
    bot.editMessageText('🔓 Admin paneli', { chat_id: chatId, message_id: messageId, ...getAdminMenu() });
    return bot.answerCallbackQuery(query.id);
  }

  // Add Question callbacks
  if (data === 'admin_add_question') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    bot.editMessageText('➕ Savol qo\'shish\n\nQaysi bo\'limni tanlaysiz?', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 HTML', callback_data: 'add_section_HTML' }, { text: '🎨 CSS', callback_data: 'add_section_CSS' }],
          [{ text: '⚡ JS', callback_data: 'add_section_JS' }, { text: '📦 GIT', callback_data: 'add_section_GIT' }],
          [{ text: '💻 BASH', callback_data: 'add_section_BASH' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('add_section_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const section = data.split('_')[2];
    userSessions[userId] = { ...userSessions[userId], addSection: section };
    
    bot.editMessageText(`🌐 ${section} bo\'limi tanlandi\n\nQiyinlik darajasini tanlang:`, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '😊 Oson', callback_data: 'add_difficulty_easy' }],
          [{ text: '🔥 Qiyin', callback_data: 'add_difficulty_difficult' }],
          [{ text: '⬅️ Orqaga', callback_data: 'admin_add_question' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('add_difficulty_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const difficulty = data.split('_')[2];
    const session = userSessions[userId];
    session.addDifficulty = difficulty;
    session.step = 'awaiting_question_text';
    
    const formatMessage = `✅ ${session.addSection} - ${difficulty === 'easy' ? 'Oson' : 'Qiyin'}

📋 SAVOL QO'SHISH FORMATI:

1️⃣ Birinchi xabar: Savol matni
Misol: "HTML nima uchun ishlatiladi?"

2️⃣ Ikkinchi xabar: 4 ta variant (har biri yangi qatorda)
Misol:
Veb-sahifalar yaratish
Ma'lumotlar bazasi
Dasturlash
Grafikalar yaratish

3️⃣ To'g'ri javob raqamini tanlang (1-4)

━━━━━━━━━━━━━━━━━━━━━━━━

📝 Endi savol matnini yuboring:`;
    
    bot.editMessageText(formatMessage, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📄 Format ko\'rsatish', callback_data: 'show_question_format' }],
          [{ text: '🚫 Bekor qilish', callback_data: 'cancel_add_question' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('correct_answer_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const correctIndex = parseInt(data.split('_')[2]);
    const session = userSessions[userId];
    
    // Save the question to database
    const section = session.addSection;
    const difficulty = session.addDifficulty;
    const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
    
    const testsData = readJSON(testFile);
    if (!testsData[difficulty]) testsData[difficulty] = [];
    
    const newId = testsData[difficulty].length > 0 
      ? Math.max(...testsData[difficulty].map(q => q.id)) + 1 
      : 1;
    
    const newQuestion = {
      id: newId,
      question: session.questionText,
      options: session.options,
      correct: correctIndex
    };
    
    testsData[difficulty].push(newQuestion);
    writeJSON(testFile, testsData);
    
    // Reload TESTS_DB
    delete require.cache[require.resolve('./database/tests')];
    Object.assign(TESTS_DB, require('./database/tests'));
    
    // Show success message with JSON format
    const jsonFormat = JSON.stringify(newQuestion, null, 2);
    
    const successMessage = `✅ Savol muvaffaqiyatli qo'shildi!

📝 Savol: ${session.questionText}
🎯 To'g'ri javob: ${session.options[correctIndex]}

━━━━━━━━━━━━━━━━━━━━━━━━

📄 JSON FORMAT:
\`\`\`json
${jsonFormat}
\`\`\`

💡 Bu formatda qo'shildi: ${section} → ${difficulty === 'easy' ? 'Oson' : 'Qiyin'} → #${newId}`;
    
    bot.editMessageText(successMessage, {
      chat_id: chatId, 
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Yana savol qo\'shish', callback_data: 'admin_add_question' }],
          [{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]
        ]
      }
    });
    
    log(userId, 'question_added', { section, difficulty, questionId: newId });
    delete userSessions[userId];
    userSessions[userId] = { isAdmin: true };
    return bot.answerCallbackQuery(query.id, { text: '✅ Savol qo\'shildi!' });
  }

  if (data === 'cancel_add_question') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    delete userSessions[userId];
    userSessions[userId] = { isAdmin: true };
    
    bot.editMessageText('❌ Bekor qilindi', { chat_id: chatId, message_id: messageId, ...getAdminMenu() });
    return bot.answerCallbackQuery(query.id);
  }

  // Show question format template
  if (data === 'show_question_format') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const formatExample = `📋 SAVOL QO'SHISH FORMATI VA MISOL

━━━━━━━━━━━━━━━━━━━━━━━━

📝 QADAM 1: Savol matni
Misol:
"HTML nima uchun ishlatiladi?"

━━━━━━━━━━━━━━━━━━━━━━━━

🔢 QADAM 2: 4 ta variant
Misol (har biri yangi qatorda):
Veb-sahifalar yaratish
Ma'lumotlar bazasi
Dasturlash
Grafikalar yaratish

━━━━━━━━━━━━━━━━━━━━━━━━

✅ QADAM 3: To'g'ri javob raqami
Misol: 1 (chunki "Veb-sahifalar yaratish" to'g'ri)

━━━━━━━━━━━━━━━━━━━━━━━━

📄 JSON FORMATIDA:
\`\`\`json
{
  "id": 1,
  "question": "HTML nima uchun ishlatiladi?",
  "options": [
    "Veb-sahifalar yaratish",
    "Ma'lumotlar bazasi",
    "Dasturlash",
    "Grafikalar yaratish"
  ],
  "correct": 0
}
\`\`\`

💡 Eslatma:
- "correct": 0 - birinchi variant (Veb-sahifalar yaratish)
- "correct": 1 - ikkinchi variant
- "correct": 2 - uchinchi variant
- "correct": 3 - to'rtinchi variant`;
    
    bot.sendMessage(chatId, formatExample, {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [[{ text: '✅ Tushundim', callback_data: 'format_understood' }]]
      }
    });
    
    return bot.answerCallbackQuery(query.id, { text: '📋 Format ko\'rsatildi' });
  }

  if (data === 'format_understood') {
    bot.deleteMessage(chatId, messageId);
    return bot.answerCallbackQuery(query.id, { text: '👍 Ajoyib!' });
  }

  // Edit Question callbacks
  if (data === 'admin_edit_question') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    bot.editMessageText('✏️ Savol tahrirlash\n\nQaysi bo\'limni tanlaysiz?', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 HTML', callback_data: 'edit_section_HTML' }, { text: '🎨 CSS', callback_data: 'edit_section_CSS' }],
          [{ text: '⚡ JS', callback_data: 'edit_section_JS' }, { text: '📦 GIT', callback_data: 'edit_section_GIT' }],
          [{ text: '💻 BASH', callback_data: 'edit_section_BASH' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('edit_section_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const section = data.split('_')[2];
    userSessions[userId] = { ...userSessions[userId], editSection: section };
    
    bot.editMessageText(`🌐 ${section} bo\'limi tanlandi\n\nQiyinlik darajasini tanlang:`, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '😊 Oson', callback_data: 'edit_difficulty_easy' }],
          [{ text: '🔥 Qiyin', callback_data: 'edit_difficulty_difficult' }],
          [{ text: '⬅️ Orqaga', callback_data: 'admin_edit_question' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('edit_difficulty_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const difficulty = data.split('_')[2];
    const session = userSessions[userId];
    session.editDifficulty = difficulty;
    session.step = 'awaiting_edit_question_number';
    
    const section = session.editSection;
    const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
    const testsData = readJSON(testFile);
    const questionsCount = testsData[difficulty] ? testsData[difficulty].length : 0;
    
    bot.editMessageText(`✅ ${section} - ${difficulty === 'easy' ? 'Oson' : 'Qiyin'}

Bu bo\'limda ${questionsCount} ta savol bor.

Tahrirlash uchun savol raqamini yuboring (1-${questionsCount}):`, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: '🚫 Bekor qilish', callback_data: 'cancel_edit_question' }]]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'edit_question_text') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const session = userSessions[userId];
    session.step = 'awaiting_new_question_text';
    
    bot.editMessageText(`📝 Hozirgi savol:\n${session.currentQuestion.question}\n\nYangi savol matnini yuboring:`, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: '🚫 Bekor qilish', callback_data: 'cancel_edit_question' }]]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'edit_question_options') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const session = userSessions[userId];
    session.step = 'awaiting_new_options';
    
    let currentOptions = 'Hozirgi variantlar:\n';
    session.currentQuestion.options.forEach((opt, idx) => {
      currentOptions += `${idx + 1}. ${opt}\n`;
    });
    
    bot.editMessageText(currentOptions + '\nYangi 4 ta variantni har birini yangi qatorda yuboring:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: '🚫 Bekor qilish', callback_data: 'cancel_edit_question' }]]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'edit_correct_answer') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const session = userSessions[userId];
    let optionsText = 'Variantlar:\n';
    session.currentQuestion.options.forEach((opt, idx) => {
      optionsText += `${idx + 1}. ${opt}${idx === session.currentQuestion.correct ? ' ✅' : ''}\n`;
    });
    
    bot.editMessageText(optionsText + '\nYangi to\'g\'ri javob raqamini tanlang:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '1', callback_data: 'set_correct_0' }, { text: '2', callback_data: 'set_correct_1' }],
          [{ text: '3', callback_data: 'set_correct_2' }, { text: '4', callback_data: 'set_correct_3' }],
          [{ text: '🚫 Bekor qilish', callback_data: 'cancel_edit_question' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('set_correct_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const correctIndex = parseInt(data.split('_')[2]);
    const session = userSessions[userId];
    session.currentQuestion.correct = correctIndex;
    saveEditedQuestion(chatId, userId);
    return bot.answerCallbackQuery(query.id, { text: '✅ Saqlandi!' });
  }

  if (data === 'delete_question') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    bot.editMessageText('⚠️ Savolni o\'chirmoqchimisiz? Bu amalni bekor qilib bo\'lmaydi!', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '✅ Ha, o\'chirish', callback_data: 'confirm_delete_question' }],
          [{ text: '❌ Yo\'q, bekor qilish', callback_data: 'cancel_edit_question' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'confirm_delete_question') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const session = userSessions[userId];
    const section = session.editSection;
    const difficulty = session.editDifficulty;
    const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
    
    const testsData = readJSON(testFile);
    testsData[difficulty].splice(session.editQuestionIndex, 1);
    writeJSON(testFile, testsData);
    
    // Reload TESTS_DB
    delete require.cache[require.resolve('./database/tests')];
    Object.assign(TESTS_DB, require('./database/tests'));
    
    bot.editMessageText('✅ Savol o\'chirildi!', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [[{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]]
      }
    });
    
    log(userId, 'question_deleted', { section, difficulty });
    delete userSessions[userId];
    userSessions[userId] = { isAdmin: true };
    return bot.answerCallbackQuery(query.id, { text: '✅ O\'chirildi!' });
  }

  if (data === 'cancel_edit_question') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    delete userSessions[userId];
    userSessions[userId] = { isAdmin: true };
    
    bot.editMessageText('❌ Bekor qilindi', { chat_id: chatId, message_id: messageId, ...getAdminMenu() });
    return bot.answerCallbackQuery(query.id);
  }

  // Questions Management
  if (data === 'admin_questions') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    bot.editMessageText('❓ Savollar boshqaruvi', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '➕ Savol qo\'shish', callback_data: 'admin_add_question' }],
          [{ text: '✏️ Savol tahrirlash', callback_data: 'admin_edit_question' }],
          [{ text: '👁 Savollarni ko\'rish', callback_data: 'admin_view_questions' }],
          [{ text: '🔍 Qidirish', callback_data: 'admin_search_questions' }],
          [{ text: '📊 Savol statistikasi', callback_data: 'admin_question_stats' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // View Questions
  if (data === 'admin_view_questions') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    bot.editMessageText('👁 Savollarni ko\'rish\n\nBo\'limni tanlang:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '🌐 HTML', callback_data: 'view_section_HTML' }, { text: '🎨 CSS', callback_data: 'view_section_CSS' }],
          [{ text: '⚡ JS', callback_data: 'view_section_JS' }, { text: '📦 GIT', callback_data: 'view_section_GIT' }],
          [{ text: '💻 BASH', callback_data: 'view_section_BASH' }],
          [{ text: '⬅️ Orqaga', callback_data: 'admin_questions' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('view_section_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const section = data.split('_')[2];
    userSessions[userId] = { ...userSessions[userId], viewSection: section };
    
    bot.editMessageText(`🌐 ${section}\n\nQiyinlik darajasini tanlang:`, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '😊 Oson', callback_data: 'view_difficulty_easy' }],
          [{ text: '🔥 Qiyin', callback_data: 'view_difficulty_difficult' }],
          [{ text: '⬅️ Orqaga', callback_data: 'admin_view_questions' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('view_difficulty_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const difficulty = data.split('_')[2];
    const session = userSessions[userId];
    const section = session.viewSection;
    
    const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
    const testsData = readJSON(testFile);
    const questions = testsData[difficulty] || [];
    
    if (questions.length === 0) {
      return bot.editMessageText('❌ Bu bo\'limda savollar yo\'q', {
        chat_id: chatId, message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_view_questions' }]] }
      });
    }
    
    session.viewDifficulty = difficulty;
    session.viewPage = 0;
    showQuestionsPage(chatId, messageId, userId);
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('view_page_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const page = parseInt(data.split('_')[2]);
    userSessions[userId].viewPage = page;
    showQuestionsPage(chatId, messageId, userId);
    return bot.answerCallbackQuery(query.id);
  }

  // Search Questions
  if (data === 'admin_search_questions') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    userSessions[userId] = { ...userSessions[userId], step: 'awaiting_search_query' };
    bot.editMessageText('🔍 Qidiruv\n\nQidiruv so\'zini kiriting:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_questions' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // Question Statistics
  if (data === 'admin_question_stats') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const history = readJSON(TEST_HISTORY_FILE);
    const questionStats = {};
    
    // Calculate stats for each question
    Object.values(history).forEach(userTests => {
      userTests.forEach(test => {
        test.answers.forEach(answer => {
          if (answer && answer.questionId) {
            const qId = `${test.section}_${answer.questionId}`;
            if (!questionStats[qId]) {
              questionStats[qId] = { correct: 0, total: 0, section: test.section, id: answer.questionId };
            }
            questionStats[qId].total++;
            if (answer.isCorrect) questionStats[qId].correct++;
          }
        });
      });
    });
    
    // Sort by total attempts
    const sorted = Object.values(questionStats)
      .sort((a, b) => b.total - a.total)
      .slice(0, 15);
    
    let text = '📊 Savol statistikasi\n\nEng ko\'p javob berilgan savollar:\n\n';
    sorted.forEach((stat, idx) => {
      const percentage = Math.round((stat.correct / stat.total) * 100);
      text += `${idx + 1}. ${stat.section} #${stat.id}\n   👥 ${stat.total} ta, ✅ ${percentage}%\n\n`;
    });
    
    if (sorted.length === 0) {
      text = '📊 Statistika yo\'q';
    }
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_questions' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // Statistics Menu
  if (data === 'admin_statistics') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const users = readJSON(USERS_FILE);
    const pending = readJSON(PENDING_FILE);
    const history = readJSON(TEST_HISTORY_FILE);
    
    const totalUsers = Object.keys(users).length;
    const totalPending = Object.keys(pending).length;
    
    let totalTests = 0;
    let totalCorrect = 0;
    let totalQuestions = 0;
    
    Object.values(history).forEach(userTests => {
      totalTests += userTests.length;
      userTests.forEach(test => {
        totalCorrect += test.correct;
        totalQuestions += test.total;
      });
    });
    
    const avgScore = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;
    
    let text = `📊 Umumiy statistika\n\n`;
    text += `👥 Foydalanuvchilar: ${totalUsers}\n`;
    text += `⏳ Kutilayotgan: ${totalPending}\n`;
    text += `📋 Jami testlar: ${totalTests}\n`;
    text += `✅ O\'rtacha ball: ${avgScore}%\n`;
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '📈 Bo\'limlarga ko\'ra', callback_data: 'stats_by_section' }],
          [{ text: '🏆 Top foydalanuvchilar', callback_data: 'stats_top_users' }],
          [{ text: '📅 Kunlik statistika', callback_data: 'stats_daily' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'stats_by_section') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const history = readJSON(TEST_HISTORY_FILE);
    const sectionStats = {};
    
    Object.values(history).forEach(userTests => {
      userTests.forEach(test => {
        if (!sectionStats[test.section]) {
          sectionStats[test.section] = { count: 0, correct: 0, total: 0 };
        }
        sectionStats[test.section].count++;
        sectionStats[test.section].correct += test.correct;
        sectionStats[test.section].total += test.total;
      });
    });
    
    let text = '📈 Bo\'limlarga ko\'ra statistika\n\n';
    Object.entries(sectionStats).forEach(([section, stats]) => {
      const avgScore = Math.round((stats.correct / stats.total) * 100);
      text += `📚 ${section}:\n`;
      text += `   📋 Testlar: ${stats.count}\n`;
      text += `   ✅ O\'rtacha: ${avgScore}%\n\n`;
    });
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_statistics' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'stats_top_users') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const users = readJSON(USERS_FILE);
    const history = readJSON(TEST_HISTORY_FILE);
    const userStats = [];
    
    Object.keys(users).forEach(uid => {
      const userTests = history[uid] || [];
      if (userTests.length > 0) {
        const totalCorrect = userTests.reduce((sum, test) => sum + test.correct, 0);
        const totalQuestions = userTests.reduce((sum, test) => sum + test.total, 0);
        const avgScore = Math.round((totalCorrect / totalQuestions) * 100);
        
        userStats.push({
          userId: uid,
          name: users[uid].fullname,
          tests: userTests.length,
          avgScore: avgScore
        });
      }
    });
    
    userStats.sort((a, b) => b.avgScore - a.avgScore);
    
    let text = '🏆 Top 10 foydalanuvchilar\n\n';
    userStats.slice(0, 10).forEach((user, idx) => {
      text += `${idx + 1}. ${user.name}\n`;
      text += `   📋 ${user.tests} ta test, ✅ ${user.avgScore}%\n\n`;
    });
    
    if (userStats.length === 0) {
      text = '📊 Statistika yo\'q';
    }
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_statistics' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'stats_daily') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const history = readJSON(TEST_HISTORY_FILE);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let todayTests = 0;
    let todayUsers = new Set();
    
    Object.entries(history).forEach(([uid, userTests]) => {
      userTests.forEach(test => {
        const testDate = new Date(test.timestamp);
        if (testDate >= today) {
          todayTests++;
          todayUsers.add(uid);
        }
      });
    });
    
    let text = `📅 Bugungi statistika\n\n`;
    text += `📋 Testlar: ${todayTests}\n`;
    text += `👥 Foydalanuvchilar: ${todayUsers.size}\n`;
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_statistics' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // Backup Menu
  if (data === 'admin_backup') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    bot.editMessageText('💾 Zaxira nusxa', {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: '💾 Barcha ma\'lumotlarni yuklash', callback_data: 'backup_download' }],
          [{ text: '📄 Savollarni eksport', callback_data: 'backup_export_questions' }],
          [{ text: '📊 Ma\'lumotlar hajmi', callback_data: 'backup_size' }],
          [{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]
        ]
      }
    });
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'backup_download') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    try {
      const backupData = {
        users: readJSON(USERS_FILE),
        pending: readJSON(PENDING_FILE),
        history: readJSON(TEST_HISTORY_FILE),
        logs: readJSON(LOGS_FILE),
        timestamp: new Date().toISOString()
      };
      
      const backupFileName = `backup_${Date.now()}.json`;
      const backupPath = path.join(DATA_DIR, backupFileName);
      writeJSON(backupPath, backupData);
      
      bot.sendDocument(chatId, backupPath, {}, {
        filename: backupFileName,
        contentType: 'application/json'
      }).then(() => {
        fs.unlinkSync(backupPath);
        bot.sendMessage(chatId, '✅ Zaxira nusxa yuklandi!', getAdminMenu());
      });
    } catch (error) {
      bot.sendMessage(chatId, '❌ Xatolik yuz berdi!', getAdminMenu());
      console.error('Backup error:', error);
    }
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'backup_export_questions') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    try {
      const allQuestions = {
        HTML: readJSON(path.join(__dirname, 'database', 'html_tests.json')),
        CSS: readJSON(path.join(__dirname, 'database', 'css_tests.json')),
        JS: readJSON(path.join(__dirname, 'database', 'js_tests.json')),
        GIT: readJSON(path.join(__dirname, 'database', 'git_tests.json')),
        BASH: readJSON(path.join(__dirname, 'database', 'bash_tests.json')),
        exported: new Date().toISOString()
      };
      
      const fileName = `questions_${Date.now()}.json`;
      const filePath = path.join(DATA_DIR, fileName);
      writeJSON(filePath, allQuestions);
      
      bot.sendDocument(chatId, filePath, {}, {
        filename: fileName,
        contentType: 'application/json'
      }).then(() => {
        fs.unlinkSync(filePath);
        bot.sendMessage(chatId, '✅ Savollar eksport qilindi!', getAdminMenu());
      });
    } catch (error) {
      bot.sendMessage(chatId, '❌ Xatolik yuz berdi!', getAdminMenu());
      console.error('Export error:', error);
    }
    return bot.answerCallbackQuery(query.id);
  }

  if (data === 'backup_size') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const getFileSize = (filePath) => {
      try {
        return fs.statSync(filePath).size;
      } catch {
        return 0;
      }
    };
    
    const formatBytes = (bytes) => {
      if (bytes === 0) return '0 Bytes';
      const k = 1024;
      const sizes = ['Bytes', 'KB', 'MB'];
      const i = Math.floor(Math.log(bytes) / Math.log(k));
      return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    };
    
    const usersSize = getFileSize(USERS_FILE);
    const pendingSize = getFileSize(PENDING_FILE);
    const historySize = getFileSize(TEST_HISTORY_FILE);
    const logsSize = getFileSize(LOGS_FILE);
    
    let text = `📊 Ma\'lumotlar hajmi\n\n`;
    text += `👥 Foydalanuvchilar: ${formatBytes(usersSize)}\n`;
    text += `⏳ Kutilayotganlar: ${formatBytes(pendingSize)}\n`;
    text += `📋 Tarix: ${formatBytes(historySize)}\n`;
    text += `📝 Loglar: ${formatBytes(logsSize)}\n`;
    text += `\n📦 Jami: ${formatBytes(usersSize + pendingSize + historySize + logsSize)}`;
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_backup' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // Blocked users
  if (data === 'admin_blocked') {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const users = readJSON(USERS_FILE);
    const blocked = Object.entries(users).filter(([, u]) => u.blocked);
    
    if (blocked.length === 0) {
      return bot.editMessageText('✅ Bloklangan foydalanuvchilar yo\'q', {
        chat_id: chatId, message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_users' }]] }
      });
    }
    
    let text = '🚫 Bloklangan foydalanuvchilar:\n\n';
    blocked.forEach(([id, u]) => {
      text += `👤 ${u.fullname}\n🆔 ${id}\n\n`;
    });
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_users' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

  // Toggle user block
  if (data.startsWith('toggle_block_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const targetUserId = data.split('_')[2];
    const users = readJSON(USERS_FILE);
    
    if (!users[targetUserId]) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Foydalanuvchi topilmadi!' });
    }
    
    if (users[targetUserId].blocked) {
      delete users[targetUserId].blocked;
      delete users[targetUserId].blockedAt;
      bot.sendMessage(targetUserId, '✅ Sizning hisobingiz blokdan chiqarildi!');
      bot.answerCallbackQuery(query.id, { text: '✅ Blokdan chiqarildi!' });
    } else {
      users[targetUserId].blocked = true;
      users[targetUserId].blockedAt = new Date().toISOString();
      bot.sendMessage(targetUserId, '🚫 Sizning hisobingiz admin tomonidan bloklandi!');
      bot.answerCallbackQuery(query.id, { text: '✅ Bloklandi!' });
    }
    
    writeJSON(USERS_FILE, users);
    
    // Refresh user info
    const user = users[targetUserId];
    const history = readJSON(TEST_HISTORY_FILE);
    const userTests = history[targetUserId] || [];
    
    let text = `👤 Foydalanuvchi ma\'lumotlari:\n\n`;
    text += `Ism: ${user.fullname}\n`;
    text += `ID: ${targetUserId}\n`;
    text += `Username: @${user.username || 'Yo\'q'}\n`;
    text += `Status: ${user.blocked ? '🚫 Bloklangan' : '✅ Faol'}\n`;
    text += `\n📋 Testlar: ${userTests.length}`;
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: {
        inline_keyboard: [
          [{ text: user.blocked ? '✅ Blokdan chiqarish' : '🚫 Bloklash', callback_data: `toggle_block_${targetUserId}` }],
          [{ text: '📋 Testlar tarixini ko\'rish', callback_data: `view_user_history_${targetUserId}` }],
          [{ text: '⬅️ Orqaga', callback_data: 'admin_users' }]
        ]
      }
    });
    
    log(userId, user.blocked ? 'user_blocked' : 'user_unblocked', { targetUserId });
    return;
  }

  // View user test history
  if (data.startsWith('view_user_history_')) {
    if (userId !== ADMIN_ID) return bot.answerCallbackQuery(query.id, { text: '❌ Ruxsat yo\'q!' });
    
    const targetUserId = data.split('_')[3];
    const users = readJSON(USERS_FILE);
    const history = readJSON(TEST_HISTORY_FILE);
    
    if (!users[targetUserId]) {
      return bot.answerCallbackQuery(query.id, { text: '❌ Foydalanuvchi topilmadi!' });
    }
    
    const userTests = history[targetUserId] || [];
    
    if (userTests.length === 0) {
      return bot.editMessageText(`👤 ${users[targetUserId].fullname}\n\n📋 Test tarixi yo\'q`, {
        chat_id: chatId, message_id: messageId,
        reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_users' }]] }
      });
    }
    
    let text = `👤 ${users[targetUserId].fullname}\n📋 Test tarixi:\n\n`;
    userTests.slice(-10).reverse().forEach((test, idx) => {
      text += `${idx + 1}. ${test.section} (${test.difficulty})\n`;
      text += `   ✅ ${test.correct}/${test.total} (${test.percentage}%)\n`;
      text += `   📅 ${new Date(test.timestamp).toLocaleString('uz-UZ')}\n\n`;
    });
    
    bot.editMessageText(text, {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'admin_users' }]] }
    });
    return bot.answerCallbackQuery(query.id);
  }

// Add send_message_admin callback
  if (data === 'send_message_admin') {
    bot.editMessageText('✉️ Xabar yuborish\n\nXabaringizni yozing:', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '🔙 Bekor qilish', callback_data: 'back_main' }]] }
    });
    userSessions[userId] = { ...userSessions[userId], step: 'awaiting_feedback' };
    return bot.answerCallbackQuery(query.id);
  }

  if (data.startsWith('answer_')) {
    handleTestAnswer(query);
    return;
  }
});

function startTest(chatId, userId, section, difficulty, messageId) {
  const tests = TESTS_DB[section];
  if (!tests || !tests[difficulty]) return bot.sendMessage(chatId, '❌ Testlar topilmadi!');

  const allQuestions = tests[difficulty];
  // Use 20 questions as requested
  const selectedQuestions = [...allQuestions].sort(() => Math.random() - 0.5).slice(0, 20);
  
  // Keep correct answers in their original positions (can be any option 0-3)
  // No need to modify the correct answer position

  userSessions[userId] = {
    testActive: true, section, difficulty, questions: selectedQuestions,
    currentQuestion: 0, answers: [], correctCount: 0, startTime: Date.now()
  };

  log(userId, 'test_started', { section, difficulty });
  sendQuestion(chatId, userId, messageId);
}

function sendQuestion(chatId, userId, messageId = null) {
  const session = userSessions[userId];
  if (!session || !session.testActive) return;

  const question = session.questions[session.currentQuestion];
  if (!question) return finishTest(chatId, userId);

  // Enhanced validation to prevent errors with modified questions
  if (!question || !question.options || !Array.isArray(question.options) || question.options.length < 2) {
    console.error('Invalid question format:', question);
    // Log the error for admin review
    log(userId, 'invalid_question_error', { questionId: question?.id || 'unknown', section: session.section });
    // Skip this question and move to the next one
    session.currentQuestion++;
    return sendQuestion(chatId, userId, messageId);
  }

  // Validate correct answer index is within bounds
  if (question.correct === undefined || question.correct < 0 || question.correct >= question.options.length) {
    console.error('Invalid correct answer index:', question);
    question.correct = 0; // Default to first option if invalid
    log(userId, 'invalid_correct_answer', { questionId: question.id, section: session.section });
  }

  const questionText = `📝 Savol ${session.currentQuestion + 1}/${session.questions.length}\n⏱️ 20 soniya\n\n${question.question}`;
  const keyboard = {
    reply_markup: {
      inline_keyboard: question.options.map((opt, idx) => [{ text: opt, callback_data: `answer_${userId}_${idx}` }])
    }
  };

  const sendPromise = messageId
    ? bot.editMessageText(questionText, { chat_id: chatId, message_id: messageId, ...keyboard })
    : bot.sendMessage(chatId, questionText, keyboard);

  sendPromise.then((sentMsg) => {
    session.questionMessageId = sentMsg.message_id;
    session.questionTimer = setTimeout(() => {
      if (session.testActive && session.currentQuestion < session.questions.length) {
        session.answers.push(null);
        session.currentQuestion++;
        sendQuestion(chatId, userId, session.questionMessageId);
      }
    }, 20000);
  });
}

function handleTestAnswer(query) {
  const chatId = query.message.chat.id;
  const userId = query.from.id;
  const [, sessionUserId, answerIndex] = query.data.split('_');

  if (parseInt(sessionUserId) !== userId) return bot.answerCallbackQuery(query.id, { text: '❌ Bu sizning testingiz emas!' });

  const session = userSessions[userId];
  if (!session || !session.testActive) return bot.answerCallbackQuery(query.id, { text: '❌ Test topilmadi!' });

  clearTimeout(session.questionTimer);

  const question = session.questions[session.currentQuestion];
  const isCorrect = parseInt(answerIndex) === question.correct;

  if (isCorrect) session.correctCount++;

  session.answers.push({
    questionId: question.id, userAnswer: parseInt(answerIndex),
    correctAnswer: question.correct, isCorrect
  });

  session.currentQuestion++;
  bot.answerCallbackQuery(query.id, { text: isCorrect ? '✅ To\'g\'ri!' : '❌ Noto\'g\'ri!' });

  if (session.currentQuestion < session.questions.length) {
    sendQuestion(chatId, userId, session.questionMessageId);
  } else {
    finishTest(chatId, userId);
  }
}

function finishTest(chatId, userId) {
  const session = userSessions[userId];
  if (!session) return;

  const totalQuestions = session.questions.length;
  const correctCount = session.correctCount;
  const percentage = Math.round((correctCount / totalQuestions) * 100);
  const duration = Math.round((Date.now() - session.startTime) / 1000);

  const users = readJSON(USERS_FILE);
  const user = users[userId];

  const history = readJSON(TEST_HISTORY_FILE);
  if (!history[userId]) history[userId] = [];

  const testRecord = {
    section: session.section, difficulty: session.difficulty,
    correct: correctCount, total: totalQuestions, percentage, duration,
    timestamp: new Date().toISOString(), answers: session.answers
  };

  history[userId].push(testRecord);
  writeJSON(TEST_HISTORY_FILE, history);

  let resultText = `✅ Test yakunlandi!

📊 Natija:
✅ To'g'ri: ${correctCount}/${totalQuestions}
📈 Foiz: ${percentage}%
⏱️ Vaqt: ${duration}s

`;

  if (percentage >= 80) resultText += '🎉 A\'lo!';
  else if (percentage >= 60) resultText += '👍 Yaxshi!';
  else resultText += '💪 Mashq qiling!';

  bot.sendMessage(chatId, resultText, {
    reply_markup: {
      inline_keyboard: [[{ text: '🏠 Bosh menyu', callback_data: 'back_main' }]]
    }
  });

  const adminMsg = `📊 Yangi test!

👤 ${user?.fullname || 'Noma\'lum'}
🆔 ${userId}
📚 ${session.section} (${session.difficulty})
✅ ${correctCount}/${totalQuestions} (${percentage}%)
📅 ${new Date().toLocaleString('uz-UZ')}`;
  bot.sendMessage(ADMIN_ID, adminMsg);

  log(userId, 'test_completed', { section: session.section, percentage });
  delete userSessions[userId];
}

function showUserResults(chatId, userId, messageId) {
  const history = readJSON(TEST_HISTORY_FILE);
  const userHistory = history[userId] || [];

  if (!userHistory.length) {
    return bot.editMessageText('📊 Test natijalari yo\'q.', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_main' }]] }
    });
  }

  let text = '📊 Natijalaringiz:\n\n';
  userHistory.slice(-10).reverse().forEach((t, i) => {
    text += `${i + 1}. ${t.section} (${t.difficulty})
   ✅ ${t.correct}/${t.total} (${t.percentage}%)
   📅 ${new Date(t.timestamp).toLocaleString('uz-UZ')}

`;
  });

  bot.editMessageText(text, {
    chat_id: chatId, message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_main' }]] }
  });
}

function showPendingUsers(chatId, messageId) {
  const pending = readJSON(PENDING_FILE);
  const list = Object.entries(pending);

  if (!list.length) {
    return bot.editMessageText('✅ Kutilayotgan foydalanuvchilar yo\'q.', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
    });
  }

  let text = '👥 Kutilayotganlar:\n\n';
  list.forEach(([id, u]) => {
    text += `👤 ${u.fullname}
🆔 ${id}
📅 ${new Date(u.timestamp).toLocaleString('uz-UZ')}

`;
  });

  bot.editMessageText(text, {
    chat_id: chatId, message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
  });
}

function showApprovedUsers(chatId, messageId) {
  const users = readJSON(USERS_FILE);
  const list = Object.entries(users);

  if (!list.length) {
    return bot.editMessageText('❌ Tasdiqlangan foydalanuvchilar yo\'q.', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
    });
  }

  let text = '✅ Tasdiqlangan:\n\n';
  list.slice(-20).forEach(([id, u]) => {
    text += `👤 ${u.fullname}\n🆔 ${id}\n\n`;
  });

  bot.editMessageText(text, {
    chat_id: chatId, message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
  });
}

function showAllResults(chatId, messageId) {
  const history = readJSON(TEST_HISTORY_FILE);
  const allResults = [];

  Object.entries(history).forEach(([uid, tests]) => {
    tests.forEach(t => allResults.push({ userId: uid, ...t }));
  });

  allResults.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  if (!allResults.length) {
    return bot.editMessageText('📊 Natijalar yo\'q.', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
    });
  }

  const users = readJSON(USERS_FILE);
  let text = '📊 Barcha natijalar:\n\n';

  allResults.slice(0, 15).forEach((r, i) => {
    const u = users[r.userId];
    text += `${i + 1}. ${u?.fullname || 'Noma\'lum'}\n   ${r.section} (${r.difficulty})\n   ✅ ${r.correct}/${r.total} (${r.percentage}%)\n\n`;
  });

  bot.editMessageText(text, {
    chat_id: chatId, message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
  });
}

function showLogs(chatId, messageId) {
  const logs = readJSON(LOGS_FILE);
  const recent = logs.slice(-20).reverse();

  if (!recent.length) {
    return bot.editMessageText('📝 Loglar yo\'q.', {
      chat_id: chatId, message_id: messageId,
      reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
    });
  }

  let text = '📝 Loglar:\n\n';
  recent.forEach((l, i) => {
    text += `${i + 1}. ${l.action}
   👤 ${l.userId}
   📅 ${new Date(l.timestamp).toLocaleString('uz-UZ')}

`;
  });

  bot.editMessageText(text, {
    chat_id: chatId, message_id: messageId,
    reply_markup: { inline_keyboard: [[{ text: '⬅️ Orqaga', callback_data: 'back_admin' }]] }
  });
}

function saveEditedQuestion(chatId, userId) {
  const session = userSessions[userId];
  const section = session.editSection;
  const difficulty = session.editDifficulty;
  const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
  
  const testsData = readJSON(testFile);
  testsData[difficulty][session.editQuestionIndex] = session.currentQuestion;
  writeJSON(testFile, testsData);
  
  // Reload TESTS_DB
  delete require.cache[require.resolve('./database/tests')];
  Object.assign(TESTS_DB, require('./database/tests'));
  
  bot.sendMessage(chatId, '✅ Savol muvaffaqiyatli tahrirlandi!', {
    reply_markup: {
      inline_keyboard: [
        [{ text: '✏️ Yana tahrirlash', callback_data: 'admin_edit_question' }],
        [{ text: '🏠 Admin paneli', callback_data: 'back_admin' }]
      ]
    }
  });
  
  log(userId, 'question_edited', { section, difficulty, questionId: session.currentQuestion.id });
  delete userSessions[userId];
  userSessions[userId] = { isAdmin: true };
}

function showQuestionsPage(chatId, messageId, userId) {
  const session = userSessions[userId];
  const section = session.viewSection;
  const difficulty = session.viewDifficulty;
  const page = session.viewPage || 0;
  
  const testFile = path.join(__dirname, 'database', `${section.toLowerCase()}_tests.json`);
  const testsData = readJSON(testFile);
  const questions = testsData[difficulty] || [];
  
  const questionsPerPage = 5;
  const totalPages = Math.ceil(questions.length / questionsPerPage);
  const start = page * questionsPerPage;
  const end = start + questionsPerPage;
  const pageQuestions = questions.slice(start, end);
  
  let text = `📚 ${section} - ${difficulty === 'easy' ? 'Oson' : 'Qiyin'}\n`;
  text += `Sahifa ${page + 1}/${totalPages} (Jami: ${questions.length})\n\n`;
  
  pageQuestions.forEach((q, idx) => {
    const qNum = start + idx + 1;
    text += `${qNum}. ${q.question}\n`;
    q.options.forEach((opt, optIdx) => {
      const marker = optIdx === q.correct ? '✅' : '▫️';
      text += `   ${marker} ${opt}\n`;
    });
    text += '\n';
  });
  
  const keyboard = [];
  const navRow = [];
  
  if (page > 0) {
    navRow.push({ text: '⬅️ Oldingi', callback_data: `view_page_${page - 1}` });
  }
  if (page < totalPages - 1) {
    navRow.push({ text: 'Keyingi ➡️', callback_data: `view_page_${page + 1}` });
  }
  
  if (navRow.length > 0) keyboard.push(navRow);
  keyboard.push([{ text: '🏠 Orqaga', callback_data: 'admin_view_questions' }]);
  
  bot.editMessageText(text, {
    chat_id: chatId,
    message_id: messageId,
    reply_markup: { inline_keyboard: keyboard }
  });
}

console.log('✅ Bot ishga tushdi!');
