const { Server } = require("socket.io");
const { Server: HttpServer } = require("http");
const { fetchS3Folder, saveToS3 } = require("./aws");
const path = require("path");
const { fetchDir, fetchFileContent, saveFile } = require("./fs");
const { TerminalManager } = require("./pty");

const terminalManager = new TerminalManager();

function initWs(httpServer) {
    const io = new Server(httpServer, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });
    
    io.on("connection", async (socket) => {
        const replId = socket.handshake.query.roomId;

        if (!replId) {
            socket.disconnect();
            terminalManager.clear(socket.id);
            return;
        }

        await fetchS3Folder(`code/${replId}`, path.join(__dirname, `../tmp/${replId}`));
        socket.emit("loaded", {
            rootContent: await fetchDir(path.join(__dirname, `../tmp/${replId}`), "")
        });

        initHandlers(socket, replId);
    });
}

function initHandlers(socket, replId) {
    socket.on("disconnect", () => {
        console.log("user disconnected");
    });

    socket.on("fetchDir", async (dir, callback) => {
        const dirPath = path.join(__dirname, `../tmp/${replId}/${dir}`);
        const contents = await fetchDir(dirPath, dir);
        callback(contents);
    });

    socket.on("fetchContent", async ({ path: filePath }, callback) => {
        const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        const data = await fetchFileContent(fullPath);
        callback(data);
    });

    socket.on("updateContent", async ({ path: filePath, content }) => {
        const fullPath = path.join(__dirname, `../tmp/${replId}/${filePath}`);
        await saveFile(fullPath, content);
        await saveToS3(`code/${replId}`, filePath, content);
    });

    socket.on("requestTerminal", async () => {
        terminalManager.createPty(socket.id, replId, (data, id) => {
            socket.emit('terminal', {
                data: Buffer.from(data, "utf-8")
            });
        });
    });
    
    socket.on("terminalData", async ({ data, terminalId }) => {
        terminalManager.write(socket.id, data);
    });
}

module.exports = {
    initWs
};
