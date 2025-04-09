"use strict";

/**
 * v1 routes
 */

// admin routes
import { userRoute as userRouteV1 } from "@modules/user/v1/UserRoute";
import { jobRoute as jobRouteV1 } from "@modules/job/v1/JobRoute";
import { requestRoute as requestRouteV1 } from "@modules/request/v1/RequestRoute";
import { reportDamageRouteV1 } from "@modules/reportDamage";
import { dashboardRouteV1 } from "@modules/dashboard";
// import { reportDamageRoute as reportDamageRouteV1 } from "@modules/reportDamage/v1/reportDamageRoute";
// import { reportDamageRoute as reportDamageRouteV1 } from "@modules/reportDamage/v1/reportDamageRoute";


export const routes: any = [
    ...userRouteV1,
    ...jobRouteV1,
    ...requestRouteV1,
    ...reportDamageRouteV1,
    ...dashboardRouteV1
];
