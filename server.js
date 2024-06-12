require("dotenv").config();

const express = require("express");
const morgan = require("morgan");
const buildAssociations = require('./models/index')

const api = require("./api");
const sequelize = require("./lib/sequelize");
const { redisClient } = require("./lib/redis");
const { connectToRabbitMQ } = require("./lib/rabbitmq")

const app = express();
const port = process.env.PORT || 8000;

app.use(morgan("dev"));
app.use(express.json());

app.use("/", api);

// Generic 404 catcher
app.use("*", (req, res, next) => res.status(404).send({error: `Resource does not exist. Requested resource: ${req.originalUrl}`}));

// Generic 500 catcher
app.use("*", function (err, req, res, next) {
    console.log("ERROR:", err);
    res.status(500).send({error: `Internal server error. Try again later.`});
});

buildAssociations();

sequelize.sync().then(async function() {
    await redisClient.connect();
    await connectToRabbitMQ()
    app.listen(port, () => console.log("Server started on port", port))
})
