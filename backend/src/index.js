const dotenv = require("dotenv");
dotenv.config();
const express = require("express");
const { createServer } = require("http");
const { initWs } = require("./ws");
const { initHttp } = require("./http");
const cors = require("cors");

const app = express();
app.use(cors());
const httpServer = createServer(app);

initWs(httpServer);
initHttp(app);

const port = process.env.PORT || 3001;
httpServer.listen(port, () => {
  console.log(`listening on *:${port}`);
});
