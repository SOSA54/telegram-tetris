const express = require('express');
const TelegramBot = require('node-telegram-bot-api');
const app = express();
const path = require('path');

// Replace with your actual bot token
const token = '6550713692:AAFgxj5vxTE4oUYk6pkbwM1n2bSsooDwl14'; 

const bot = new TelegramBot(token, { polling: true });
const gameUrl = 'https://dc68-46-123-240-154.ngrok-free.app/telegram-tetris.html'; // Replace with your ngrok URL

// Serve static files from the specified directory
//app.use(express.static(path.join(__dirname, '/jstetris-master/jstetris-master/src')));

app.use((req, res, next) => {
    if (req.path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (req.path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    }
    next();
  });
  
// Serve the Tetris HTML game file
app.get('/telegram-tetris.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'telegram-tetris.html'));
});

// Handle '/play' command
bot.onText(/\/play/, (msg) => {
  bot.sendGame(msg.chat.id, 'NWC_1v1_Tetris', {
    reply_markup: JSON.stringify({
      inline_keyboard: [[{ text: 'Play', callback_game: { game_short_name: 'NWC_1v1_Tetris' } }]]
    })
  });
});

// Handle callback queries
bot.on('callback_query', (query) => {
  if (query.game_short_name === 'NWC_1v1_Tetris') {
    bot.answerCallbackQuery(query.id, { url: gameUrl });
  } else {
    bot.answerCallbackQuery(query.id, { text: "Sorry, game not found!" });
  }
});

// General message handler
bot.on('message', (msg) => {
  const chatId = msg.chat.id;
  bot.sendMessage(chatId, 'Received your message');
});

app.listen(8080, () => {
  console.log('Server is running on port 8080');
});
