"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import {
  DB_MODEL_REF,
  JOB_TYPE,
  REQUEST_TYPE,
  SERVER,
} from "@config/index";
import { axiosService } from "@lib/axiosService";

export interface IRequest extends Document {
  _id: string;
  requestIdString: string;
  userId: string;
  userName: string;
  categoryName: string;
  categoryId: string;
  categoryIdString: string;
  serviceId: string;
  serviceName: string;
  serviceIdString: string;
  issueCategory?: string;
  issueSubCategory?: string;
  issue?: string;
  location?: GeoLocation;
  name: string;
  description?: string;
  chatId?: string;
  media?: string;
  mediaType?: string;
  estimatedDays?: string;
  amount?: number;
  notes?: string;
  rejectReason?: string;
  status: string;
  created: number;
}

const geoSchema: Schema = new mongoose.Schema(
  {
    type: { type: String, default: "Point" },
    address: { type: String, required: false },
    coordinates: { type: [Number], index: "2dsphere", required: false }, // [longitude, latitude]
  },
  {
    _id: false,
  }
);

const requestSchema: Schema = new mongoose.Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    requestIdString: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, required: true },
    userName: { type: String, required: true },

    serviceType: { type: String, required: false },

    categoryName: { type: String, required: false },
    categoryId: { type: Schema.Types.ObjectId, required: false },
    categoryIdString: { type: String, required: false },

    issueTypeName: { type: String, required: false },
    subIssueName: { type: String, required: false },

    location: { type: geoSchema, required: false },
    name: { type: String, required: false },
    description: { type: String, required: false },
    estimatedDays: { type: String, required: false },
    amount: { type: Number, required: false },
    notes: { type: String, required: false },
    rejectReason: { type: String, required: false },
    media: { type: String, required: false },
    mediaType: { type: String, required: false },
    chatId: { type: Schema.Types.ObjectId, required: false },
    status: { type: String, required: true, enum: [...Object.values(REQUEST_TYPE)], default: REQUEST_TYPE.PENDING },
    created: { type: Number, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);


requestSchema.post("save", async function (doc) {
  setTimeout(() => { }, 10);
});

// requestSchema.post("findOneAndUpdate", function (doc) {
//   setTimeout(() => { }, 10);
// });

requestSchema.post("findOneAndUpdate", async (doc) => {
  await _updateDataInModels(doc);
});


const _updateDataInModels = async (doc) => {
  try {
    console.log({ doc })
    const params: any = {}
    params["reqId"] = doc._id.toString()
    params["requestIdString"] = doc.requestIdString
    params["serviceType"] = doc.serviceType
    params["categoryName"] = doc.categoryName
    params["status"] = doc.status
    if (doc.issueTypeName) params["issueTypeName"] = doc.issueTypeName
    if (doc.subIssueName) params["subIssueName"] = doc.subIssueName
    if (doc.issueTypeName) params["issueTypeName"] = doc.issueTypeName
    if (doc.media) params["media"] = doc.media
    if (doc.mediaType) params["mediaType"] = doc.mediaType

    await axiosService.putData({ "url": SERVER.CHAT_APP_URL + SERVER.UPDATE_CHAT_MODEL, "body": params });
  }
  catch (error) {
    console.log("Error Updating Data In Models", error);
  }
}

// Export user
export const requests: Model<IRequest> = model<IRequest>(DB_MODEL_REF.REQUEST, requestSchema);
