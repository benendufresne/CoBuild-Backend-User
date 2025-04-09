"use strict";

import * as _ from "lodash";
import { getRandomOtp, qrCodeBufferGenerator } from "@utils/appUtils";
import {
  MESSAGES,
  SERVER,
  JOB_TYPE,
} from "@config/index";
import { imageUtil } from "@lib/index";
import { axiosService } from "@lib/axiosService";
import { jobDaoV1 } from "..";
import { bullService } from "@lib/bull";
const AWS = require("aws-sdk");
export class JobController {
  constructor() {
  }
  /**
   * @description Create new job
   * @param {JobRequest.CreateJob} params Job details
   * @returns {Promise<object>} Created job details
   */
  async createJob(params: JobRequest.CreateJob) {
    try {

      const jobExists = await jobDaoV1.jobExists(params)
      if (jobExists)
        return Promise.reject(MESSAGES.ERROR.JOB_ALREADY_EXISTS);
      params.jobIdString = `CB${getRandomOtp(6)}`;
      const deepLink = `${SERVER.DEEPLINK_URL}jobId=${params.jobIdString}`;
      const doorTag = deepLink
      const qrBuffer = await qrCodeBufferGenerator(doorTag);
      const qrUrl = await imageUtil.uploadToS3(`${params.jobIdString}.png`, qrBuffer, "image/png");
      params.doorTag = `https://${SERVER.S3.FILE_BUCKET_URL}/exportFiles/${params.jobIdString}.png`;
      let data = await jobDaoV1.createJob(params);

      return MESSAGES.SUCCESS.CREATE_JOB(data)
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Get job details by job id
   * @param {JobRequest.GetJob} params Job id
   * @returns {Promise<object>} Job details
   */
  async getJobDetails(params: JobRequest.GetJob) {
    try {
      let data = await jobDaoV1.getJobDetails(params.jobId);
      return MESSAGES.SUCCESS.JOB_DETAILS(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Update job details
   * @param {JobRequest.UpdateJob} params Job details
   * @returns {Promise<object>} Updated job details
   */
  async updateJobDetails(params: JobRequest.UpdateJob) {
    try {
      const jobDetails = await jobDaoV1.getJobDetails(params.jobId)
      if (params.status && params.status == JOB_TYPE.SCHEDULED && jobDetails.status != JOB_TYPE.SCHEDULED)
        await jobDaoV1.removeScheduleFromJob(params.jobId)

      if ((params.title && params.title != jobDetails.title) || (params.location && (params.location.coordinates[0] != jobDetails.location.coordinates[0] && params.location.coordinates[1] != jobDetails.location.coordinates[1]))) {
        const jobFilter = { title: params.title, location: params.location }
        const jobExists = await jobDaoV1.duplicateJobExists(jobFilter)
        if (jobExists)
          return Promise.reject(MESSAGES.ERROR.JOB_ALREADY_EXISTS);
      }
      if (params.status == JOB_TYPE.COMPLETED && jobDetails.status != JOB_TYPE.COMPLETED)
        params.completedAt = Date.now();
      let data = await jobDaoV1.updateJobDetails(params);
      return MESSAGES.SUCCESS.UPDATE_JOB(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Get list of jobs
   * @param {JobRequest.JobList} params Job filter
   * @returns {Promise<object>} Job list
   */
  async getJobList(params: JobRequest.JobList) {
    try {
      let data = await jobDaoV1.jobListing(params);
      return MESSAGES.SUCCESS.GET_JOB_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Get list of job id
   * @returns {Promise<object>} Job id list
   */
  async getJobDropdownList() {
    try {
      let data = await jobDaoV1.jobDropdownList();
      return MESSAGES.SUCCESS.GET_JOB_ID_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Schedule job
   * @param {JobRequest.scheduleJob} params Job id and schedule time
   * @returns {Promise<object>} Scheduled job details
   */
  async scheduleJob(params: JobRequest.scheduleJob) {
    try {
      const job = await jobDaoV1.getJobDetails(params.jobId);
      if (!job)
        return Promise.reject(MESSAGES.ERROR.JOB_NOT_FOUND);
      if (job.schedule)
        return Promise.reject(MESSAGES.ERROR.JOB_ALREADY_SCHEDULED)

      const scheduledTime = new Date(params.schedule).getTime();
      const currentTime = Date.now();
      if (scheduledTime < currentTime)
        return Promise.reject(MESSAGES.ERROR.INVALID_SCHEDULE_TIME);
      const delay = Math.max(scheduledTime - currentTime, 0);

      const queueName = SERVER.JOBS_QUEUE_NAME;
      console.log({queueName})
      await bullService.addJob(queueName, params, {
        delay,
        attempts: 3,
      });
      console.log("after adding to queue")
      const data = await jobDaoV1.updateJobDetails(params);
      console.log("after update")
      return MESSAGES.SUCCESS.SCHEDULE_JOB(data);
    } catch (error) {
      console.error("Error scheduling job:", error);
      throw error;
    }
  }

  /**
   * @description Get list of service ids
   * @param {JobRequest.ServiceIdList} params Service id filter
   * @param {string} accessToken Access token
   * @returns {Promise<object>} Service id list
   */
  async getServiceDropdownList(params: JobRequest.ServiceIdList, accessToken: string) {
    try {
      let data = await axiosService.getData({ "url": SERVER.ADMIN_APP_URL + SERVER.SERVICE_CATEGORY_LIST, "payload": params, auth: accessToken });
      return MESSAGES.SUCCESS.GET_REQ_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Import jobs
   * @param {JobRequest.importJobs} params Job details
   * @param {string} accessToken Access token
   * @returns {Promise<object>} Success message
   */
  async importJobs(params: JobRequest.importJobs, accessToken: string) {
    try {
      await jobDaoV1.importJobs(params);
      return MESSAGES.SUCCESS.DEFAULT;
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @description Get list of jobs by category
   * @param {JobRequest.jobListByCategory} params Job filter
   * @returns {Promise<object>} Job list
   */
  async getJobByCategory(params: JobRequest.jobListByCategory) {
    try {
      let data = await jobDaoV1.jobsByCategory(params);
      return MESSAGES.SUCCESS.GET_JOB_ID_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }


  async createJobChat(params: JobRequest.GetJob, accessToken: string) {
    try {
      console.log({params})
      const chat = await axiosService.post({ "url": SERVER.CHAT_APP_URL + SERVER.JOB, "body": params, auth: accessToken });
      return MESSAGES.SUCCESS.JOB_CHAT_DETAILS(chat.data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

}

export const jobController = new JobController();
