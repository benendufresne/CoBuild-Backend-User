import { SERVER } from '@config/environment';
import * as Bull from 'bull';

export interface JobData {
    [key: string]: any;
}

export interface JobOptions {
    delay?: number;
    attempts?: number;
    priority?: number;
    removeOnComplete?: boolean;
    removeOnFail?: boolean;
}

export class BullService {
    private queues: Map<string, Bull.Queue> = new Map();

    /**
     * Gets a reference to the Bull queue with the given name. If the queue doesn't already exist,
     * it is created with the default connection options.
     * @param queueName The name of the queue to retrieve.
     * @returns A reference to the Bull Queue object.
     */
    getQueue(queueName: string): Bull.Queue {

        const ENVIRONMENT = process.env.NODE_ENV.trim();
        let CONF: any = { 
            db: SERVER.REDIS.DB,
            host: SERVER.REDIS.HOST,
            port: parseInt(SERVER.REDIS.PORT),
        };
        
        if (ENVIRONMENT === "production" || ENVIRONMENT === "preprod") {
            CONF.tls = {};
        }

        if (!this.queues.has(queueName)) {
            const queue = new Bull(queueName, {
                redis: CONF,
            });
            this.queues.set(queueName, queue);
        }
        return this.queues.get(queueName);
    }

    /**
     * Adds a job to the specified Bull queue.
     * 
     * @param queueName The name of the queue to add the job to.
     * @param data The data for the job to be processed.
     * @param options Optional settings for the job such as delay, attempts, priority, etc.
     * @returns A promise that resolves to the Bull.Job object representing the added job.
     */
    async addJob(queueName: string, data: JobData, options?: JobOptions): Promise<Bull.Job> {
        const queue = this.getQueue(queueName);
        console.log("Adding job to queue:", queueName, data);
        console.log("Options :", options);

        return queue.add(data, {
            delay: options?.delay || 0,
            attempts: options?.attempts || 1,
            priority: options?.priority || 1,
            removeOnComplete: options?.removeOnComplete ?? true,
            removeOnFail: options?.removeOnFail ?? false,
        });
    }
}

export const bullService = new BullService();
