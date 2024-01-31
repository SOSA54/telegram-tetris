const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const bcrypt = require('bcrypt');
const session = require('express-session');
const Tetris = require('/Users/a1234/Downloads/telegram-tetris/jstetris-master/jstetris-master/src/tetris');
const bodyParser = require('body-parser');
const app = express();
const cors = require('cors');
const server = require('http').createServer(app);

const io = socketIO(server, {
  cors: {
    origin: "*", 
    methods: ["GET", "POST"]
  }
});
const gameStartTimes = {};

app.use(cors());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json());
app.use(session({
    secret: 'your_secret_key', // Replace with your secret key
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false } // Set to true if using https
}));

app.get('/signup.html', (req, res) => res.sendFile(__dirname + '/signup.html'));
app.get('/homepage.html', (req, res) => res.sendFile(__dirname + '/homepage.html'));

let waitingPlayer = null;
const playerMapping = {};
let tetrisGame;

app.use((req, res, next) => {
  if (req.path.endsWith('.js')) {
    res.setHeader('Content-Type', 'application/javascript');
  } else if (req.path.endsWith('.css')) {
    res.setHeader('Content-Type', 'text/css');
  }
  next();
});


app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const user = await prisma.users.findUnique({ where: { email } });
        if (user) {
            // Assuming you have a method to compare the password with the hashed password in the database
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            if (isValidPassword) {
                // Store user ID and username in the session
                req.session.userId = user.user_id;
                req.session.username = user.username;
                console.log('LOGGED IN')
                // Send response to client
                res.json({ status: 'success', message: 'Login successful', username: user.username });
            } else {
                res.status(401).send('Incorrect password');
            }
        } else {
            res.status(404).send('User not found');
        }
    } catch (error) {
        console.error('Error on login:', error);
        res.status(500).send('Internal server error');
    }
});

app.get('/check-login', (req, res) => {
    if (req.session.userId) {
        res.json({ loggedIn: true, username: req.session.username });
    } else {
        res.status(401).json({ loggedIn: false });
    }
});

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    if (waitingPlayer) {
        console.log(`Pairing with: ${waitingPlayer.id}`);
        // Start the game for both players
        io.to(socket.id).emit('startGame');
        io.to(waitingPlayer.id).emit('startGame');
        console.log(`GAME WAS STARTED`);
        
        playerMapping[socket.id] = waitingPlayer.id;
        playerMapping[waitingPlayer.id] = socket.id;
        waitingPlayer = null;
    } else {
        waitingPlayer = socket;
        console.log('New waiting player:', socket.id);
    }

  socket.on('disconnect', () => {
    console.log('A player disconnected:', socket.id);
    if (waitingPlayer === socket) {
      waitingPlayer = null;
    }
    const opponentId = playerMapping[socket.id];
    delete playerMapping[socket.id];
    delete playerMapping[opponentId];
    if (opponentId && io.sockets.sockets.get(opponentId)) {
      io.to(opponentId).emit('opponentDisconnected');
    }
  });

  socket.on('gameOver', (data) => {
    const loserId = data.loserId;
    const winnerId = playerMapping[loserId];
    if (winnerId) {
      io.to(loserId).emit('gameResult', { result: 'lose' });
      io.to(winnerId).emit('gameResult', { result: 'win' });

      const endTime = new Date();
      const startTime = gameStartTimes[winnerId] || new Date();
      console.log(`Game started at: ${startTime}`);
      console.log(`Game ended at: ${endTime}`);
      console.log(`Winner: ${winnerId}`);
      console.log(`Loser: ${loserId}`);

      setTimeout(() => {
        io.to(loserId).emit('redirect', '/servers-tetris.html');
        io.to(winnerId).emit('redirect', '/servers-tetris.html');
      }, 5000);
    }
  });
});

server.listen(3001, '0.0.0.0', () => console.log('Server listening on port 3001'));