"use strict";

import * as _ from "lodash";
import * as crypto from "crypto";
import * as mongoose from "mongoose";
import * as promise from "bluebird";
import { buildToken, encryptHashPassword, genRandomString, generatePassword, getRandomOtp, matchOTP, matchPassword, passwordGenrator } from "@utils/appUtils";
import {
  MESSAGES,
  STATUS,
  TOKEN_TYPE,
  SERVER,
  DB_MODEL_REF,
  ENVIRONMENT,
  MAIL_TYPE,
  REDIS_PREFIX,
  JOB_SCHEDULER_TYPE,
  USER_TYPE,
  CAL_TYPE,
  OTP_TYPE,
  SOCIAL_LOGIN_TYPE,
} from "@config/index";
import { userDaoV1 } from "@modules/user/index";
import { baseDao } from "@modules/baseDao/index";
import { loginHistoryDao } from "@modules/loginHistory/index";
import { redisClient } from "@lib/redis/RedisClient";
import { sendMessageToFlock } from "@utils/FlockUtils";
import { logger } from "@lib/index";
import { axiosService } from "@lib/axiosService";
import { count } from "console";
const AWS = require("aws-sdk");
export class UserController {
  private modelLoginHistory: any;
  private modelUser: any;
  constructor() {
    this.modelLoginHistory = DB_MODEL_REF.LOGIN_HISTORY;
    this.modelUser = DB_MODEL_REF.USER;
  }

  /**
   * @function removeSession
   * @description Remove the user login session
   */
  async removeSession(params, isSingleSession: boolean) {
    try {
      if (isSingleSession)
        await loginHistoryDao.removeDeviceById({ userId: params.userId });
      else
        await loginHistoryDao.removeDeviceById({
          userId: params.userId,
          deviceId: params.deviceId,
        });

      if (SERVER.IS_REDIS_ENABLE) {
        if (isSingleSession) {
          let keys: any = await redisClient.getKeys(`*${params.userId}.*`);
          keys = keys.filter(
            (v1) =>
              Object.values(JOB_SCHEDULER_TYPE).findIndex(
                (v2) => v2 === v1.split(".")[0]
              ) === -1
          );
          console.log("removed keys are => ", keys);
          if (keys.length) await redisClient.deleteKey(keys);
        } else
          await redisClient.deleteKey(`${params.userId}.${params.deviceId}`);
      }
    } catch (error) {
      sendMessageToFlock({ title: "_removeSession", error: error.stack });
    }
  }

  /**
   * @function updateUserDataInRedis
   * @description update user's data in redis
   * @param params.salt
   * @param params.userId
   * @returns
   */
  async updateUserDataInRedis(params, isAlreadySaved = false) {
    try {
      delete params.salt;
      if (SERVER.IS_REDIS_ENABLE) {
        let keys: any = await redisClient.getKeys(
          `*${params.userId || params._id.toString()}*`
        );
        keys = keys.filter(
          (v1) =>
            Object.values(JOB_SCHEDULER_TYPE).findIndex(
              (v2) => v2 === v1.split(".")[0]
            ) === -1
        );
        const promiseResult = [],
          array = [];
        for (const key of keys) {
          if (isAlreadySaved) {
            let userData: any = await redisClient.getValue(
              `${params.userId || params._id.toString()}.${key.split(".")[1]}`
            );
            array.push(key);
            array.push(
              JSON.stringify(buildToken(_.extend(JSON.parse(userData), params)))
            );
            promiseResult.push(userData);
          } else {
            array.push(key);
            array.push(JSON.stringify(buildToken(params)));
          }
        }

        await Promise.all(promiseResult);
        if (array.length) redisClient.mset(array);
      }
      return {};
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * @function updateUserDataInDb
   * @description this function used to update the user data in DB
   */
  async updateUserDataInDb(params) {
    try {
      await baseDao.updateMany(
        this.modelLoginHistory,
        { "userId._id": params._id },
        { $set: { userId: params } },
        {}
      );

      return {};
    } catch (error) {
      throw error;
    }
  }

  async signUp(params: UserRequest.SignUp) {
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const isExist = await userDaoV1.isEmailExists(params);
      if (isExist?.isEmailVerified) return Promise.reject(MESSAGES.ERROR.EMAIL_ALREADY_EXIST);
      else await userDaoV1.deleteOne("users", { email: params.email });
      const isMobileExist = await userDaoV1.isMobileExists(params);
      if (isMobileExist?.isEmailVerified) return Promise.reject(MESSAGES.ERROR.MOBILE_NO_ALREADY_EXIST);
      params.fullMobileNo = params.countryCode + params.mobileNo;
      const user = await userDaoV1.signUp(params, session);
      // const salt= genRandomString(SERVER.SALT_ROUNDS);
      // await userDaoV1.editProfile({
      //   salt: salt,
      //   hash: encryptHashPassword(params.password, salt)
      // }, user._id);
      await session.commitTransaction();
      session.endSession();
      params.type = OTP_TYPE.SIGNUP;
      await this.sendOtpOnEmail(params);
      return MESSAGES.SUCCESS.SIGNUP({
        email: user.email,
        mobileNo: user.mobileNo,
        countryCode: user.countryCode,
        flagCode: user.flagCode,
        userId: user._id.toString(),
      });
    } catch (error) {
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  async socialSignUp(params: UserRequest.SocialSignUp) {
    try {
      /* start check if user exist with socialId or not*/
      const isUser = await userDaoV1.findOne("users", { socialLoginId: params.socialLoginId });
      if (!params.email && !isUser) return Promise.reject(MESSAGES.ERROR.SOCIAL_EMAIL_NOT_FOUND);
      if (isUser) {
        if (isUser.status === STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);

        const salt = crypto.randomBytes(64).toString("hex");
        const tokenData = {
          userId: isUser._id,
          deviceId: params.deviceId,
          accessTokenKey: salt,
          type: TOKEN_TYPE.USER_LOGIN,
          userType: isUser.userType,
        };
        await this.removeSession(
          { userId: isUser._id, deviceId: params.deviceId },
          true
        );
        const location = params.remoteAddress;
        let authToken = await axiosService.postData({
          url: process.env.AUTH_APP_URL + SERVER.CREATE_AUTH_TOKEN,
          body: tokenData,
        });
        const [step3, accessToken] = await promise.join(
          loginHistoryDao.createUserLoginHistory({
            ...params,
            ...isUser,
            salt,
            location,
          }),
          authToken.data.jwtToken
        );

        let dataToReturn = {
          accessToken,
          userId: isUser._id,
          mobileNo: isUser?.mobileNo,
          countryCode: isUser?.countryCode,
          isMobileVerified: isUser.isMobileVerified,
          name: isUser?.name,
          // firstName: isUser?.firstName,
          // lastName: isUser?.lastName,
          profilePicture: isUser?.profilePicture,
          isUserType: isUser?.isUserType,
          email: isUser?.email,
          isEmailVerified: isUser?.isEmailVerified,
          isProfileCompleted: isUser?.isProfileCompleted,
          location: isUser?.location,
          flagCode: isUser?.flagCode,
          status: isUser?.status,
          created: isUser?.created,
          socialLoginId: isUser?.socialLoginId,
          socialLoginType: isUser?.socialLoginType,
          notification: isUser?.notification
        };
        return MESSAGES.SUCCESS.SOCIAL_SIGNUP(dataToReturn);
      }
      /* end of checking if user exist with socialId*/

      if (params.email && (params.socialLoginType === SOCIAL_LOGIN_TYPE.GOOGLE || params.socialLoginType === SOCIAL_LOGIN_TYPE.APPLE)) {
        const isExist = await userDaoV1.isEmailExists(params);
        if (isExist?.isEmailVerified) {
          await userDaoV1.findOneAndUpdate("users", { email: params.email }, {
            socialLoginId: params.socialLoginId,
            socialLoginType: params.socialLoginType
          })
        } else await userDaoV1.deleteOne("users", { email: params.email });
      }
      if (params.mobileNo && params.isEmailVerified) {
        const isMobileExist = await userDaoV1.isMobileExists(params);
        if (isMobileExist?.isEmailVerified && isMobileExist.email === params.email) {
          params.fullMobileNo = params.countryCode + params.mobileNo;
          await userDaoV1.findOneAndUpdate("users", { email: params.email }, {
            socialLoginId: params.socialLoginId,
            socialLoginType: params.socialLoginType,
            fullMobileNo: params.fullMobileNo
          })
        } else await userDaoV1.deleteOne("users", { isEmailVerified: false, countryCode: params.countryCode, mobileNo: params.mobileNo });
      }
      const user = await userDaoV1.socialSignUp(params);
      if (params.socialLoginType === SOCIAL_LOGIN_TYPE.FACEBOOK && !params.isEmailVerified) {
        params.type = OTP_TYPE.SIGNUP;
        await this.sendOtpOnEmail(params);
        return MESSAGES.SUCCESS.SOCIAL_SIGNUP_VERIFICATION({
          email: user.email,
          mobileNo: user.mobileNo,
          countryCode: user.countryCode,
          flagCode: user.flagCode,
          userId: user._id.toString(),
          socialLoginId: user.socialLoginId,
          socialLoginType: user.socialLoginType,
          isEmailVerified: user.isEmailVerified
        });
      } else {
        const salt = crypto.randomBytes(64).toString("hex");
        const tokenData = {
          userId: user._id,
          deviceId: params.deviceId,
          accessTokenKey: salt,
          type: TOKEN_TYPE.USER_LOGIN,
          userType: user.userType,
        };
        await this.removeSession(
          { userId: user._id, deviceId: params.deviceId },
          true
        );
        const location = params.remoteAddress;
        let authToken = await axiosService.postData({
          url: process.env.AUTH_APP_URL + SERVER.CREATE_AUTH_TOKEN,
          body: tokenData,
        });
        const [step3, accessToken] = await promise.join(
          loginHistoryDao.createUserLoginHistory({
            ...params,
            ...user,
            salt,
            location,
          }),
          authToken.data.jwtToken
        );

        let dataToReturn = {
          accessToken,
          userId: user._id,
          mobileNo: user?.mobileNo,
          countryCode: user?.countryCode,
          isMobileVerified: user.isMobileVerified,
          name: user?.name,
          // firstName: user?.firstName,
          // lastName: user?.lastName,
          profilePicture: user?.profilePicture,
          userType: user?.userType,
          email: user?.email,
          isEmailVerified: user?.isEmailVerified,
          isProfileCompleted: user?.isProfileCompleted,
          location: user?.location,
          flagCode: user?.flagCode,
          status: user?.status,
          created: user?.created,
          socialLoginId: user?.socialLoginId,
          socialLoginType: user?.socialLoginType,
          notification: isUser?.notification
        };
        return MESSAGES.SUCCESS.SOCIAL_SIGNUP(dataToReturn);
      }

    } catch (error) {
      throw error;
    }
  }

  async login(params: UserRequest.Login) {
    // MongoDB transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    try {

      const isUser = await userDaoV1.isEmailExists(params);
      if (!isUser) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_REGISTERED);
      if (isUser.status === STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);
      if (!isUser.isEmailVerified) return Promise.reject(MESSAGES.ERROR.EMAIL_NOT_VERIFIED);
      console.log("isUser", isUser);
      const isPasswordMatched = await matchPassword(params.password, isUser.hash, isUser.salt);
      if (!isPasswordMatched) return Promise.reject(MESSAGES.ERROR.INCORRECT_PASSWORD);
      const salt = crypto.randomBytes(64).toString("hex");
      const tokenData = {
        userId: isUser._id,
        deviceId: params.deviceId,
        accessTokenKey: salt,
        type: TOKEN_TYPE.USER_LOGIN,
        userType: isUser.userType,
      };
      await this.removeSession(
        { userId: isUser._id, deviceId: params.deviceId },
        true
      );
      const location = params.remoteAddress;
      let authToken = await axiosService.postData({
        url: process.env.AUTH_APP_URL + SERVER.CREATE_AUTH_TOKEN,
        body: tokenData,
      });
      const [step3, accessToken] = await promise.join(
        loginHistoryDao.createUserLoginHistory({
          ...params,
          ...isUser,
          salt,
          location,
        }),
        authToken.data.jwtToken
      );

      let dataToReturn = {
        accessToken,
        userId: isUser._id,
        mobileNo: isUser?.mobileNo,
        countryCode: isUser?.countryCode,
        isMobileVerified: isUser.isMobileVerified,
        name: isUser?.name,
        // firstName: isUser?.firstName,
        // lastName: isUser?.lastName,
        profilePicture: isUser?.profilePicture,
        userType: isUser?.userType,
        email: isUser?.email,
        isEmailVerified: isUser?.isEmailVerified,
        isProfileCompleted: isUser?.isProfileCompleted,
        location: isUser?.location,
        flagCode: isUser?.flagCode,
        status: isUser?.status,
        created: isUser?.created,
        socialLoginId: isUser?.socialLoginId,
        notification: isUser?.notification
      };
      return MESSAGES.SUCCESS.LOGIN(dataToReturn);
    } catch (error) {
      // MongoDB transactions
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  // /**
  //  * @function sendOTP
  //  * @description send/resend otp on email/number
  //  * @payload payload contains encrypted data : decrypted params defined below
  //  * @param params.email user's email (required)
  //  * @param params.type otp type (required)
  //  * @returns
  //  */
  // async sendOtpOnMobile(params: UserRequest.SendOtp, signUp: boolean = false) {
  //   try {
  //     if (!signUp) {
  //       const isExist = await userDaoV1.isMobileExists(params);
  //       if (!isExist)
  //         return Promise.reject(MESSAGES.ERROR.MOBILE_NOT_REGISTERED);
  //       if (isExist.status === STATUS.BLOCKED)
  //         return Promise.reject(MESSAGES.ERROR.BLOCKED);
  //     }
  //     const fullMobileNo = params?.countryCode + params?.mobileNo;
  //     const environment: Array<string> = [
  //       ENVIRONMENT.PRODUCTION,
  //       ENVIRONMENT.PREPROD,
  //       ENVIRONMENT.STAGE,
  //       ENVIRONMENT.QA,
  //     ];
  //     const otp_count: any = await redisClient.getValue(
  //       `${SERVER.APP_NAME}.${fullMobileNo}.${REDIS_PREFIX.OTP_ATTEMP}`
  //     );

  //     if (otp_count && JSON.parse(otp_count).count > SERVER.OTP_LIMIT)
  //       return Promise.reject(MESSAGES.ERROR.LIMIT_EXCEEDS); //NOSONAR

  //     const otp = getRandomOtp(6).toString();
  //     if (environment.includes(SERVER.ENVIRONMENT)) {
  //       redisClient.setExp(
  //         `${fullMobileNo}`,
  //         SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_MOBILE / 1000,
  //         JSON.stringify({ fullMobileNo: fullMobileNo, otp: otp })
  //       );
  //       // let messageData = {
  //       // 	to: fullMobileNo,
  //       // 	body: OTP_BODY.VERIFY_MOBILE + otp
  //       // }
  //       // axiosService.postData({ "url": process.env.NOTIFICATION_APP_URL + SERVER.SEND_MESSAGE, "body": { data: messageData } });

  //       if (SERVER.IS_REDIS_ENABLE)
  //         redisClient.setExp(
  //           `${SERVER.APP_NAME}.${fullMobileNo}.${REDIS_PREFIX.OTP_ATTEMP}`,
  //           SERVER.TOKEN_INFO.EXPIRATION_TIME.OTP_LIMIT / 1000,
  //           JSON.stringify({
  //             fullMobileNo: fullMobileNo,
  //             count: JSON.parse(otp_count)
  //               ? JSON.parse(otp_count).count + 1
  //               : 1,
  //           })
  //         );
  //     } else {
  //       redisClient.setExp(
  //         `${fullMobileNo}`,
  //         SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_MOBILE / 1000,
  //         JSON.stringify({
  //           fullMobileNo: fullMobileNo,
  //           otp: SERVER.DEFAULT_OTP,
  //         })
  //       );
  //     }
  //     return MESSAGES.SUCCESS.SEND_OTP;
  //   } catch (error) {
  //     logger.error(error);
  //     throw error;
  //   }
  // }

  /**
   * @function sendOTP
   * @description send/resend otp on email/number
   * @payload payload contains encrypted data : decrypted params defined below
   * @param params.email user's email (required)
   * @param params.type otp type (required)
   * @returns
   */
  async sendOtpOnEmail(params: UserRequest.SendOtp) {
    try {
      let isUser = await userDaoV1.isEmailExists(params);
      if (!isUser) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);
      if (isUser.status == STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);
      const environment: Array<string> = [
        ENVIRONMENT.PRODUCTION,
        ENVIRONMENT.DEV,
        ENVIRONMENT.LOCAL,
        ENVIRONMENT.PREPROD,
        ENVIRONMENT.QA,
      ];
      const otp_count: any = await redisClient.getValue(
        `${SERVER.APP_NAME}.${params.email}.${REDIS_PREFIX.OTP_ATTEMP}`
      );

      if (otp_count && JSON.parse(otp_count).count > SERVER.OTP_LIMIT)
        return Promise.reject(MESSAGES.ERROR.LIMIT_EXCEEDS); //NOSONAR

      const otp = getRandomOtp(6).toString();
      if (environment.includes(SERVER.ENVIRONMENT)) {
        redisClient.setExp(
          `${params.email}`,
          SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_EMAIL / 1000,
          JSON.stringify({
            email: params.email, otp: otp, type: params.type,
          })
        );
        let mailData = {
          type: MAIL_TYPE.VERIFY_EMAIL,
          email: params.email,
          otp: otp,
        };
        axiosService.postData({
          url: process.env.NOTIFICATION_APP_URL + SERVER.SEND_MAIL,
          body: mailData,
        });
        if (SERVER.IS_REDIS_ENABLE)
          redisClient.setExp(
            `${SERVER.APP_NAME}.${params.email}.${REDIS_PREFIX.OTP_ATTEMP}`,
            SERVER.TOKEN_INFO.EXPIRATION_TIME.OTP_LIMIT / 1000,
            JSON.stringify({
              type: params.type,
              email: params.email,
              count: JSON.parse(otp_count)
                ? JSON.parse(otp_count).count + 1
                : 1,
            })
          );
      } else {
        redisClient.setExp(
          `${params.email}`,
          SERVER.TOKEN_INFO.EXPIRATION_TIME.VERIFY_EMAIL / 1000,
          JSON.stringify({ email: params.email, otp: SERVER.DEFAULT_OTP, type: params.type })
        );
      }
      return MESSAGES.SUCCESS.SEND_OTP;
    } catch (error) {
      logger.error(error);
      throw error;
    }
  }

  /**
   * @function verifyMobileOTP
   * @description verify otp on login/signup
   * @param params.email: user's email (required)
   * @param params.otp: otp (required)
   */
  // async verifyMobileOTP(params: UserRequest.VerifyOTP) {
  //   try {
  //     const step1 = await userDaoV1.isMobileExists(params);
  //     if (!step1) return Promise.reject(MESSAGES.ERROR.MOBILE_NOT_REGISTERED);
  //     if (step1.status === STATUS.BLOCKED)
  //       return Promise.reject(MESSAGES.ERROR.BLOCKED);
  //     let step2 = await redisClient.getValue(step1.fullMobileNo);
  //     let isOTPMatched = await matchOTP(params.otp, step2);
  //     const environment: Array<string> = [
  //       ENVIRONMENT.PRODUCTION,
  //       ENVIRONMENT.PREPROD,
  //       ENVIRONMENT.STAGE,
  //       ENVIRONMENT.DEV,
  //       ENVIRONMENT.LOCAL,
  //       ENVIRONMENT.QA,
  //     ];
  //     if (
  //       environment.includes(SERVER.ENVIRONMENT) &&
  //       params.otp == SERVER.DEFAULT_OTP
  //     )
  //       isOTPMatched = true;

  //     if (!isOTPMatched) {
  //       return Promise.reject(MESSAGES.ERROR.INVALID_OTP);
  //     }
  //     let dataToReturn = {};
  //     const salt = crypto.randomBytes(64).toString("hex");
  //     const tokenData = {
  //       userId: step1._id,
  //       deviceId: params.deviceId,
  //       accessTokenKey: salt,
  //       type: TOKEN_TYPE.USER_LOGIN,
  //       userType: step1.userType,
  //     };
  //     await this.removeSession(
  //       { userId: step1._id, deviceId: params.deviceId },
  //       true
  //     );
  //     const location = params.remoteAddress;
  //     let authToken = await axiosService.postData({
  //       url: process.env.AUTH_APP_URL + SERVER.CREATE_AUTH_TOKEN,
  //       body: tokenData,
  //     });
  //     const [step3, accessToken] = await promise.join(
  //       loginHistoryDao.createUserLoginHistory({
  //         ...params,
  //         ...step1,
  //         salt,
  //         location,
  //       }),
  //       authToken.data.jwtToken
  //       // createToken(tokenData)
  //     );
  //     if (SERVER.IS_REDIS_ENABLE)
  //       redisClient.setExp(
  //         `${step1._id.toString()}.${params.deviceId}`,
  //         Math.floor(
  //           SERVER.TOKEN_INFO.EXPIRATION_TIME[TOKEN_TYPE.USER_LOGIN] / 1000
  //         ),
  //         JSON.stringify(buildToken({ ...step1, ...params, salt }))
  //       );

  //     await baseDao.findOneAndUpdate(
  //       this.modelUser,
  //       { _id: step1._id },
  //       { isMobileVerified: true },
  //       {}
  //     );
  //     dataToReturn = {
  //       accessToken,
  //       userId: step1._id,
  //       mobileNo: step1?.mobileNo,
  //       countryCode: step1?.countryCode,
  //       isMobileVerified: true,
  //       name: step1?.name,
  //       profilePicture: step1?.profilePicture,
  //       userType: step1?.userType,
  //       email: step1?.email,
  //       dob: step1?.dob,
  //       occupation: step1?.occupation,
  //       firstName: step1?.firstName,
  //       lastName: step1?.lastName,
  //       gender: step1?.gender,
  //       isEmailVerified: step1?.isEmailVerified,
  //       isProfileCompleted: step1?.isProfileCompleted,
  //       isAssistantAssigned: step1?.isAssistantAssigned,
  //       assistantId: step1?.assistantId,
  //       assistantName: step1?.assistantName,
  //       assistantProfilePicture: step1?.assistantProfilePicture,
  //     };

  //     redisClient.deleteKey(
  //       `${SERVER.APP_NAME}.${step1.fullMobileNo}.${REDIS_PREFIX.OTP_ATTEMP}`
  //     );
  //     return MESSAGES.SUCCESS.VERIFY_OTP(dataToReturn);
  //   } catch (error) {
  //     throw error;
  //   }
  // }

  /**
   * @function verifyMobileOTP
   * @description verify otp on login/signup
   * @param params.email: user's email (required)
   * @param params.otp: otp (required)
   */
  async verifyEmailOTP(params: UserRequest.VerifyOTP) {
    try {
      const isUser = await userDaoV1.isEmailExists(params);
      if (!isUser) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);

      if (isUser.status === STATUS.BLOCKED)
        return Promise.reject(MESSAGES.ERROR.BLOCKED);
      let step2: any = await redisClient.getValue(isUser.email);
      if (!step2) return Promise.reject(MESSAGES.ERROR.OTP_EXPIRED);
      let isOTPMatched = await matchOTP(params.otp, step2);
      const environment: Array<string> = [
        // ENVIRONMENT.PRODUCTION,
        // ENVIRONMENT.PREPROD,
        ENVIRONMENT.STAGE,
        ENVIRONMENT.DEV,
        ENVIRONMENT.QA,
      ];
      if (
        environment.includes(SERVER.ENVIRONMENT) &&
        params.otp == SERVER.DEFAULT_OTP
      )
        isOTPMatched = true;

      if (!isOTPMatched) {
        return Promise.reject(MESSAGES.ERROR.INVALID_OTP);
      }

      let dataToReturn: any = {};
      step2 = JSON.parse(step2);
      await baseDao.findOneAndUpdate(
        this.modelUser,
        { _id: isUser._id },
        { isEmailVerified: true },
        {}
      );
      if (step2.type === OTP_TYPE.SIGNUP) {
        const salt = crypto.randomBytes(64).toString("hex");
        const tokenData = {
          userId: isUser._id,
          deviceId: params.deviceId,
          accessTokenKey: salt,
          type: TOKEN_TYPE.USER_LOGIN,
          userType: isUser.userType,
        };
        await this.removeSession(
          { userId: isUser._id, deviceId: params.deviceId },
          true
        );
        const location = params.remoteAddress;
        let authToken = await axiosService.postData({
          url: process.env.AUTH_APP_URL + SERVER.CREATE_AUTH_TOKEN,
          body: tokenData,
        });
        const [step3, accessToken] = await promise.join(
          loginHistoryDao.createUserLoginHistory({
            ...params,
            ...isUser,
            salt,
            location,
          }),
          authToken.data.jwtToken
        );
        dataToReturn = {
          accessToken,
          userId: isUser._id,
          mobileNo: isUser?.mobileNo,
          countryCode: isUser?.countryCode,
          isMobileVerified: isUser.isMobileVerified,
          name: isUser?.name,
          // firstName: isUser?.firstName,
          // lastName: isUser?.lastName,
          profilePicture: isUser?.profilePicture,
          userType: isUser?.userType,
          email: isUser?.email,
          isEmailVerified: isUser?.isEmailVerified,
          isProfileCompleted: isUser?.isProfileCompleted,
          location: isUser?.location,
          flagCode: isUser?.flagCode,
          status: isUser?.status,
          created: isUser?.created,
          socialLoginId: isUser?.socialLoginId,
          socialLoginType: isUser?.socialLoginType,
          notification: isUser?.notification
        };
        await redisClient.deleteKey(`${isUser.email}`);
        await redisClient.deleteKey(
          `${SERVER.APP_NAME}.${params.email}.${REDIS_PREFIX.OTP_ATTEMP}`
        );
        console.log({accessToken})

        const notificationParams = {
          "type": "WELCOME_TO_COBUILD",
          "userType": "USER",
          "receiverIds": [isUser._id.toString()]
        }
        axiosService.post({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.SEND_NOTFICATION, "body": notificationParams, auth: `Bearer ${accessToken}` });

        return MESSAGES.SUCCESS.VERIFY_OTP(dataToReturn);
      }
      if (step2.type === OTP_TYPE.FORGOT_PASSWORD) {
        dataToReturn = {
          email: isUser?.email,
          userId: isUser._id
        }
        redisClient.deleteKey(
          `${SERVER.APP_NAME}.${params.email}.${REDIS_PREFIX.OTP_ATTEMP}`
        );
        return MESSAGES.SUCCESS.VERIFY_OTP(dataToReturn);
      }

    } catch (error) {
      throw error;
    }
  }

  async resetPassword(params: UserRequest.ResetPassword) {
    try {
      const isUser = await userDaoV1.isEmailExists(params);
      if (!isUser) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);
      if (isUser.status == STATUS.BLOCKED) return Promise.reject(MESSAGES.ERROR.BLOCKED);
      let step1: any = await redisClient.getValue(params.email);
      if (!step1) return Promise.reject(MESSAGES.ERROR.RESET_PASSWORD_INVALID);
      if (params.password !== params.confirmPassword) return Promise.reject(MESSAGES.ERROR.PASSWORD_NOT_MATCHED);
      const step2 = await userDaoV1.findOne("users", { email: params.email, status: STATUS.UN_BLOCKED }, {
        salt: 1,
        hash: 1,
      });
      if (step2 && step2.hash) {
        const newHash = encryptHashPassword(params.password, step2.salt);
        if (step2?.hash == newHash) return Promise.reject(MESSAGES.ERROR.SAME_PASSWORD);
      }
      const salt = genRandomString(SERVER.SALT_ROUNDS);
      await userDaoV1.editProfile({
        salt: salt,
        hash: encryptHashPassword(params.password, salt)
      }, isUser._id);
      redisClient.deleteKey(`${isUser.email}`);
      let mailData = {
        type: MAIL_TYPE.CHANGE_PASSWORD,
        name: step2.name,
        email: step2.email,
      };

      axiosService.postData({
        url: process.env.NOTIFICATION_APP_URL + SERVER.SEND_MAIL,
        body: mailData,
      });
      return MESSAGES.SUCCESS.RESET_PASSWORD;
    } catch (error) {
      throw error;
    }
  }

  async deleteAccount(params: UserRequest.DeleteAccount, tokenData: TokenData) {
    try {
      const isUser = await userDaoV1.findUserById(tokenData.userId);
      if (!isUser) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);
      const isPasswordMatched = await matchPassword(params.password, isUser.hash, isUser.salt);
      if (!isPasswordMatched) return Promise.reject(MESSAGES.ERROR.INCORRECT_PASSWORD);
      await userDaoV1.deleteAccount(isUser._id);

      let mailData = {
        type: MAIL_TYPE.ACCOUNT_DELETE,
        name: tokenData.name,
        email: tokenData.email,
      };

      axiosService.postData({
        url: process.env.NOTIFICATION_APP_URL + SERVER.SEND_MAIL,
        body: mailData,
      });

      return MESSAGES.SUCCESS.DELETE_ACCOUNT;
    } catch (error) {
      throw error;
    }
  }


  /**
   * @function logout
   * @author yash sharma
   * @description this function is used to logout the user
   */
  async logout(tokenData: TokenData) {
    try {
      await this.removeSession(tokenData, true);
      return MESSAGES.SUCCESS.USER_LOGOUT;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function profile
   * @author yash sharma
   * @description View the profile of user
   */
  async profile(params: UserId, tokenData: TokenData) {
    try {
      const userId = params?.userId ? params.userId : tokenData.userId;
      const user = await userDaoV1.findUserById(userId);
      if (!user) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);
      let dataToReturn = {
        userId: user._id,
        mobileNo: user?.mobileNo,
        countryCode: user?.countryCode,
        isMobileVerified: user.isMobileVerified,
        name: user?.name,
        // firstName: user?.firstName,
        // lastName: user?.lastName,
        profilePicture: user?.profilePicture,
        userType: user?.userType,
        email: user?.email,
        isEmailVerified: user?.isEmailVerified,
        isProfileCompleted: user?.isProfileCompleted,
        location: user?.location,
        flagCode: user?.flagCode,
        status: user?.status,
        created: user?.created,
        notification: user?.notification,
        allnotificationsSeen: user?.allnotificationsSeen
      }
      return MESSAGES.SUCCESS.DETAILS(dataToReturn);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function editProfilePic
   * @description Edit the profile of user
   */
  async editProfile(params: UserRequest.EditProfile, tokenData: TokenData, accessToken: string) {
    try {
      const model: any = DB_MODEL_REF.USER;
      const userId = tokenData.userId;
      const user = await userDaoV1.findUserById(userId);
      if (!user) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);
      if (params.email) {
        const isUser = await userDaoV1.isEmailExists(params);
        if (isUser) {
          if (isUser?._id.toString() !== userId) return Promise.reject(MESSAGES.ERROR.EMAIL_ALREADY_EXIST);
        }
      }
      if (params.countryCode && params.mobileNo) {
        const isUser = await userDaoV1.isMobileExists(params);
        if (isUser) {
          if (isUser?._id.toString() !== userId) return Promise.reject(MESSAGES.ERROR.MOBILE_NO_ALREADY_EXIST);
        }
      }
      let data = await userDaoV1.editProfile(params, userId);
      if (data?.location?.address && data?.name) {
        data = await userDaoV1.findOneAndUpdate(model, { _id: userId }, { isProfileCompleted: true }, { new: true });
      }
      let dataToReturn = {
        userId: data._id,
        mobileNo: data?.mobileNo,
        countryCode: data?.countryCode,
        isMobileVerified: data.isMobileVerified,
        name: data?.name,
        profilePicture: data?.profilePicture,
        userType: data?.userType,
        email: data?.email,
        isEmailVerified: data?.isEmailVerified,
        isProfileCompleted: data?.isProfileCompleted,
        location: data?.location,
        flagCode: data?.flagCode,
        status: data?.status,
        created: data?.created,
        notification: data?.notification,
      }

      // if (!params.allnotificationsSeen) {
      //   const notificationParams = {
      //     "type": "PROFILE_UPDATED_SUCCESSFULLY",
      //     "userType": "USER",
      //     "receiverIds": [tokenData.userId]
      //   }
      //   axiosService.post({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.SEND_NOTFICATION, "body": notificationParams, auth: accessToken });
      // }


      return MESSAGES.SUCCESS.EDIT_PROFILE(dataToReturn);
    } catch (error) {
      console.error("Error in editProfile:", error);
      throw error;
    }
  }

  async changePassword(params: UserRequest.ChangePassword, tokenData: TokenData) {
    try {
      if (params.password !== params.confirmPassword) return Promise.reject(MESSAGES.ERROR.PASSWORD_NOT_MATCHED);
      const step1 = await userDaoV1.findUserById(tokenData.userId, {
        salt: 1,
        hash: 1,
      });
      const oldHash = encryptHashPassword(params.oldPassword, step1.salt);
      if (oldHash !== step1.hash)
        return Promise.reject(MESSAGES.ERROR.INVALID_OLD_PASSWORD);
      if (params.oldPassword == params.password) return Promise.reject(MESSAGES.ERROR.ENTER_NEW_PASSWORD);
      params.hash = encryptHashPassword(params.password, step1.salt);
      await userDaoV1.changePassword(params, tokenData.userId);

      let mailData = {
        type: MAIL_TYPE.CHANGE_PASSWORD,
        name: tokenData.name,
        email: tokenData.email,
      };

      axiosService.postData({
        url: process.env.NOTIFICATION_APP_URL + SERVER.SEND_MAIL,
        body: mailData,
      });

      return MESSAGES.SUCCESS.CHANGE_PASSWORD;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function editSetting
   * @description Edit the setting of users Like disable notification
   */
  async editSetting(params: UserRequest.Setting, tokenData: TokenData) {
    try {
      await userDaoV1.updateOne(
        this.modelUser,
        { _id: tokenData.userId },
        params,
        {}
      );
      await loginHistoryDao.updateOne(
        this.modelLoginHistory,
        { "userId._id": tokenData.userId, isLogin: true },
        { "userId.pushNotificationStatus": params.pushNotificationStatus },
        {}
      );
      return MESSAGES.SUCCESS.DEFAULT;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function manageNotification
   * @description this function used to manage the notification
   */
  async manageNotification(
    params: UserRequest.ManageNotification,
    tokenData: TokenData
  ) {
    try {
      if (
        "pushNotificationStatus" in params &&
        (params.pushNotificationStatus || !params.pushNotificationStatus)
      ) {
        await baseDao.updateOne(
          this.modelUser,
          { _id: tokenData.userId },
          { $set: { pushNotificationStatus: params.pushNotificationStatus } },
          {}
        );
        baseDao.updateMany(
          this.modelLoginHistory,
          { userId: tokenData.userId },
          {
            $set: {
              "userId.pushNotificationStatus": params.pushNotificationStatus,
            },
          },
          {}
        );
      }
      if (
        "groupaNotificationStatus" in params &&
        (params.groupaNotificationStatus || !params.groupaNotificationStatus)
      ) {
        await baseDao.updateOne(
          this.modelUser,
          { _id: tokenData.userId },
          {
            $set: { groupaNotificationStatus: params.groupaNotificationStatus },
          },
          {}
        );
        baseDao.updateMany(
          this.modelLoginHistory,
          { userId: tokenData.userId },
          {
            $set: {
              "userId.groupaNotificationStatus":
                params.groupaNotificationStatus,
            },
          },
          {}
        );
      }
      return MESSAGES.SUCCESS.PROFILE_SETTINGS;
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function preSignedURL
   * @description Get a predefined URL for uploading profile picture
   */
  async preSignedURL(params: UserRequest.PreSignedUrl, tokenData: TokenData) {
    try {
      // const ENVIRONMENT = process.env.NODE_ENV.trim();
      // const ENVIRONMENT2 = ["dev", "qa"]
      // if (ENVIRONMENT2.includes(ENVIRONMENT)) {
      // 	AWS.config.update({
      // 		accessKeyId: SERVER.S3.ACCESS_KEY_ID,
      // 		secretAccessKey: SERVER.S3.SECRET_ACCESS_KEY,
      // 		region: SERVER.S3.AWS_REGION,
      // 	});
      // }
      const s3 = new AWS.S3();
      console.log(SERVER.S3.S3_BUCKET_NAME, "*********************bucket name");
      const data = {
        Bucket: SERVER.S3.S3_BUCKET_NAME,
        Key: params.filename,
        Expires: 60 * 60, // URL expiration time in seconds
        ContentType: params.fileType,
        // ACL: "public-read",
      };
      console.log("********************s3 data***********", data);

      const presignedUrl: { url: string } = {
        url: String(await s3.getSignedUrlPromise("putObject", data)),
      };

      return MESSAGES.SUCCESS.DETAILS(presignedUrl);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function userListing
   * @description get the listing of users
   * @param params.pageNo
   * @param params.limit
   * @returns array of users
   */
  async userListing(params: ListingRequest, tokenData: TokenData) {
    try {
      if (tokenData.userType === USER_TYPE.USER) {
        params.userId = tokenData.userId;
      }
      const data = await userDaoV1.userListing(params);
      return MESSAGES.SUCCESS.USER_LIST(data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function userListing
   * @description get the listing of particular assistant users
   * @param params.pageNo
   * @param params.limit
   * @returns array of users
   */
  async assistantUserListing(params: ListingRequest, tokenData: TokenData) {
    try {
      const data = await userDaoV1.assistantUserListing(
        params,
        params?.assistantId || tokenData.userId
      );
      return MESSAGES.SUCCESS.DETAILS(data);
    } catch (error) {
      throw error;
    }
  }

  async blockOrDeleteUser(
    params: UserRequest.blockDeleteUser,
    tokenData: TokenData
  ) {
    try {
      // const user = await userDaoV1.findUserById(params.userId, {
      //   name: 1,
      //   email: 1,
      // });
      if (tokenData.userType === USER_TYPE.ADMIN) {
        if (params.type === STATUS.UN_BLOCKED || STATUS.BLOCKED) {
          await userDaoV1.blockUnblock(params);
          if (params.type === STATUS.BLOCKED) {
            //expire session for already logged in user
            await this.removeSession(params, true);

            return MESSAGES.SUCCESS.BLOCK_USER;
          }
          if (params.type === STATUS.UN_BLOCKED) {
            await userDaoV1.blockUnblock(params);
            return MESSAGES.SUCCESS.UNBLOCK_USER;
          }
        }
        if (params.type === STATUS.DELETED) {
          await Promise.all([
            userDaoV1.deleteUser(params),
            this.removeSession(params, true),
          ]);

          return MESSAGES.SUCCESS.DELETE_USER;
        } else {
          return Promise.reject(MESSAGES.ERROR.INVALID_ADMIN);
        }
      }
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function notificationListing
   * @description get the listing of users
   * @param params.pageNo 
   * @param params.limit
   * @returns array of users
   */
  async notificationListing(params: ListingRequest, tokenData) {
    try {
      const data = await axiosService.getData({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.NOTIFICATION_LISTING, "payload": params, "auth": `Bearer ${tokenData.accessToken}` })
      return MESSAGES.SUCCESS.LIST(data.data);
    }
    catch (error) {
      console.log("Error", error)
      throw error;
    }
  }



  /**
   * @function addUser
   * @description add user by admin
   * @param params.name: user's name (required)
   * @param params.countryCode: user's country code (required)
   * @param params.mobileNo: user's mobile number (required)
   * @param params.email: user's email (required)
   * @param params.address: user's address (required)
   */
  async addUser(params: UserRequest.AddUser) {
    // MongoDB transactions
    const session = await mongoose.startSession();
    session.startTransaction();
    try {
      const isUser = await userDaoV1.isEmailExists(params);
      if (isUser) return Promise.reject(MESSAGES.ERROR.EMAIL_ALREADY_EXIST);
      const isMobileExist = await userDaoV1.isMobileExists(params);
      if (isMobileExist?.isEmailVerified) return Promise.reject(MESSAGES.ERROR.MOBILE_NO_ALREADY_EXIST);

      const generatedPassword = generatePassword(10)
      const salt = genRandomString(SERVER.SALT_ROUNDS);
      const hash = encryptHashPassword(generatedPassword, salt)


      const dataToInsert = { ...params, salt, hash };
      dataToInsert["isEmailVerified"] = true;
      dataToInsert["isProfileCompleted"] = true;
      const user = await userDaoV1.addUser(dataToInsert, session);

      await session.commitTransaction();
      session.endSession();

      let dataToReturn = {
        userId: user._id,
        name: user.name,
        email: user.email,
        status: user.status,
        created: user.created
      };

      let mailData = {
        type: MAIL_TYPE.WELCOME_USER,
        email: params.email,
        password: generatedPassword,
      };

      axiosService.postData({
        url: process.env.NOTIFICATION_APP_URL + SERVER.SEND_MAIL,
        body: mailData,
      });

      return MESSAGES.SUCCESS.ADD_USER(dataToReturn);
    } catch (error) {
      // MongoDB transactions
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  }

  /**
   * @function editUser
   * @description Edit User by Admin
   */
  async editUser(params: UserRequest.EditUser, tokenData: TokenData) {
    try {
      const model: any = DB_MODEL_REF.USER;
      const user = await userDaoV1.findUserById(params.userId);
      if (!user) return Promise.reject(MESSAGES.ERROR.USER_NOT_FOUND);
      if (user.isProfileCompleted === false)
        params['isProfileCompleted'] = true
      let data = await userDaoV1.editProfile(params, params.userId);
      let dataToReturn = {
        userId: data._id,
        mobileNo: data.mobileNo,
        name: data.name,
        location: data.location,
      }
      return MESSAGES.SUCCESS.EDIT_PROFILE(dataToReturn);
    } catch (error) {
      console.error("Error in editProfile:", error);
      throw error;
    }
  }

/**
 * @function receivedNotificationListing
 * @description Retrieves the list of received notifications for a user.
 * @param {UserRequest.UserNotificationList} params - Parameters for fetching the notification list.
 * @param {string} accessToken - User's access token for authentication.
 * @returns A success message containing the notification list data.
 * @throws Will throw an error if the operation fails.
 */
  async receivedNotificationListing(params: UserRequest.UserNotificationList, accessToken: string) {
    try {
      let data = await axiosService.getData({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.NOTIFICATION_LIST, "payload": params, auth: accessToken });
      return MESSAGES.SUCCESS.NOTIFICATION_LIST(data.data);
    } catch (error) {
      throw error;
    }
  }

/**
 * @function readNotification
 * @description Marks notifications as read for a user
 * @param {UserRequest.ReadNotification} params - Contains notification IDs to be marked as read
 * @param {string} accessToken - User's access token for authentication
 * @returns A success message with the updated notification data
 * @throws Will throw an error if the operation fails
 */
  async readNotification(params: UserRequest.ReadNotification, accessToken: string) {
    try {
      let data = await axiosService.putData({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.NOTIFICATION_READ, "body": params, auth: accessToken });
      return MESSAGES.SUCCESS.READ_NOTIFICATION(data.data);
    } catch (error) {
      throw error;
    }
  }

  /**
   * @function clearNotification
   * @description clear the notifications
   * @param params.notificationId: notification id (optional)
   * @param accessToken: access token
   * @returns clear notification data
   */
  async clearNotification(params: UserRequest.ClearNotification, accessToken: string) {
    try {
      let data = await axiosService.putData({ "url": SERVER.NOTIFICATION_APP_URL + SERVER.NOTIFICATION_CLEAR, "body": params, auth: accessToken });
      return MESSAGES.SUCCESS.CLEAR_NOTIFICATION(data.data);
    } catch (error) {
      throw error;
    }
  }
}

export const userController = new UserController();
