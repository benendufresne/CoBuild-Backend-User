"use strict";

import * as _ from "lodash";
import { getRandomOtp } from "@utils/appUtils";
import {
  MESSAGES,
  SERVER,
  DB_MODEL_REF,
  USER_TYPE,
  PERMISSION_MODULES,
  STATUS,
  REQUEST_TYPE,
} from "@config/index";
import { axiosService } from "@lib/axiosService";
import { requestDaoV1 } from "..";
const AWS = require("aws-sdk");
export class RequestController {
  private modelLoginHistory: any;
  private modelUser: any;
  constructor() {
    this.modelLoginHistory = DB_MODEL_REF.LOGIN_HISTORY;
    this.modelUser = DB_MODEL_REF.USER;
  }

  /**
   * Create a new request.
   * @param {ReqRequest.CreateReq} params - Request body.
   * @param {TokenData} tokenData - User token data.
   * @param {string} accessToken - User access token.
   * @returns {Promise<IRequest>} - Returns newly created request data.
   */
  async createRequest(params: ReqRequest.CreateReq, tokenData: TokenData, accessToken: string) {
    try {
      console.log({ tokenData })
      params.userId = tokenData.userId;
      params.userName = tokenData.name;
      params.requestIdString = `CB${getRandomOtp(6)}`;
      let data = await requestDaoV1.createReq(params);

      const chatParams = {
        "requestIdString": data.requestIdString,
        "reqId": data._id,
        "userId": params.userId,
        "userName": params.userName,
        "serviceType": data.serviceType,
        "categoryName": data.categoryName,
        "categoryId": data.categoryId,
        "categoryIdString": data.categoryIdString,
        "issueTypeName": data.issueTypeName,
        "subIssueName": data.subIssueName,
        "media": data.media,
        "mediaType": data.mediaType
      }
      const chat = await axiosService.post({ "url": SERVER.CHAT_APP_URL + SERVER.REQUEST_ACCEPTED, "body": chatParams, auth: accessToken });
      const response = { ...data, chatId: chat._id }
      const notificationParams = {
        "type": "NEW_ESTIMATE_REQUEST",
        "userType": "ADMIN",
        "module": PERMISSION_MODULES.REQUESTS_MANAGEMENT,
        "details": { "requestId": data._id.toString(), userName: tokenData.name }
      }
      requestDaoV1.updateReqDetails({ reqId: data._id, chatId: chat._id });

      axiosService.post({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.SEND_NOTFICATION, "body": notificationParams, auth: accessToken });
      return MESSAGES.SUCCESS.CREATE_REQ(response);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Get request details by request id.
   * @param {ReqRequest.GetReqDetails} params - Request id.
   * @returns {Promise<object>} - Returns request details.
   */
  async getReqDetails(params: ReqRequest.GetReqDetails) {
    try {
      let data = await requestDaoV1.getReqDetails(params);
      return MESSAGES.SUCCESS.GET_REQ_DETAILS(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Updates an existing request with new details.
   * @param {ReqRequest.UpdateReqDetails} params - The details to update the request with.
   * @returns {Promise<object>} - Returns the updated request data.
   * @throws Will log and throw an error if the update operation fails.
   */
  async updateRequest(params: ReqRequest.UpdateReqDetails, accessToken: string, tokenData: TokenData) {
    try {
      let request = await requestDaoV1.getReqDetails({ reqId: params.reqId });
      let data = await requestDaoV1.updateReqDetails(params);
      if (tokenData.userType === USER_TYPE.ADMIN && params.status == REQUEST_TYPE.REJECTED && request.status != REQUEST_TYPE.REJECTED) {
        const notificationParams = {
          "type": "ESTIMATE_REQUEST_REJECTED_USER",
          "userType": "USER",
          "receiverIds": [data.userId.toString()],
          "details": { "reqId": data.requestIdString.toString(), requestId: data._id.toString(), "chatId": data.chatId.toString() }
        }
        axiosService.post({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.SEND_NOTFICATION, "body": notificationParams, auth: accessToken });
      }
      return MESSAGES.SUCCESS.UPDATE_REQ(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Get request listing
   * @param {ReqRequest.ReqList} params - Request listing parameters
   * @param {TokenData} tokenData - User token data
   * @returns {Promise<object>} - Returns request listing data
   * @throws Will log and throw an error if the request listing operation fails.
   */
  async requestList(params: ReqRequest.ReqList, tokenData: TokenData) {
    try {
      if (tokenData.userType === USER_TYPE.USER) {
        params.userId = tokenData.userId;
      }
      let data = await requestDaoV1.reqListing(params);
      return MESSAGES.SUCCESS.GET_REQ_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }


  /**
   * Gets a list of requests by category.
   * @param {ReqRequest.ReqListByCategory} params - The parameters to filter the requests by.
   * @param {TokenData} tokenData - The user token data.
   * @returns {Promise<object>} - Returns the list of requests.
   * @throws Will log and throw an error if the get request operation fails.
   */
  async requestListByCategory(params: ReqRequest.ReqListByCategory, tokenData: TokenData) {
    try {
      let data = await requestDaoV1.getReqByCategory(params);
      return MESSAGES.SUCCESS.GET_REQ_CATEGORY_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

}

export const requestController = new RequestController();
