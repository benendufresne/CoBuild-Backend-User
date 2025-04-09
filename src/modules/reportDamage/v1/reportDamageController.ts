"use strict";

import * as _ from "lodash";
import {
  MESSAGES,
  SERVER,
  PERMISSION_MODULES,
} from "@config/index";
import { userDaoV1 } from "@modules/user/index";
import { axiosService } from "@lib/axiosService";
import { reportDamageDaoV1 } from "..";
const AWS = require("aws-sdk");

export class ReportDamageController {


  constructor() {
  }

  /**
   * This function is used to create a report damage by user.
   * @param {ReportDamageRequest.CreateReport} params - Report damage request body.
   * @param {TokenData} tokenData - User token data.
   * @param {string} accessToken - User access token.
   * @returns {Promise<IReportDamage>} - Returns newly created report damage data.
   */
  async createReport(params: ReportDamageRequest.CreateReport, tokenData: TokenData, accessToken: string) {
    try {
      params.userId = tokenData.userId;
      const userDetails = await userDaoV1.findUserById(tokenData.userId);
      params.userName = userDetails.name;
      params.userEmail = userDetails.email;
      params.userMobile = userDetails.mobile;
      params.userLocation = userDetails.location

      let data = await reportDamageDaoV1.createReport(params);

      const chatParams = {
        "reportId": data._id,
        "userId": tokenData.userId,
        "userName": tokenData.name,
        "type": data.type,
        "description": params.description,
        "location": params.location,
        "media": data.media,
        "status": data.status
      }
      const chat = await axiosService.post({ "url": SERVER.CHAT_APP_URL + SERVER.REPORT_DAMAGE_CHAT, "body": chatParams, auth: accessToken });
      const response = { ...data, chatId: chat._id }


      const updateParams = {
        reportId: data._id,
        chatId: chat._id
      }

      await reportDamageDaoV1.updateReportDetails(updateParams);


      const notificationParams = {
        "type": "NEW_DAMAGE_INCIDENT",
        "userType": "ADMIN",
        "module": PERMISSION_MODULES.INCIDENTS_DAMAGE,
        "details": { "reportId": data._id.toString() }
      }
      axiosService.post({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.SEND_NOTFICATION, "body": notificationParams, auth: accessToken });
      return MESSAGES.SUCCESS.CREATE_REPORT(response);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * This function is used to get report damage details by report id.
   * @param {ReportDamageRequest.GetReportDetails} params - Report damage request body.
   * @returns {Promise<IReportDamage>} - Returns report damage data.
   */
  async getReportDetails(params: ReportDamageRequest.GetReportDetails) {
    try {
      let data = await reportDamageDaoV1.getReportDetails(params);
      return MESSAGES.SUCCESS.REPORT_DETAILS(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * This function is used to update report damage details by report id.
   * @param {ReportDamageRequest.UpdateReport} params - Report damage request body.
   * @param {string} accessToken - Access token of user.
   * @returns {Promise<IReportDamage>} - Returns report damage data.
   */
  async updateReport(params: ReportDamageRequest.UpdateReport, accessToken: string) {
    try {
      let data = await reportDamageDaoV1.updateReportDetails(params);

      if (params.status) {
        const notificationParams = {
          "type": "DAMAGE_REQUEST_UPDATE",
          "userType": "USER",
          "receiverIds": [data.userId.toString()],
          "details": { "reportId": data._id.toString(), status: params.status }
        }
        axiosService.post({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.SEND_NOTFICATION, "body": notificationParams, auth: accessToken });
      }

      return MESSAGES.SUCCESS.UPDATE_REPORT(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * This function is used to get report damage listing based on given parameters.
   * @param {ReportDamageRequest.ReportListing} params - Report damage request body.
   * @param {TokenData} tokenData - User token data.
   * @returns {Promise<IReportDamage[]>} - Returns report damage data.
   */
  async getReportListing(params: ReportDamageRequest.ReportListing, tokenData: TokenData) {
    try {
      let data = await reportDamageDaoV1.reportListing(params, tokenData);
      return MESSAGES.SUCCESS.REPORT_LIST(data);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

}

export const reportDamageController = new ReportDamageController();
