"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import {
  DB_MODEL_REF,
  JOB_PRIORITY,
  JOB_TYPE,
  SERVER,
} from "@config/index";
import { required } from "joi";
import { axiosService } from "@lib/axiosService";

export interface IJob extends Document {
  _id: string;
  title: string;
  category: string;
  categoryId: string;
  serviceName: string;
  serviceId: string;
  personalName: string;
  location: GeoLocation;
  companyLocation: GeoLocation;
  email: string;
  fullMobileNo: string;
  aboutCompany: string;
  priority: string;
  procedure: string;
  created: number;
  jobId: string;
  status: string;
  schedule: number;
  completedAt: number;
  doorTag: string;
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

const jobSchema: Schema = new mongoose.Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    title: { type: String, required: true },
    categoryName: { type: String, required: false },
    categoryId: { type: Schema.Types.ObjectId, required: true },
    serviceName: { type: String, required: false },
    serviceId: { type: Schema.Types.ObjectId, required: false },
    personalName: { type: String, required: true },
    location: { type: geoSchema, required: true },
    companyLocation: { type: geoSchema, required: true },
    email: { type: String, required: false },
    fullMobileNo: { type: String, required: false },
    aboutCompany: { type: String, required: false },
    priority: { type: String, required: true, enum: [JOB_PRIORITY.HIGH, JOB_PRIORITY.MEDIUM, JOB_PRIORITY.LOW] },
    procedure: { type: String, required: false },
    jobIdString: { type: String, required: false },
    status: { type: String, required: true, enum: [JOB_TYPE.COMPLETED, JOB_TYPE.IN_PROGRESS, JOB_TYPE.SCHEDULED, JOB_TYPE.DELETED, JOB_TYPE.CANCELED], default: JOB_TYPE.SCHEDULED },
    schedule: { type: Number, required: false },
    doorTag: { type: String, required: false },
    completedAt: { type: Number, required: false },
    created: { type: Number, default: Date.now },
  },
  {
    versionKey: false,
    timestamps: true,
  }
);


jobSchema.post("save", async function (doc) {
  setTimeout(() => { }, 10);
});

// jobSchema.post("findOneAndUpdate", function (doc) {
//   setTimeout(() => { }, 10);
// });

jobSchema.post("findOneAndUpdate", async (doc) => {
  await _updateDataInModels(doc);
});

const _updateDataInModels = async (doc) => {
  try {
    console.log({ doc })
    const params: any = {}
    params["jobId"] = doc._id.toString()
    params["status"] = doc.status
    await axiosService.putData({ "url": SERVER.CHAT_APP_URL + SERVER.UPDATE_CHAT_MODEL, "body": params });
  }
  catch (error) {
    console.log("Error Updating Data In Models", error);
  }
}


// Export user
export const jobs: Model<IJob> = model<IJob>(DB_MODEL_REF.JOB, jobSchema);
