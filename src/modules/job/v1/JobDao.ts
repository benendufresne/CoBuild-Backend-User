"use strict";
import { BaseDao } from "@modules/baseDao/BaseDao";
import { STATUS, DB_MODEL_REF, JOB_TYPE } from "@config/constant";
import { escapeRegex, toObjectId } from "@utils/appUtils";
import { Types } from "mongoose";

export class JobDao extends BaseDao {
  private jobModel: any;
  constructor() {
    super();
    this.jobModel = DB_MODEL_REF.JOB;
  }

  /**
   * Checks if a job already exists with same title and location.
   * @param {JobRequest.CreateJob} params Job details
   * @returns {Promise<object>} Job details if exists
   */
  async jobExists(params: JobRequest.CreateJob) {
    try {
      const filter = {
        title: params.title,
        location: params.location,
        status: { $ne: STATUS.DELETED }
      }
      return await this.findOne(this.jobModel, filter);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Checks if a job already exists with same title and location.
   * @param {JobRequest.JobExists} params Job details
   * @returns {Promise<object>} Job details if exists
   */
  async duplicateJobExists(params: JobRequest.JobExists) {
    try {
      const filter = {
        status: { $ne: STATUS.DELETED }
      }
      if (params.title)
        filter['title'] = params.title
      if (params.location)
        filter['location'] = params.location

      return await this.findOne(this.jobModel, filter);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Creates a new job entry in the database.
   * @param {JobRequest.CreateJob} params - The details of the job to be created.
   * @returns {Promise<object>} The created job entry.
   * @throws Will throw an error if there is an issue with saving the job.
   */
  async createJob(params: JobRequest.CreateJob) {
    try {
      return await this.save(this.jobModel, params);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

/**
 * Retrieves job details by job ID.
 * @param {string} jobId - The ID of the job to retrieve. Can be a MongoDB ObjectId or a custom jobIdString.
 * @returns {Promise<object>} The job details if found.
 * @throws Will log and throw an error if there is an issue with the database query.
 */
  getJobDetails(jobId: string) {
    try {
      const validMongoId = Types.ObjectId.isValid(jobId)
      let filter = {}
      if (validMongoId)
        filter = { _id: jobId }
      else
        filter = { jobIdString: jobId }

      return this.findOne(this.jobModel, filter);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Updates a job entry with the given details.
   * @param {JobRequest.UpdateJob} params - The details to be updated.
   * @returns {Promise<object>} The updated job entry.
   * @throws Will log and throw an error if there is an issue with the database query.
   */
  updateJobDetails(params: JobRequest.UpdateJob) {
    try {
      return this.findOneAndUpdate(this.jobModel, { _id: params.jobId }, params, { new: true });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }


  /**
   * Removes the schedule from a job by unsetting its schedule field.
   * @param {string} jobId - The ID of the job from which to remove the schedule.
   * @returns {Promise<object>} The updated job entry with the schedule removed.
   * @throws Will log and throw an error if there is an issue with the database query.
   */
  removeScheduleFromJob(jobId: string) {
    try {
      const params = { $unset: { schedule: "" } }
      return this.findOneAndUpdate(this.jobModel, { _id: jobId }, params, { new: true });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

/**
 * Retrieves a paginated list of jobs based on various filter criteria.
 * 
 * @param {JobRequest.JobList} params - The job listing filters, including:
 *   - coordinatesLatitude: Optional latitude coordinate for geolocation filtering.
 *   - coordinatesLongitude: Optional longitude coordinate for geolocation filtering.
 *   - serviceCategory: Optional array of service category IDs to filter jobs.
 *   - pageNo: The page number for pagination.
 *   - limit: The number of items per page.
 *   - searchKey: Optional search string to filter jobs by title or address.
 *   - sortBy: Optional field name to sort the results by.
 *   - sortOrder: Optional sort order (1 for ascending, -1 for descending).
 *   - priority: Optional array of priority levels to filter jobs.
 *   - status: Optional array of job statuses to filter.
 *   - fromDate: Optional start date for filtering jobs by creation date.
 *   - toDate: Optional end date for filtering jobs by creation date.
 * 
 * @returns {Promise<object>} A promise that resolves to a paginated list of jobs, including job details and geolocation distance if applicable.
 * 
 * @throws Will throw an error if there is an issue with the database query.
 */
  async jobListing(params: JobRequest.JobList) {
    try {

      let { coordinatesLatitude, coordinatesLongitude, serviceCategory, pageNo, limit, searchKey, sortBy, sortOrder } = params;
      const aggPipe = [];

      if (coordinatesLatitude && coordinatesLongitude) {
        let coordinates: any = [coordinatesLongitude, coordinatesLatitude];
        aggPipe.push({
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            maxDistance: 50000, //50KMS
            spherical: true,
            key: "location.coordinates",
          },
        });
      }
      const match: any = {};

      if (serviceCategory) {
        const categoryArray = Array.isArray(serviceCategory)
          ? serviceCategory.flatMap((category) => {
            if (typeof category === 'string') {
              return category.split(',').map((id) => toObjectId(id.trim()));
            }
            return toObjectId(category);
          })
          : [];
        console.log("arr", categoryArray)
        match['categoryId'] = { $in: categoryArray };
      }

      if (params.priority) {
        const priorityArray = Array.isArray(params.priority)
          ? params.priority.flatMap((priority) => (typeof priority === 'string' ? priority.split(',') : priority))
          : [];
        match.priority = { $in: priorityArray };
      }

      if (params.status) {
        const statusArray = Array.isArray(params.status)
          ? params.status.flatMap((status) => (typeof status === 'string' ? status.split(',') : status))
          : [];
        match.status = { $in: statusArray };
        console.log({ statusArray })
      } else {
        match.status = { $ne: STATUS.DELETED };
      }

      if (searchKey) {
        const safeSearchKey = escapeRegex(searchKey); // Escape special characters
        match["$or"] = [
          { title: { $regex: new RegExp(safeSearchKey, "i") } },
          { 'location.address': { $regex: new RegExp(safeSearchKey, "i") } }
        ];
      }

      if (params.fromDate && !params.toDate) match.created = { "$gte": params.fromDate };
      if (params.toDate && !params.fromDate) match.created = { "$lte": params.toDate };
      if (params.fromDate && params.toDate) match.created = { "$gte": params.fromDate, "$lte": params.toDate };

      aggPipe.push({ $match: match });

      let sort: any = {};
      sortBy && sortOrder
        ? (sort = { [sortBy]: sortOrder })
        : (sort = { created: -1 });
      aggPipe.push({ $sort: sort });

      if (params.limit && params.pageNo) {
        const [skipStage, limitStage] = this.addSkipLimit(
          params.limit,
          params.pageNo
        );
        aggPipe.push(skipStage, limitStage);
      }

      let project: any = {
        _id: 1,
        title: 1,
        categoryName: 1,
        categoryId: 1,
        personalName: 1,
        location: 1,
        companyLocation: 1,
        email: 1,
        fullMobileNo: 1,
        aboutCompany: 1,
        priority: 1,
        procedure: 1,
        created: 1,
        jobIdString: 1,
        status: 1,
        schedule: 1,
        doorTag: 1,
        distance: 1
      };

      aggPipe.push({ $project: project });

      return await this.dataPaginate(
        this.jobModel,
        aggPipe,
        limit,
        pageNo,
        {},
        true
      );
    } catch (error) {
      throw error;
    }
  }


  /**
   * Fetches list of job id, title and jobIdString from db where status is scheduled and schedule does not exists.
   * @returns {Promise<object>} Job id, title and jobIdString
   */
  async jobDropdownList() {
    try {
      return await this.find(this.jobModel, { status: JOB_TYPE.SCHEDULED, schedule: { $exists: false } }, { _id: 1, title: 1, jobIdString: 1 });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @description Update job status to in progress
   * @param {JobRequest.importJobs} params Job id
   * @returns {Promise<object>} Updated job details
   */
  async performScheduledAction(params) {
    try {
      return this.findOneAndUpdate(this.jobModel, { _id: params.jobId }, { status: JOB_TYPE.IN_PROGRESS }, { new: true });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Imports jobs in bulk
   * @param {JobRequest.importJobs} params - Array of job objects
   * @returns {Promise<object>} Inserted job details
   */
  async importJobs(params: JobRequest.importJobs) {
    try {
      return this.insertMany(this.jobModel, params.jobs, {});
    } catch (error) {
      throw error;
    }
  }


/**
 * Fetches a list of jobs by category ID that are not deleted.
 * @param {JobRequest.jobListByCategory} params - Contains the category ID to filter the jobs.
 * @returns {Promise<object>} A promise that resolves to a list of job IDs.
 */
  async jobsByCategory(params: JobRequest.jobListByCategory) {
    try {
      return await this.find(this.jobModel, { categoryId: toObjectId(params.categoryId), status: { $ne: STATUS.DELETED } }, { _id: 1 });
    } catch (error) {
      throw error;
    }
  }

}

export const jobDao = new JobDao();
