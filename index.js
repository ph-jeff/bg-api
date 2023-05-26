require("dotenv").config();
const express = require("express");
const app = express();
const cors = require("cors");
const connection = require("./db");
const userRoutes = require("./routes/users");
const authRoutes = require("./routes/auth");
const lobbyRoutes = require("./routes/lobby");
const adminRoutes = require('./routes/admin');
const agentRoutes = require('./routes/agent');
const patterRoutes = require('./routes/pattern');
const ticketRoutes = require('./routes/ticket');
const salesReportRoutes = require('./routes/salesReport');
const withdrawRoutes = require('./routes/withdraw');
const settingRoutes = require('./routes/settings');
const jwt = require("jsonwebtoken");

// database connection
connection();

// middlewares
app.use(express.json());
app.use(cors());

// routes
app.use("/api/users", userRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/lobby", lobbyRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/agent', agentRoutes);
app.use('/api/pattern', patterRoutes);
app.use('/api/ticket', ticketRoutes);
app.use('/api/sales', salesReportRoutes);
app.use('/api/withdraw', withdrawRoutes);
app.use('/api/settings', settingRoutes);



const port = process.env.PORT || 8080;
const http = require('http');
const socketIo = require('socket.io');
const server = http.createServer(app, {
    cors: {
        origin: `https://qa.igamez.online`,
        // origin: `http://localhost:3000`,
        methods: ["GET", "POST"]
    }
});

server.listen(port, console.log(`Server started on port: ${port}`));
const os = require('os');

const networkInterfaces = os.networkInterfaces();
const ips = [];

Object.keys(networkInterfaces).forEach(interfaceName => {
    const networkInterface = networkInterfaces[interfaceName];
    networkInterface.forEach(address => {
        if (!address.internal && address.family === 'IPv4') {
            ips.push(address.address);
        }
    });
});

console.log(`Server started at https://${ips[0]}:${port}`);

const io = socketIo(server);

const lobbies = {};
const { User } = require("./models/user");
const Lobby = require('./models/lobby');
const SalesReport = require('./models/salesReport');
const { clearInterval } = require("timers");
const { createBingoCard } = require("./models/bingo_card");
const Agent = require("./models/agent");
const Settings = require("./models/settings");



io.on('connection', function (socket) {
    socket.on("join", async (data) => {
        socket.join("lobby" + data.lobbyID);
        socket.data.token = data.token;
        socket.data.lobbyID = data.lobbyID;
        console.log(`Socket ${socket.id} has joined on lobby ${data.lobbyID}`);
        const lobby = await Lobby.findOne({ _id: data.lobbyID });
        io.in("lobby" + data.lobbyID).emit("new-member", { lobby: lobby });
    });

    socket.on("host-connect", async (data) => {
        const profile = data.profile
        socket.data.lobbyID = profile.hostedLobby;
        await socket.join("lobby" + profile.hostedLobby);
        console.log(`Host Socket ${socket.id} has joined on lobby ${profile.hostedLobby}`);
        const lobby = await Lobby.findOne({ _id: profile.hostedLobby });
        io.to(socket.id).emit("host-connected", { lobby: lobby });
    })

    socket.on("toggleReady", async (data) => {
        try {
            const token = data.token;  // get the JWT from the headers
            const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY); // verify the JWT and decode it
            const user = await User.findOne({ _id: decoded._id });
            const lobby = await Lobby.findOne({ _id: data.lobby_id });
            // toggle the ready status
            const member = lobby.members.find(member => member._id.equals(user._id));
            member.ready = !member.ready;
            await lobby.save();

            // emit the ready result to all sockets in the room
            io.in("lobby" + lobby._id).emit("readyToggleResult", { lobby: lobby });

            // check if all members are ready
            if (lobby.members.every(member => member.ready)) {
                const intervalID = await startGameSession(lobby._id);
                socket.data.intervalID = intervalID;
            }
        } catch (error) {
            console.log(error);
        }
    });

    socket.on("card-selected", async (data) => {
        try {
            const userID = data.userID;
            const lobby = await Lobby.findOne({ _id: socket.data.lobbyID });
            const member = lobby.members.find(member => member._id.equals(userID));
            const user = await User.findOne({ _id: userID })
            user.cards -= data.numOfCards;
            await user.save();
            let bingoCards = []
            for (let i = 0; i < data.numOfCards; i++) {
                const bingoCard = createBingoCard();
                bingoCards.push(bingoCard);
            }
            member.bingoCards = bingoCards;
            member.ready = true;
            await lobby.save();
            if (lobby.gametype == "Manual") {
                io.in("lobby" + lobby._id).emit("game-start", { lobby: lobby });
            }
            socket.to(socket.id).emit("cards-generated", { lobby: lobby })
            io.in("lobby" + lobby._id).emit("member-selected-card", { lobby: lobby })
        } catch (e) {
            console.log(e);
        }
    });

    socket.on("find-match", async (data) => {
        try {
            const jwtToken = data.token;
            //get user with token
            const decoded = jwt.verify(jwtToken, process.env.JWTPRIVATEKEY); // verify the JWT and decode it
            const user = await User.findOne({ _id: decoded._id });
            if (!user) {
                socket.emit("find-match-error", { error: "Invalid token" });
                return;
            }
            //get a list of lobby
            const lobbies = await Lobby.find({});
            //find lobby who has still available slots for members
            let availableLobby = lobbies.find((lobby) => {
                return lobby.members.length < 5 && lobby.available == true;
            });
            if (!availableLobby) {
                //create new lobby if no available lobby
                availableLobby = new Lobby({
                    name: `${user.username}'s Lobby`, members: [{
                        _id: user._id,
                        ready: false,
                    }]
                });
                await availableLobby.save();
            } else {
                //join the lobby, also set the currentlobby of the user to that lobby by its id
                availableLobby.members.push({ _id: user._id, ready: false });
                await availableLobby.save();
            }
            user.currentLobby = availableLobby._id;
            await user.save();
            //emit found match
            io.in(socket.id).emit("found-match", { lobby: availableLobby, userID: user._id });

            socket.data.token = jwtToken;
            socket.data.lobbyID = availableLobby._id;
        } catch (e) {
            console.log(e);
            socket.emit("find-match-error", { error: e.message });
        }
    });

    socket.on("join-lobby", async (data) => {
        try {
            // Verify the JWT and decode it
            const jwtToken = data.token;
            const decoded = jwt.verify(jwtToken, process.env.JWTPRIVATEKEY);
            // Find the user associated with the token
            const user = await User.findOne({ _id: decoded._id });
            if (!user) {
                socket.emit("join-lobby-error", { error: "Invalid token" });
                return;
            }
            // Find the lobby that the user wants to join
            const lobby = await Lobby.findOne({ _id: data.lobbyID });
            if (!lobby) {
                socket.emit("join-lobby-error", { error: "Lobby not found" });
                return;
            }
            if (lobby.members.length >= 5) {
                socket.emit("join-lobby-error", { error: "Lobby is full" });
                return;
            }
            // Check if the user is already in the members list
            const existingMemberIndex = lobby.members.findIndex(member => member._id.toString() === user._id.toString());
            if (existingMemberIndex !== -1) {
                // If the user is already in the members list, remove the existing entry
                lobby.members.splice(existingMemberIndex, 1);
            }

            // Add the user to the lobby's members list
            lobby.members.push({ _id: user._id, ready: false });
            lobby.save();
            // Set the user's current lobby to the joined lobby
            user.currentLobby = lobby._id;
            user.socketID = socket.id;
            user.save();
            // Emit a "lobby-joined" event to the client with the updated lobby and user ID
            io.in(socket.id).emit("lobby-joined", { lobby: lobby, userID: user._id });
            socket.data.token = jwtToken;
            socket.data.lobbyID = lobby._id;
        } catch (e) {
            console.log(e);
            socket.emit("join-lobby-error", { error: e.message });
        }
    });


    socket.on("user-reconnect-lobby", async (data) => {
        try {
            // Verify the JWT and decode it
            const jwtToken = data.token;
            const decoded = jwt.verify(jwtToken, process.env.JWTPRIVATEKEY);
            // Find the user associated with the token
            const user = await User.findOne({ _id: decoded._id });
            if (!user) {
                socket.emit("join-lobby-error", { error: "Invalid token" });
                return;
            }
            // Find the lobby that the user wants to join
            const lobby = await Lobby.findOne({ _id: data.lobbyID });
            if (!lobby) {
                socket.emit("join-lobby-error", { error: "Lobby not found" });
                return;
            }
            if (lobby.members.length >= 5) {
                socket.emit("join-lobby-error", { error: "Lobby is full" });
                return;
            }
            // // Check if the user is already in the members list
            // const existingMemberIndex = lobby.members.findIndex(member => member._id.toString() === user._id.toString());

            // console.log("Existing member? " + existingMemberIndex)
            // if (!existingMemberIndex) {
            //     // Add the user to the lobby's members list
            //     lobby.members.push({ _id: user._id, ready: false });
            //     lobby.save();
            // }

            // Set the user's current lobby to the joined lobby
            user.currentLobby = lobby._id;
            user.socketID = socket.id;
            user.save();
            // Emit a "lobby-joined" event to the client with the updated lobby and user ID
            io.in(socket.id).emit("lobby-reconnected", { lobby: lobby, userID: user._id });
            io.in(socket.id).emit("game-start", { lobby: lobby, userID: user._id });
            socket.data.token = jwtToken;
            socket.data.lobbyID = lobby._id;
        } catch (e) {
            console.log(e);
            socket.emit("join-lobby-error", { error: e.message });
        }
    });




    socket.on('disconnect', async () => {
        if (socket.data.intervalID) {
            clearInterval(socket.data.intervalID)
        }
        // try {
        //     const token = socket.data.token;
        //     if (token == null) { return; }
        //     const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY); // verify the JWT and decode it
        //     const user = await User.findOne({ _id: decoded._id });
        //     user.currentLobby = null;
        //     await user.save();
        //     console.log("user exit")
        //     const lobby = await Lobby.findOne({ _id: socket.data.lobbyID });
        //     lobby.members = lobby.members.filter(member => {
        //         return !member.equals(user._id);
        //     });
        //     await lobby.save();
        //     if (lobby.members.length === 0) {
        //         if (lobby.gametype == "Auto") {
        //             console.log("deleting");
        //             await lobby.deleteOne();
        //         }
        //     }
        //     io.in("lobby" + lobby._id).emit("readyToggleResult", { lobby: lobby })
        //     io.in("lobby" + lobby._id).emit("user-left", { lobby: lobby })
        // } catch (e) {
        //     console.log(e);
        // }
        socket.leave();
    });

    socket.on('player-leave', async () => {
        if (socket.data.intervalID) {
            clearInterval(socket.data.intervalID)
        }
        try {
            const token = socket.data.token;
            if (token == null) { return; }
            const decoded = jwt.verify(token, process.env.JWTPRIVATEKEY); // verify the JWT and decode it
            const user = await User.findOne({ _id: decoded._id });
            user.currentLobby = null;
            await user.save();
            console.log("user exit")
            const lobby = await Lobby.findOne({ _id: socket.data.lobbyID });
            lobby.members = lobby.members.filter(member => {
                return !member.equals(user._id);
            });
            await lobby.save();
            if (lobby.members.length === 0) {
                if (lobby.gametype == "Auto") {
                    console.log("deleting");
                    await lobby.deleteOne();
                }
            }
            io.in("lobby" + lobby._id).emit("readyToggleResult", { lobby: lobby })
            io.in("lobby" + lobby._id).emit("user-left", { lobby: lobby })
        } catch (e) {
            console.log(e);
        }
        socket.leave();
    });

    socket.on("winnings", async (data) => {
        try {
            const jwtToken = data.token;
            const decoded = jwt.verify(jwtToken, process.env.JWTPRIVATEKEY);
            // Find the user associated with the token
            const user = await User.findOne({ _id: decoded._id });
            await user.save();
        } catch (e) {
            console.log(e);
            socket.emit("join-lobby-error", { error: e.message });
        }
    });

    socket.on("new-winner", async (data) => {
        console.log(data)
        try {
            console.log("getting the lobby");
            const lobby = await Lobby.findOne({ _id: data.lobbyID });
            console.log(lobby);
            if (lobby) {
                console.log("adding the data")
                lobby.winners.push(data)
                lobby.save();
                console.log(lobby);
                io.in("lobby" + data.lobbyID).emit("host-to-confirm-winner", { winner: data, lobby: lobby })
            } else {
                console.log("Lobby not found", lobby, data)
            }
        } catch (e) {

        }
    })

    socket.on("host-roll", async (data) => {
        try {
            const lobby = await Lobby.findOne({ _id: socket.data.lobbyID || data.lobbyID });
            let randomNumber = Math.floor(Math.random() * 75) + 1;
            while (lobby.gameNumbers.includes(randomNumber)) {
                randomNumber = Math.floor(Math.random() * 75) + 1;
            }
            lobby.gameNumbers.push(randomNumber);
            await lobby.save();
            io.in("lobby" + lobby._id).emit("new-number-host", { lobby: lobby })
        } catch (e) {
            console.log(e)
        }
    });

    socket.on("host-roll-reset", async (data) => {
        try {
            const lobby = await Lobby.findOne({ _id: socket.data.lobbyID || data.lobbyID });
            lobby.gameNumbers = [];
            await lobby.save();
            io.in("lobby" + lobby._id).emit("new-number-host", { lobby: lobby })
        } catch (e) {
            console.log(e);
        }
    })

    socket.on("host-toggle-availability", async (data) => {
        try {
            const lobby = await Lobby.findOne({ _id: socket.data.lobbyID || data.lobbyID });
            lobby.available = !lobby.available;
            lobby.save(async function (err) {
                if (err) {
                    return;
                }
                const lobbies = await Lobby.find();
                io.emit("lobbies-availability-changed", { lobbies: lobbies });
            });

            io.in("lobby" + lobby._id).emit("lobby-availability-changed", { lobby: lobby })

        } catch (e) {
            console.log(e);
        }
    })

    socket.on("user-finding-match", async (data) => {
        try {
            const lobbies = await Lobby.find();
            console.log(lobbies);
            io.in(socket.id).emit("lobbies-found", { lobbies: lobbies });
        } catch (e) {
            console.log(e);
        }
    })

    socket.on("host-start-timer", async (data) => {
        try {
            const lobby = await Lobby.findOne({ _id: data.lobbyID });
            if (lobby) {
                lobby.timer_date_time = Date.now();
                lobby.save();
            } else {
                console.log("lobby not found")
            }
            io.in("lobby" + lobby._id).emit("timer-started", { lobby: lobby })
        } catch (e) {
            console.log(e);
        }
    })

    socket.on("host-confirmed-winner", async (data) => {
        try {
            console.log(data);
            const lobby = await Lobby.findOne({ _id: data.lobbyID });
            if (lobby) {
                const winningCard = lobby.winners[data.index];
                const user = await User.findOne({ _id: winningCard.winnerID });
                console.log(lobby);
                const memberData = lobby.members.find(member => member._id.equals(user._id));
                const settings = await Settings.find();
                const settingsObject = {};

                settings.forEach(setting => {
                    settingsObject[setting.key] = setting.value;
                });

                console.log(memberData);

                let userpoints = memberData.bingoCards.length * 20;
                let agentpoints = userpoints * (parseFloat(settingsObject["agentCommissionOnPlayerWin"]) / 100);
                userpoints -= agentpoints;
                let systempoints = userpoints * (parseFloat(settingsObject["adminCommission"]) / 100);
                agentpoints += userpoints * (parseFloat(settingsObject["agentCommissionOnPlayerWin"]) / 100);
                userpoints -= systempoints + agentpoints;
                if (user) {
                    user.points += userpoints;
                    user.save();
                    lobby.winners[data.index].confirmed = true;
                    lobby.save();
                    io.in("lobby" + lobby._id).emit("host-winner-confirmation-success", { lobby: lobby });
                    io.to(user.socketID).emit("player-won", { winnings: winningCard, points: userpoints });


                    const agent = await Agent.findOne({ referralCode: user.referralCode });

                    if (agent != null) {
                        agent.points += winningCard.pattern.points / 10;
                        agent.save();
                        const saleReport = new SalesReport({
                            date: Date.now(),
                            redeemCode: "N/A",
                            points: winningCard.pattern.points,
                            commission: agentpoints,
                            contractor: agent._id,
                            purchaser: user._id,
                            sale_type: "Card Winnings"
                        });
                        saleReport.save();
                    }


                } else {
                    console.log("user not found", user, winningCard)
                }
            } else {
                console.log("lobby not found", lobby, data)
            }
        } catch (e) {
            console.log(e)
        }
    })

});

const MAX_TURNS = 75;

const startGameSession = async (lobbyId) => {
    const lobby = await Lobby.findById(lobbyId);
    lobby.turns = 0;
    const intervalId = setInterval(async () => {
        try {
            let randomNumber = Math.floor(Math.random() * 75) + 1;
            while (lobby.gameNumbers.includes(randomNumber)) {
                randomNumber = Math.floor(Math.random() * 75) + 1;
            }
            lobby.gameNumbers.push(randomNumber);
            lobby.save();
            await io.in("lobby" + lobbyId).emit('new-number', { number: randomNumber, numbers: lobby.numbers });
            lobby.turns++;
            if (lobby.turns >= MAX_TURNS) {
                console.log(`Lobby (${lobby._id}) has finished it's game`)
                await io.in("lobby" + lobbyId).emit('game-finished', { lobby: lobby });
                clearInterval(intervalId);
            }
        } catch (e) {
            await io.in("lobby" + lobbyId).emit('game-finished', { lobby: lobby });
            console.log(e)
        }
    }, 1000);
    return intervalId;
};


module.exports = io;