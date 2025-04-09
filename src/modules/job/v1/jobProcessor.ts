import * as Bull from "bull";
import { bullService } from "@lib/bull";
import { jobDaoV1 } from "..";
import { SERVER } from "@config/environment";

/**
 * Processes a scheduled job by executing the corresponding action.
 * Logs the job details and outcome of the operation.
 * @param {Bull.Job} job The job to be processed, containing the job data.
 * @returns {Promise<object>} The result of the scheduled action.
 * @throws Will throw an error if the job processing fails.
 */
const processScheduleJob = async (job: Bull.Job) => {
  try {
    console.log("Processing scheduled job:", job.id, job.data);

    const params = job.data;
    const result = await jobDaoV1.performScheduledAction(params);

    console.log(`Scheduled job ${job.id} completed successfully.`);
    return result;
  } catch (error) {
    console.error(`Error processing job ${job.id}:`, error);
    throw error;
  }
};

// Function to start processing jobs
export const startJobProcessor = async () => {
  const queueName = SERVER.JOBS_QUEUE_NAME;
  const queue = bullService.getQueue(queueName);
  console.log(`Starting Bull processor for queue: ${queueName}`);
  queue.process(processScheduleJob);
};
