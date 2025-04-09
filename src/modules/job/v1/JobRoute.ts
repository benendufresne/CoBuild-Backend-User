"use strict";

import { Request, ResponseToolkit } from "@hapi/hapi";

import { failActionFunction } from "@utils/appUtils";
import { authorizationHeaderObj, headerObject } from "@utils/validator";
import { SWAGGER_DEFAULT_RESPONSE_MESSAGES, SERVER } from "@config/index";
import { responseHandler } from "@utils/ResponseHandler";
import { createJob, getJob, getServiceIdList, importJobs, jobListByCategory, jobListing, scheduleJob, updateJob } from "./routeValidator";
import { jobControllerV1 } from "..";

export const jobRoute = [
	{
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/user/job`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const payload: JobRequest.CreateJob = request.payload;
				const result = await jobControllerV1.createJob(payload);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "create new job from admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: createJob,
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
		path: `${SERVER.API_BASE_URL}/v1/user/job`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const payload: JobRequest.UpdateJob = request.payload;
				const result = await jobControllerV1.updateJobDetails(payload);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "update job details from admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: updateJob,
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
		path: `${SERVER.API_BASE_URL}/v1/user/job`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const query: JobRequest.GetJob = request.query;
				const result = await jobControllerV1.getJobDetails(query);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "job"],
			description: "fetch job details",
			auth: {
				strategies: ["CommonAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: getJob,
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
		path: `${SERVER.API_BASE_URL}/v1/user/job-list`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const query: JobRequest.JobList = request.query;
				const result = await jobControllerV1.getJobList(query);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "fetch job list from admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: jobListing,
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
		path: `${SERVER.API_BASE_URL}/v1/user/jobId-dropdown-list`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const result = await jobControllerV1.getJobDropdownList();
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "fetch job list from admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				// query: jobListing,
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
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/user/schedule-job`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const payload: JobRequest.scheduleJob = request.payload;
				const result = await jobControllerV1.scheduleJob(payload);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "schedule job from admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: scheduleJob,
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
		path: `${SERVER.API_BASE_URL}/v1/user/home`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const accessToken: string = request.headers.authorization;
				const query: JobRequest.JobList = request.query;
				const result = await jobControllerV1.getJobList(query);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "job"],
			description: "fetch job list for home screen",
			auth: {
				strategies: ["CommonAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: jobListing,
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
		path: `${SERVER.API_BASE_URL}/v1/user/service-category-list`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const query: JobRequest.ServiceIdList = request.query;
				const accessToken: string = request.headers.authorization;
				const result = await jobControllerV1.getServiceDropdownList(query, accessToken);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "job"],
			description: "fetch services category list from admin",
			auth: {
				strategies: ["CommonAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: getServiceIdList,
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
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/user/import-jobs`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: JobRequest.importJobs = request.payload;
				const accessToken: string = request.headers.authorization;
				const result = await jobControllerV1.importJobs(payload, accessToken);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "import jobs from admin",
			auth: {
				strategies: ["AdminAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: importJobs,
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
		path: `${SERVER.API_BASE_URL}/v1/user/jobs-by-category`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const query: JobRequest.jobListByCategory = request.query;
				const result = await jobControllerV1.getJobByCategory(query);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "fetch jobs list by category id",
			auth: {
				strategies: ["CommonAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				query: jobListByCategory,
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
		method: "POST",
		path: `${SERVER.API_BASE_URL}/v1/user/job-chat`,
		handler: async (request: Request | any, h: ResponseToolkit) => {
			try {
				const payload: JobRequest.GetJob = request.payload;
				console.log("payload", payload);
				const accessToken: string = request.headers.authorization;
				const result = await jobControllerV1.createJobChat(payload, accessToken);
				return responseHandler.sendSuccess(h, result);
			} catch (error) {
				return responseHandler.sendError(request, error);
			}
		},
		config: {
			tags: ["api", "internal"],
			description: "Create/Get Chat for JobId",
			auth: {
				strategies: ["CommonAuth"]
			},
			validate: {
				headers: authorizationHeaderObj,
				payload: getJob,
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
