import { RequestHandler } from 'express';
import bcrypt from 'bcryptjs';

import { ENV, getSignInResponse, pgClient } from '@/utils';
import { sendError } from '@/errors';
import { Joi, phoneNumber } from '@/validation';
import { isTestingPhoneNumber, isVerifySid } from '@/utils/twilio';
import twilio from 'twilio';

export type OtpSmsRequestBody = {
  phoneNumber: string;
  otp: string;
};

export const signInOtpSchema = Joi.object<OtpSmsRequestBody>({
  phoneNumber,
  otp: Joi.string().required(),
}).meta({ className: 'SignInOtpSchema' });

export const signInOtpHandler: RequestHandler<
  {},
  {},
  OtpSmsRequestBody
> = async (req, res) => {
  if (!ENV.AUTH_SMS_PASSWORDLESS_ENABLED) {
    return sendError(res, 'disabled-endpoint');
  }

  const { body } = req;

  const { phoneNumber, otp } = body;

  const user = await pgClient.getUserByPhoneNumberAndOtp(phoneNumber);

  if (!user) {
    return sendError(res, 'invalid-otp');
  }

  if (user.disabled) {
    return sendError(res, 'disabled-user');
  }

  if (!user || !user.otpHash) {
    return sendError(res, 'invalid-otp');
  }
  const userId = user.id;

  async function verifyPhoneNumberAndSignIn() {
    await pgClient.updateUser({
      id: userId,
      user: {
        otpHash: null,
        phoneNumberVerified: true,
      },
    });

    const signInResponse = await getSignInResponse({
      userId: userId,
      checkMFA: true,
    });

    return res.send(signInResponse);
  }

  if (isTestingPhoneNumber(user.phoneNumber)) {
    if (await bcrypt.compare(otp, user.otpHash)) {
      return await verifyPhoneNumberAndSignIn();
    } else {
      return sendError(res, 'invalid-otp');
    }
  }

  if (!ENV.AUTH_SMS_PROVIDER) {
    throw Error('No sms provider set');
  }

  const messagingServiceSid = ENV.AUTH_SMS_TWILIO_MESSAGING_SERVICE_ID;

  if (isVerifySid(messagingServiceSid)) {
    const twilioClient = twilio(
      ENV.AUTH_SMS_TWILIO_ACCOUNT_SID,
      ENV.AUTH_SMS_TWILIO_AUTH_TOKEN
    );

    try {
      const verificationCheck = await twilioClient.verify
        .services(messagingServiceSid)
        .verificationChecks.create({
          code: otp,
          to: user.phoneNumber ?? '',
        });

      if (!verificationCheck.valid || verificationCheck.status !== 'approved') {
        return sendError(res, 'invalid-otp');
      }
    } catch (error) {
      throw Error('Cannot veirfy otp');
    }
  } else if (!(await bcrypt.compare(otp, user.otpHash))) {
    return sendError(res, 'invalid-otp');
  }

  return verifyPhoneNumberAndSignIn();
};
