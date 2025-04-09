"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";

import { failActionFunction } from "@utils/appUtils";
import { authorizationHeaderObj, headerObject } from "@utils/validator";
import { SWAGGER_DEFAULT_RESPONSE_MESSAGES, SERVER } from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { createRequest, getRequestDetails, reqListing, reqListingByCategory, updateRequest } from "./routeValidator";
import { requestControllerV1 } from "..";

export const requestRoute = [
    {
        method: "POST",
        path: `${SERVER.API_BASE_URL}/v1/user/request`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const tokenData: TokenData =
                    request.auth &&
                    request.auth.credentials &&
                    request.auth.credentials.tokenData;
                const accessToken: string = request.headers.authorization;
                const payload: ReqRequest.CreateReq = request.payload;
                const result = await requestControllerV1.createRequest(payload, tokenData, accessToken);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "request"],
            description: "create a new request",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                payload: createRequest,
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
        path: `${SERVER.API_BASE_URL}/v1/user/request`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const accessToken: string = request.headers.authorization;
                const payload: ReqRequest.GetReqDetails = request.query;
                const result = await requestControllerV1.getReqDetails(payload);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "request"],
            description: "get request details (User & Admin)",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                query: getRequestDetails,
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
        path: `${SERVER.API_BASE_URL}/v1/user/request`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const accessToken: string = request.headers.authorization;
                const tokenData: TokenData =
                    request.auth &&
                    request.auth.credentials &&
                    request.auth.credentials.tokenData;
                const payload: ReqRequest.UpdateReqDetails = request.payload;
                const result = await requestControllerV1.updateRequest(payload, accessToken, tokenData);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "request"],
            description: "update requests (User & Admin)",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                payload: updateRequest,
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
        path: `${SERVER.API_BASE_URL}/v1/user/request-list`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const tokenData: TokenData =
                    request.auth &&
                    request.auth.credentials &&
                    request.auth.credentials.tokenData; const payload: ReqRequest.ReqList = request.query;

                const result = await requestControllerV1.requestList(payload, tokenData);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "request"],
            description: "get request listing (User & Admin)",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                query: reqListing,
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
        path: `${SERVER.API_BASE_URL}/v1/user/request-by-category`,
        handler: async (request: Request | any, h: ResponseToolkit) => {
            try {
                const tokenData: TokenData =
                    request.auth &&
                    request.auth.credentials &&
                    request.auth.credentials.tokenData; const payload: ReqRequest.ReqListByCategory = request.query;

                const result = await requestControllerV1.requestListByCategory(payload, tokenData);
                return responseHandler.sendSuccess(h, result);
            } catch (error) {
                return responseHandler.sendError(request, error);
            }
        },
        config: {
            tags: ["api", "request"],
            description: "get request by category",
            auth: {
                strategies: ["CommonAuth"]
            },
            validate: {
                headers: authorizationHeaderObj,
                query: reqListingByCategory,
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
