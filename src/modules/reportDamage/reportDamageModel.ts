"use strict";
import mongoose, { Document, model, Model, Schema } from "mongoose";
import { DB_MODEL_REF, SERVER, STATUS } from "@config/index";
import { axiosService } from "@lib/axiosService";

export interface IReportDamage extends Document {
  _id: string;
  userId: string;
  userName: string;
  type: string;
  description?: string;
  media?: Array<{ media: string, mediaType: string }>;
  location?: GeoLocation;
  status: string;
  chatId?: string;
  created: number;
}

const geoSchema: Schema = new mongoose.Schema(
  {
    type: { type: String, default: "Point" },
    address: { type: String, required: false },
    coordinates: { type: [Number], index: "2dsphere", required: false },
  },
  {
    _id: false,
  }
);


const reportDamageSchema: Schema = new mongoose.Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },
    userEmail: { type: String, required: true },
    userLocation: { type: geoSchema, required: false },
    type: { type: String, required: true },
    description: { type: String, required: false },
    media: { type: Array<{ media: String, mediaType: String }>, required: false },
    location: { type: geoSchema, required: false },
    chatId: { type: Schema.Types.ObjectId, required: false },
    status: { type: String, required: true, enum: [STATUS.PENDING, STATUS.COMPLETED, STATUS.DELETED], default: STATUS.PENDING },
    created: { type: Number, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);

reportDamageSchema.post("findOneAndUpdate", async (doc) => {
  await _updateDataInModels(doc);
});

/**
 * Updates the data in the chat model with the report information.
 * 
 * @param {Object} doc - The document containing report details.
 * @param {string} doc._id - The unique identifier of the report.
 * @param {string} doc.status - The current status of the report.
 * 
 * Sends a PUT request to the chat application to update the chat model
 * with the report ID and status.
 */
const _updateDataInModels = async (doc) => {
  try {
    console.log({ doc })
    const params: any = {}
    params["reportId"] = doc._id.toString()
    params["status"] = doc.status
    await axiosService.putData({ "url": SERVER.CHAT_APP_URL + SERVER.UPDATE_CHAT_MODEL, "body": params });
  }
  catch (error) {
    console.log("Error Updating Data In Models", error);
  }
}


// Export reportDamage model
export const report_damages: Model<IReportDamage> = model<IReportDamage>(
  DB_MODEL_REF.REPORT_DAMAGE,
  reportDamageSchema
);

