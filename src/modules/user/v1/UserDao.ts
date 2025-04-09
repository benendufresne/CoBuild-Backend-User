"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";
import { STATUS, DB_MODEL_REF, CAL_TYPE } from "@config/constant";

import { createObjectCsvWriter } from "csv-writer";
import { imageUtil } from "@lib/ImageUtil";
import { SERVER } from "@config/index";
import { escapeRegex, toObjectId } from "@utils/appUtils";

export class UserDao extends BaseDao {
  private modelUser: any;
  private modelLoginHistory: any;
  private adminModel: any;
  private requestModel: any;
  private reportModel: any;

  constructor() {
    super();
    this.modelUser = DB_MODEL_REF.USER;
    this.modelLoginHistory = DB_MODEL_REF.LOGIN_HISTORY;
    this.adminModel = DB_MODEL_REF.ADMIN;
    this.requestModel = DB_MODEL_REF.REQUEST;
    this.reportModel = DB_MODEL_REF.REPORT_DAMAGE;

  }

  /**
   * @function isEmailExists
   */
  async isEmailExists(params, userId?: string) {
    try {
      const query: any = {};
      query.email = params.email;
      if (userId) query._id = { $not: { $eq: userId } };
      query.status = { $ne: STATUS.DELETED };

      const projection = { updatedAt: 0 };

      return await this.findOne(this.modelUser, query, projection);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function isMobileExists
   */
  async isMobileExists(params, userId?: string) {
    try {
      const query: any = {};
      query.countryCode = params.countryCode;
      query.mobileNo = params.mobileNo;
      if (userId) query._id = { $not: { $eq: userId } };
      query.status = { $ne: STATUS.DELETED };

      const projection = { updatedAt: 0 };

      return await this.findOne(this.modelUser, query, projection);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function findUserById
   */
  async findUserById(userId: string, project = {}) {
    try {
      const query: any = {};
      query._id = userId;
      query.status = { $ne: STATUS.DELETED };

      const projection = Object.values(project).length
        ? project
        : { createdAt: 0, updatedAt: 0 };

      let result = await this.findOne(this.modelUser, query, projection);
      result.userId = result._id;
      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function signUp
   */
  async signUp(params: UserRequest.SignUp, session?) {
    try {
      return await this.save(this.modelUser, params, { session });
    } catch (error) {
      throw error;
    }
  }

  async socialSignUp(params: UserRequest.SocialSignUp) {
    try {
      return await this.save(this.modelUser, params);
    } catch (error) {
      throw error;
    }
  }

  /**
 * @function addUser
 */
  async addUser(params: UserRequest.AddUser, session?) {
    try {
      return await this.save(this.modelUser, params, { session });
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function blockUnblock
   */
  async blockUnblock(params: BlockRequest) {
    try {
      const query: any = {};
      query._id = params.userId;

      const update = {};

      if (params.type == STATUS.BLOCKED) {
        update["$set"] = { status: params.type, blockedAt: Date.now() }
      } else {
        update["$set"] = {
          status: params.type,
        };
      }
      console.log({ update })
      const options = { new: true };
      return await this.findOneAndUpdate(
        this.modelUser,
        query,
        update,
        options
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function verifyUser
   */
  async verifyUser(params: UserRequest.VerifyUser) {
    try {
      const query: any = {};
      query._id = params.userId;

      const update = {};
      update["$set"] = params;
      const options = { new: true };

      return await this.findOneAndUpdate(
        this.modelUser,
        query,
        update,
        options
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function editProfile
   */
  async editProfile(params, userId: string, profileSteps?: string[]) {
    try {
      const query: any = {};
      query._id = userId;

      const update = {};
      if (Object.values(params).length) update["$set"] = params;
      const options = { new: true };

      return await this.findOneAndUpdate(
        this.modelUser,
        query,
        update,
        options
      );
    } catch (error) {
      throw error;
    }
  }


  async changePassword(params, userId?: string) {
    try {
      const query: any = {};
      if (userId) query._id = userId;
      if (params.email) query.email = params.email;

      const update = {};
      update["$set"] = {
        hash: params.hash,
      };

      return await this.updateOne(this.modelUser, query, update, {});
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * @function exportToCSV
   * @description This function export the data into csv file
   */
  async exportToCSV(data: any[], fileName: string) {
    const csvWriter = createObjectCsvWriter({
      path: `${SERVER.UPLOAD_DIR}` + fileName,
      header: [
        { id: "_id", title: "_id" },
        { id: "name", title: "name" },
        { id: "fullMobileNo", title: "fullMobileNo" },
        { id: "createdAt", title: "createdAt" },
        { id: "language", title: "language" },
        { id: "status", title: "status" },
        { id: "isMigratedUser", title: "isMigratedUser" },
      ],
    });

    try {
      await csvWriter.writeRecords(data);
      return await imageUtil.uploadSingleMediaToS3(fileName);
    } catch (error) {
      console.error("Error writing CSV:", error);
    }
  }

  /**
   * @function userListing
   * @description get the listing of users
   */
  async userListing(params: ListingRequest) {
    try {
      let { pageNo, limit, searchKey, sortBy, sortOrder } = params;
      const aggPipe = [];

      const match: any = {};

      console.log({ status: params.status })
      if (params.status)
        match.status = { $in: params.status };
      else
        match.status = { $ne: STATUS.DELETED };

      if (params.isSharedTask) {
        match.isProfileCompleted = true;
        if (params.userId) {
          match._id = { $ne: toObjectId(params.userId) };
        }
      }

      if (searchKey) {
        if (searchKey.startsWith("+1")) searchKey = searchKey.slice(2);
        const safeSearchKey = escapeRegex(searchKey); // Escape special characters
        match["$or"] = [
          { name: { $regex: new RegExp(safeSearchKey, "i") } },
          { mobileNo: { $regex: new RegExp(safeSearchKey, "i") } },
          { email: { $regex: new RegExp(safeSearchKey, "i") } },
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

      aggPipe.push({
        $lookup: {
          from: "login_histories",
          let: { userId: "$_id" },
          pipeline: [
            { $match: { $expr: { $eq: ["$userId._id", "$$userId"] } } },
            { $sort: { lastLogin: -1 } },
            { $limit: 1 }
          ],
          as: "latestLoginHistory",
        },
      });

      if (params.status?.includes(STATUS.BLOCKED)) {
        aggPipe.push({
          $addFields: {
            lastLogin: { $arrayElemAt: ["$latestLoginHistory.lastLogin", 0] },
            blockedReason: { $ifNull: ["$blockedReason", ""] },
          },
        });
      } else {
        aggPipe.push({
          $addFields: {
            lastLogin: { $arrayElemAt: ["$latestLoginHistory.lastLogin", 0] },
          },
        });
      }

      if (params.isSharedTask) {
        let project: any = {
          _id: 1,
          name: 1,
          email: 1,
          profilePicture: 1,
        };
        aggPipe.push({ $project: project });
      } else {
        let project: any = {
          _id: 1,
          name: 1,
          email: 1,
          status: 1,
          created: 1,
          profilePicture: 1,
          userType: 1,
          mobileNo: 1,
          countryCode: 1,
          assistantName: 1,
          assistantId: 1,
          assistantProfilePicture: 1,
          assistantAssignedDate: 1,
          subscriptionType: 1,
          location: 1,
          lastLogin: 1,
          blockedReason: 1
        };
        aggPipe.push({ $project: project });
      }

      return await this.dataPaginate(
        this.modelUser,
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
   * @function assistantUserListing
   * @description get the listing of particular assistant users
   */
  async assistantUserListing(params: ListingRequest, assistantId: string) {
    try {
      let { pageNo, limit, searchKey, sortBy, sortOrder } = params;
      const aggPipe = [];

      const match: any = {};
      match.assistantId = toObjectId(assistantId);
      match.status = { $ne: STATUS.DELETED };

      if (searchKey) {
        const safeSearchKey = escapeRegex(searchKey); // Escape special characters
        match["$or"] = [
          { name: { $regex: new RegExp(safeSearchKey, "i") } },
          { mobileNo: { $regex: new RegExp(safeSearchKey, "i") } },
          { email: { $regex: new RegExp(safeSearchKey, "i") } },
        ];
      }

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
        name: 1,
        email: 1,
        status: 1,
        created: 1,
        userType: 1,
        mobileNo: 1,
        countryCode: 1,
        profilePicture: 1,
        subscriptionType: 1,
        assistantAssignedDate: 1,
      };
      aggPipe.push({ $project: project });

      return await this.dataPaginate(
        this.modelUser,
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
   * @function deleteUser
   */
  async deleteUser(params: UserRequest.blockDeleteUser) {
    try {
      let query: any = {};
      let update: any = {};
      query._id = params.userId;
      update.status = params.type;
      update.deleteTime = Date.now();
      const result = await this.findOneAndUpdate("users", query, update, {
        new: true,
      });
      console.log(result);
      if (result?.assistantId && params.type === STATUS.DELETED) {
        await this.findOneAndUpdate(
          this.adminModel,
          { _id: result.assistantId },
          { $inc: { assignedClientCount: -1 } }
        );
      }
      return result;
    } catch (error) {
      throw error;
    }
  }

  async deleteAccount(userId: string) {
    try {
      let query: any = {};
      let update: any = {};
      query._id = userId;
      update.status = STATUS.DELETED;
      update.deleteTime = Date.now();
      const result = await this.findOneAndUpdate("users", query, update, {
        new: true,
      });
      return result;
    } catch (error) {
      throw error;
    }
  }


  updateUserInRequestModel(params: any) {
    try {
      return this.updateMany(this.requestModel, { userId: params.userId }, params, { new: false });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  updateUserInReportModel(params: any) {
    try {
      return this.updateMany(this.reportModel, { userId: params.userId }, params, { new: false });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

}

export const userDao = new UserDao();
