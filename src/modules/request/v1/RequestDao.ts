"use strict";

import { BaseDao } from "@modules/baseDao/BaseDao";
import { STATUS, DB_MODEL_REF, CAL_TYPE, REQUEST_TYPE } from "@config/constant";
import { escapeRegex, toObjectId } from "@utils/appUtils";

export class RequestDao extends BaseDao {
  private requestModel: any;
  constructor() {
    super();
    this.requestModel = DB_MODEL_REF.REQUEST;
  }

  /**
   * Create a new request
   * @param {ReqRequest.CreateReq} params - Request body
   * @returns {Promise<IRequest>} - Returns newly created request data
   * @throws Will log and throw an error if the create operation fails
   */
  async createReq(params: ReqRequest.CreateReq) {
    try {
      return await this.save(this.requestModel, params);
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Get request details by request id.
   * @param {ReqRequest.GetReqDetails} params - Request id.
   * @returns {Promise<IRequest>} - Returns request details.
   * @throws Will log and throw an error if the get operation fails.
   */
  getReqDetails(params: ReqRequest.GetReqDetails) {
    try {
      return this.findOne(this.requestModel, { _id: params.reqId });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

  /**
   * Updates an existing request with new details.
   * @param {ReqRequest.UpdateReqDetails} params - The details to update the request with.
   * @returns {Promise<IRequest>} - Returns the updated request data.
   * @throws Will log and throw an error if the update operation fails.
   */
  updateReqDetails(params: ReqRequest.UpdateReqDetails) {
    try {
      return this.findOneAndUpdate(this.requestModel, { _id: params.reqId }, params, { new: true });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }


  /**
   * Retrieves a paginated list of requests based on various filter criteria.
   * 
   * @param {ReqRequest.ReqList} params - The request listing filters, including:
   *   - coordinatesLatitude: Optional latitude coordinate for geolocation filtering.
   *   - coordinatesLongitude: Optional longitude coordinate for geolocation filtering.
   *   - userId: Optional user ID to filter requests.
   *   - pageNo: The page number for pagination.
   *   - limit: The number of items per page.
   *   - searchKey: Optional search string to filter requests by title or address.
   *   - sortBy: Optional field name to sort the results by.
   *   - sortOrder: Optional sort order (1 for ascending, -1 for descending).
   *   - fromDate: Optional start date for filtering requests by creation date.
   *   - toDate: Optional end date for filtering requests by creation date.
   *   - isCompleted: Optional flag to filter completed requests.
   *   - isActive: Optional flag to filter active requests.
   * 
   * @returns {Promise<object>} A promise that resolves to a paginated list of requests, including request details and geolocation distance if applicable.
   * 
   * @throws Will throw an error if there is an issue with the database query.
   */
  async reqListing(params: ReqRequest.ReqList) {
    try {
      let { coordinates, pageNo, limit, searchKey, sortBy, sortOrder } = params;
      const aggPipe = [];

      if (coordinates) {
        aggPipe.push({
          $geoNear: {
            near: { type: "Point", coordinates },
            distanceField: "distance",
            maxDistance: 5000, //5KMS
            spherical: true,
          },
        });
      }

      const match: any = {};
      if (params.userId)
        match.userId = toObjectId(params.userId)

      if (params.status)
        match.status = { $in: params.status };
      else
        match.status = { $ne: STATUS.DELETED };

      if (params.isCompleted) {
        match.status = { $in: [REQUEST_TYPE.APPROVED] };
      }
      if (params.isActive) {
        match.status = { $in: [REQUEST_TYPE.PENDING, REQUEST_TYPE.IN_PROGRESS, REQUEST_TYPE.REJECTED] };
      }

      if (searchKey) {
        const safeSearchKey = escapeRegex(searchKey); // Escape special characters
        match["$or"] = [
          { userName: { $regex: new RegExp(safeSearchKey, "i") } },
          { 'location.address': { $regex: new RegExp(safeSearchKey, "i") } },

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

      let project: any = {
        name: 1,
        requestIdString: 1,
        userId: 1,
        userName: 1,
        serviceType: 1,
        categoryName: 1,
        categoryId: 1,
        categoryIdString: 1,
        issueTypeName: 1,
        subIssueName: 1,
        location: 1,
        description: 1,
        created: 1,
        estimatedDays: 1,
        amount: 1,
        notes: 1,
        status: 1,
        media: 1,
        mediaType: 1,
        rejectReason: 1
      };

      aggPipe.push({ $project: project });

      return await this.dataPaginate(
        this.requestModel,
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
   * Retrieves a list of requests by category ID that are not deleted.
   * @param {ReqRequest.ReqListByCategory} params - Contains the category ID to filter the requests.
   * @returns {Promise<object>} A promise that resolves to a list of request IDs.
   * @throws Will log and throw an error if the find operation fails.
   */
  getReqByCategory(params: ReqRequest.ReqListByCategory) {
    try {
      return this.find(this.requestModel, { categoryId: params.categoryId, status: { $ne: STATUS.DELETED } }, { _id: 1 });
    } catch (error) {
      console.log("Error", error);
      throw error;
    }
  }

 

}

export const requestDao = new RequestDao();
