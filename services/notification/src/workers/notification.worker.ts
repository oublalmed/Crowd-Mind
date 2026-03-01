import { Worker, Job } from 'bullmq';
import { createBullMQConnection } from '../redis';
import { notificationService } from '../services/notification.service';
import { config } from '../config';

interface ScheduledNotificationJob {
  notificationId: string;
  userId: string;
  payload: {
    type: string;
    channel: string;
    title: string;
    body: string;
    data?: Record<string, string>;
  };
}

/**
 * Start a BullMQ worker that processes scheduled notifications.
 * When a delayed job fires, it sends the push notification via the notification service.
 */
export async function startNotificationWorker(): Promise<Worker> {
  const connection = createBullMQConnection();

  const worker = new Worker<ScheduledNotificationJob>(
    config.bullmq.queueName,
    async (job: Job<ScheduledNotificationJob>) => {
      const { notificationId, userId, payload } = job.data;

      console.log(
        `[NotificationWorker] Processing scheduled notification ${notificationId} for user ${userId}`
      );

      const result = await notificationService.sendPushNotification(userId, {
        type: payload.type,
        channel: payload.channel,
        title: payload.title,
        body: payload.body,
        data: payload.data,
      });

      if (!result.success) {
        console.warn(
          `[NotificationWorker] Failed to deliver notification ${notificationId}:`,
          result.pushResult
        );
      }

      return result;
    },
    {
      connection,
      concurrency: config.bullmq.concurrency,
      limiter: {
        max: 100,
        duration: 1000,
      },
    }
  );

  worker.on('completed', (job) => {
    console.log(
      `[NotificationWorker] Job ${job.id} completed for notification ${job.data.notificationId}`
    );
  });

  worker.on('failed', (job, err) => {
    console.error(
      `[NotificationWorker] Job ${job?.id} failed:`,
      err.message
    );
  });

  worker.on('error', (err) => {
    console.error('[NotificationWorker] Worker error:', err.message);
  });

  return worker;
}
