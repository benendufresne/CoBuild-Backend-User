"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";

import { failActionFunction } from "@utils/appUtils";
import { authorizationHeaderObj, headerObject } from "@utils/validator";
import { SWAGGER_DEFAULT_RESPONSE_MESSAGES, SERVER } from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { reportDamageControllerV1 } from "..";
import { createReport, getReportDetails, reportListing, updateReport } from "./routeValidator";

export const reportDamageRoute = [
    {
        method: "POST",
        path: `${SERVER.API_BASE_URL}/v1/user/report-damage`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const tokenData: TokenData =
                    request.auth &&
                    request.auth.credentials &&
                    request.auth.credentials.tokenData;
                const accessToken: string = request.headers.authorization;
                const payload: ReportDamageRequest.CreateReport = request.payload;
                const result = await reportDamageControllerV1.createReport(payload, tokenData, accessToken);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "report-damage"],
            description: "create a report damage",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                payload: createReport,
                failAction: failActionFunction
            },
            plugins: {
                "hapi-swagger": {
                    responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
                }
            }
        }
    },
    {
        method: "GET",
        path: `${SERVER.API_BASE_URL}/v1/user/report-damage`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const payload: ReportDamageRequest.GetReportDetails = request.query;
                const result = await reportDamageControllerV1.getReportDetails(payload);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "report-damage"],
            description: "get report details (User & Admin)",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                query: getReportDetails,
                failAction: failActionFunction
            },
            plugins: {
                "hapi-swagger": {
                    responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
                }
            }
        }
    },
    {
        method: "PUT",
        path: `${SERVER.API_BASE_URL}/v1/user/report-damage`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const accessToken: string = request.headers.authorization;
                const payload: ReportDamageRequest.UpdateReport = request.payload;
                const result = await reportDamageControllerV1.updateReport(payload, accessToken);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "report-damage"],
            description: "update report (User & Admin)",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                payload: updateReport,
                failAction: failActionFunction
            },
            plugins: {
                "hapi-swagger": {
                    responseMessages: SWAGGER_DEFAULT_RESPONSE_MESSAGES
                }
            }
        }
    },
    {
        method: "GET",
        path: `${SERVER.API_BASE_URL}/v1/user/report-list`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const tokenData: TokenData =
                    request.auth &&
                    request.auth.credentials &&
                    request.auth.credentials.tokenData;
                const payload: ReportDamageRequest.ReportListing = request.query;
                const result = await reportDamageControllerV1.getReportListing(payload, tokenData);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "report-damage"],
            description: "get reports listing (User & Admin)",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                query: reportListing,
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
