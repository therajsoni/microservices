require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");
const helmet = require("helmet");
const cors = require("cors");
const mediaRoutes = require("./routes/media-routes.js");
const logger = require("./utils/logger.js");
const { errorHandler } = require("./middleware/errorHandler.js");
const { connectRabbitMQ, consumeEvent } = require("./utils/rabbitmq.js");
const {
  handlePostDeleted,
} = require("./eventHandlers/media-event-handlers.js");
const app = express();
const PORT = process.env.PORT || 3003;
const fun = async () => {
  await mongoose
    .connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then(() => logger.info("Connected to mongodb"))
    .catch((e) => logger.error("Mongo connection error", e));
};
fun();
// middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  logger.info(`Received ${req.method} request to ${req.url}`);
  logger.info(`Request body , ${req.body}`);
  next();
});

app.use("/api/media", mediaRoutes);
app.use(errorHandler);

async function startServer() {
  try {
    await connectRabbitMQ();
    // consume all events
    await consumeEvent("post.deleted", handlePostDeleted);
    app.listen(PORT, () => {
      logger.info(`Media service running on post ${PORT}`);
    });
  } catch (error) {
    logger.error(`start server time`, error);
    process.exit(1);
  }
}

startServer();

//unhandled promise rejection
process.on("unhandledRejection", (reason, promise) => {
  logger.error(`Unhandled Rejection at`, promise, `reason:`, reason);
});
