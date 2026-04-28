import { Kafka, logLevel, type Consumer } from 'kafkajs';
import { env } from '../config/env.js';

const kafka = new Kafka({
  clientId: env.KAFKA_CLIENT_ID,
  brokers: env.KAFKA_BROKERS,
  logLevel: logLevel.NOTHING,
});

export const kafkaProducer = kafka.producer();

export function createKafkaConsumer(groupId: string): Consumer {
  return kafka.consumer({ groupId });
}

export async function connectKafkaInfrastructure() {
  const admin = kafka.admin();
  await admin.connect();
  await admin.createTopics({
    waitForLeaders: true,
    topics: [
      { topic: env.KAFKA_CHAT_MESSAGES_TOPIC },
      { topic: env.KAFKA_CHAT_EVENTS_TOPIC },
    ],
  });
  await admin.disconnect();
  await kafkaProducer.connect();
}

export async function disconnectKafkaInfrastructure() {
  await kafkaProducer.disconnect();
}
