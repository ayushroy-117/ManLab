const express = require("express");
const { copyS3Folder } = require("./aws");

function initHttp(app) {
    app.use(express.json());

    app.post("/project", async (req, res) => {
        // Hit a database to ensure this slug isn't taken already
        const { replId, language } = req.body;

        if (!replId) {
            res.status(400).send("Bad request");
            return;
        }

        await copyS3Folder(`base/${language}`, `code/${replId}`);

        res.send("Project created");
    });
}

module.exports = {
    initHttp,
};
