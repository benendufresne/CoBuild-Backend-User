"use strict";

import mongoose, { Document, model, Model, Schema } from "mongoose";

import {
  DB_MODEL_REF,
  GENDER,
  SERVER,
  SOCIAL_LOGIN_TYPE,
  STATUS,
  USER_PREFERENCE,
  USER_TYPE,
} from "@config/index";
import { encryptHashPassword, genRandomString } from "@utils/appUtils";
import { requestDaoV1 } from "@modules/request";
import { userDaoV1 } from ".";

export interface Category {
  _id: Schema.Types.ObjectId;
  name: string;
}

export interface IUser extends Document {
  _id: string;
  name?: string;
  email: string;
  salt: string;
  hash: string;
  gender?: string;
  profilePicture?: string;
  language?: string;
  countryCode?: string;
  mobileNo?: string;
  fullMobileNo?: string;
  isMobileVerified: boolean;
  allnotificationsSeen: boolean;
  location?: GeoLocation;
  status: string;
  created: number;
  refreshToken: string;
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

const userSchema: Schema = new mongoose.Schema(
  {
    _id: { type: Schema.Types.ObjectId, required: true, auto: true },
    socialLoginId: { type: String, required: false },
    socialLoginType: { type: String, required: false, enum: Object.values(SOCIAL_LOGIN_TYPE) },
    name: { type: String, trim: true, required: false },
    email: { type: String, trim: true, required: false },
    countryCode: { type: String, required: false },
    mobileNo: { type: String, required: false },
    fullMobileNo: { type: String, required: false },
    isMobileVerified: { type: Boolean, default: false },
    isEmailVerified: { type: Boolean, default: false },
    isProfileCompleted: { type: Boolean, default: false },
    salt: { type: String, required: false },
    hash: { type: String, required: false },
    location: { type: geoSchema, required: false },
    profilePicture: { type: String, required: false },
    flagCode: { type: String, required: false },
    userType: {
      type: String,
      default: USER_TYPE.USER,
      enum: Object.values(USER_TYPE),
    },
    status: {
      type: String,
      enum: [STATUS.BLOCKED, STATUS.UN_BLOCKED, STATUS.DELETED],
      default: STATUS.UN_BLOCKED,
    },
    created: { type: Number, default: Date.now },
    lastSeen: { type: String, default: Date.now },
    blockedAt: { type: Number, required: false },
    deleteTime: { type: Number, required: false },
    notification: { type: Boolean, default: true },
    allnotificationsSeen: { type: Boolean, default: true }
  },
  {
    versionKey: false,
    timestamps: true,
  }
);
// Load password virtually
userSchema.virtual("password")
  .get(function () {
    return this._password;
  })
  .set(function (password) {
    this._password = password;
    const salt = this.salt = genRandomString(SERVER.SALT_ROUNDS);
    this.hash = encryptHashPassword(password, salt);
  });

userSchema.post("save", async function (doc) {
  setTimeout(() => { }, 10);
});

userSchema.post("findOneAndUpdate", async (doc) => {
  await _updateDataInModels(doc);
});

const _updateDataInModels = async (doc) => {
  try {
    console.log({doc})
    const params: any = {}
    params["userId"] = doc._id.toString()
    params["userName"] = doc?.fullName
    await userDaoV1.updateUserInReportModel(params);
    await userDaoV1.updateUserInRequestModel(params);
  }
  catch (error) {
    console.log("Error Updating Data In Models", error);
  }
}


userSchema.index({ created: -1 });
userSchema.index({ assistantId: 1 });
userSchema.index({ status: 1 });
userSchema.index({ name: 1 });
userSchema.index({ mobileNo: 1 });
userSchema.index({ email: 1 });

// Export user
export const users: Model<IUser> = model<IUser>(DB_MODEL_REF.USER, userSchema);
