const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let players = { X: null, O: null };
let users = {};
let board = Array(9).fill("");
let currentTurn = "X";

function checkWinner() {
    const winPatterns = [
        [0,1,2],[3,4,5],[6,7,8],
        [0,3,6],[1,4,7],[2,5,8],
        [0,4,8],[2,4,6]
    ];

    for (let [a,b,c] of winPatterns) {
        if (board[a] && board[a] === board[b] && board[a] === board[c]) {
            return board[a];
        }
    }
    return null;
}

io.on("connection", (socket) => {

    socket.on("join", (name) => {
        users[socket.id] = { name, role: "spectator" };
        io.emit("lobby", users);
    });

    socket.on("bePlayer", () => {
        if (!players.X) {
            players.X = socket.id;
            users[socket.id].role = "X";
        } else if (!players.O) {
            players.O = socket.id;
            users[socket.id].role = "O";
        }
        io.emit("lobby", users);
    });

    socket.on("beSpectator", () => {
        if (players.X === socket.id) players.X = null;
        if (players.O === socket.id) players.O = null;

        users[socket.id].role = "spectator";
        io.emit("lobby", users);
    });

    socket.on("move", (index) => {
        const user = users[socket.id];
        if (!user) return;

        if (user.role !== currentTurn) return;
        if (board[index] !== "") return;

        board[index] = user.role;

        const winner = checkWinner();

        if (winner) {
            // 🔥 1. ส่งกระดานล่าสุดก่อน
            io.emit("update", { board, currentTurn });

            // 🔥 2. หน่วงให้ render
            setTimeout(() => {
                io.emit("gameOver", winner);

                // 🔥 3. รีเซ็ต
                board = Array(9).fill("");
                currentTurn = "X";

                setTimeout(() => {
                    io.emit("update", { board, currentTurn });
                }, 500);

            }, 300);

        } else {
            currentTurn = currentTurn === "X" ? "O" : "X";
            io.emit("update", { board, currentTurn });
        }
    });

    socket.on("reset", () => {
        board = Array(9).fill("");
        currentTurn = "X";
        io.emit("update", { board, currentTurn });
    });

    socket.on("disconnect", () => {
        if (players.X === socket.id) players.X = null;
        if (players.O === socket.id) players.O = null;

        delete users[socket.id];
        io.emit("lobby", users);
    });
});

app.use(express.static("public"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log("Server running"));