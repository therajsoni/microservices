const amqp = require("amqplib");
const logger = require("./logger.js");
let connection = null;
let channel = null;
const EXCHANGE_NAME = "facebook_events";
async function connectRabbitMQ() {
  try {
    connection = await amqp.connect(process.env.REBBITMQ_URL);
    channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, "topic", {
      durable: false,
    });
    logger.info("Connected to rabbit mq");
    return channel;
  } catch (error) {
    logger.error(`Error connecting to rabbit mq`, error);
  }
}
async function publishEvent(routeingKey, message) {
  if (!channel) {
    await connectRabbitMQ();
  }
  channel.publish(
    EXCHANGE_NAME,
    routeingKey,
    Buffer.from(JSON.stringify(message))
  );
  logger.info(`Event publishing: ${routeingKey}`);
}
module.exports = { connectRabbitMQ, publishEvent };
