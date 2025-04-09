"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";
import { STATUS, DB_MODEL_REF, JOB_TYPE } from "@config/constant";


export class DashboardDao extends BaseDao {

    private jobModel: any;
    private userModel: any;
    constructor() {
        super();
        this.jobModel = DB_MODEL_REF.JOB;
        this.userModel = DB_MODEL_REF.USER;
    }

    /**
     * This function will get the total count of jobs in given date range
     * @param {DashboardRequest.GetDetails} params - object containing fromDate and toDate
     * @returns {Promise<number>} - total count of jobs
     */
    async getTotalJobs(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    { status: { $ne: STATUS.DELETED } }
                ]
            };
            return await this.countDocuments(this.jobModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }


    /**
     * This function will get the total count of active jobs in given date range
     * @param {DashboardRequest.GetDetails} params - object containing fromDate and toDate
     * @returns {Promise<number>} - total count of active jobs
     */
    async getActiveJobs(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    { status: { $in: [JOB_TYPE.SCHEDULED, JOB_TYPE.IN_PROGRESS] } }
                    // { '$or': [{ status: { $ne: STATUS.COMPLETED } }, { completedAt: { $gte: params.toDate } }] }
                ]
            };
            return await this.countDocuments(this.jobModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * This function will get the total count of completed jobs in given date range
     * @param {DashboardRequest.GetDetails} params - object containing fromDate and toDate
     * @returns {Promise<number>} - total count of completed jobs
     */
    async getCompletedJobs(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    // { completedAt: { $gte: params.fromDate } },
                    // { completedAt: { $lte: params.toDate } },
                    { status: { $eq: STATUS.COMPLETED } }
                ]
            };
            return await this.countDocuments(this.jobModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * This function retrieves the total count of cancelled jobs within a specified date range.
     * @param {DashboardRequest.GetDetails} params - Object containing fromDate and toDate for filtering jobs.
     * @returns {Promise<number>} - Total count of cancelled jobs.
     */
    async getCancelledJobs(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    { status: { $eq: JOB_TYPE.CANCELED } }
                ]
            };
            return await this.countDocuments(this.jobModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Retrieves the total count of users created within a specified date range.
     * @param {DashboardRequest.GetDetails} params - Object containing fromDate and toDate for filtering users.
     * @returns {Promise<number>} - Total count of users.
     */
    async getTotalUsers(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    { status: { $ne: STATUS.DELETED } }
                ]
            };
            return await this.countDocuments(this.userModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Retrieves the total count of active users within a specified date range.
     * @param {DashboardRequest.GetDetails} params - Object containing fromDate and toDate for filtering users.
     * @returns {Promise<number>} - Total count of active users.
     */
    async getActiveUsers(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    { status: { $eq: STATUS.UN_BLOCKED } }
                ]
            };
            return await this.countDocuments(this.userModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    /**
     * Retrieves the total count of blocked users within a specified date range.
     * @param {DashboardRequest.GetDetails} params - Object containing fromDate and toDate for filtering users.
     * @returns {Promise<number>} - Total count of blocked users.
     */
    async getBlockedUsers(params: DashboardRequest.GetDetails) {
        try {
            const query: any = {
                $and: [
                    { created: { $gte: params.fromDate } },
                    { created: { $lte: params.toDate } },
                    // { blockedAt: { $gte: params.fromDate } },
                    // { blockedAt: { $lte: params.toDate } },
                    { status: { $eq: STATUS.BLOCKED } }
                ]
            };
            return await this.countDocuments(this.userModel, query);
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

}

export const dashboardDao = new DashboardDao();

