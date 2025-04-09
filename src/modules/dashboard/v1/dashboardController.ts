"use strict";

import * as _ from "lodash";
import {
    MESSAGES
} from "@config/index";
import { dashboardDaoV1 } from "..";

const AWS = require("aws-sdk");
export class DashboardController {
    constructor() {
    }

    /**
     * Fetches dashboard details such as total jobs, active jobs, completed jobs, cancelled jobs, total users, active users, blocked users
     * @param params - The request parameters
     * @returns The dashboard details
     */
    async getDashboardDetails(params: DashboardRequest.GetDetails) {
        try {
            const [
                totalJobs,
                activeJobs,
                completedJobs,
                cancelledJobs,
                totalUsers,
                activeUsers,
                blockedUsers
            ] = await Promise.all([
                dashboardDaoV1.getTotalJobs(params),
                dashboardDaoV1.getActiveJobs(params),
                dashboardDaoV1.getCompletedJobs(params),
                dashboardDaoV1.getCancelledJobs(params),
                dashboardDaoV1.getTotalUsers(params),
                dashboardDaoV1.getActiveUsers(params),
                dashboardDaoV1.getBlockedUsers(params)
            ]);

            return MESSAGES.SUCCESS.DASHBOARD_DETAILS({
                totalJobs,
                activeJobs,
                completedJobs,
                cancelledJobs,
                totalUsers,
                activeUsers,
                blockedUsers
            })
        }
        catch (error) {
            console.log(error)
            throw error
        }


    }

}



export const dashboardController = new DashboardController();
