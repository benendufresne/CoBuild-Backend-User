"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";

import { failActionFunction } from "@utils/appUtils";
import { authorizationHeaderObj, headerObject } from "@utils/validator";
import { SWAGGER_DEFAULT_RESPONSE_MESSAGES, SERVER } from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { dashboardControllerV1 } from "..";
import { getDashboardDetails } from "./routeValidator";

export const dashboardRoute = [
    {
        method: "GET",
        path: `${SERVER.API_BASE_URL}/v1/user/dashboard`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const query: DashboardRequest.GetDetails = request.query;
                const result = await dashboardControllerV1.getDashboardDetails(query);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "internal"],
            description: "fetch dashboard details",
            auth: {
                strategies: ["AdminAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                query: getDashboardDetails,
                failAction: failActionFunction
            },
            plugins: {
                "hapi-swagger": {
                    responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
                }
            }
        }
    },

];
