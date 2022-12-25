import express from "express";
import {
  getHashedPassword,
  getOneUser,
  postUser,
  putActivateUser,
  putUpdateUser,
} from "../helpers/usersHelper.js";
import randomstring from "randomstring";
import nodemailer from "nodemailer";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { ObjectId } from "mongodb";
import { authMiddleware } from "../middleware/authMiddleware.js";
import { FE_LINK } from "../index.js";

const router = express.Router();

router.post("/register", async (request, response) => {
  try {
    const { firstName, lastName, email, password } = request.body;

    const checkEmail = await getOneUser({ email: email });
    if (checkEmail) {
      response
        .status(200)
        .send({ isSuccess: false, message: "Email already exists." });
      return;
    }

    const hashedPassword = await getHashedPassword(password);

    const result = await postUser({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      isAdmin: false,
      activated: false,
      fpToken: "",
    });

    if (result.insertedId !== "") {
      const user = await getOneUser({ email: email });
      const activationToken = jwt.sign(
        { id: user._id },
        process.env.ACTIVATION_KEY,
        {
          expiresIn: "2h",
        }
      );

      const activationUrl = `${FE_LINK}/account-activation`;
      const mailbody1 =
        "Please click or copy the below activation link to activate your account.";
      const mailNote = "The activation link expires in 2 hours.";
      const subject = "Activation Email - User Registration (URL Shortner)";
      await sendEmail(
        firstName,
        lastName,
        email,
        activationToken,
        activationUrl,
        mailbody1,
        subject,
        mailNote
      );
      response.status(200).send({
        isSuccess: true,
        message:
          "User registered successfully. Kindly check your email for activation link.",
      });
    } else {
      response
        .status(400)
        .send({ isSuccess: false, message: "Error in user registration." });
    }
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

router.get("/confirmation/:activationToken", async (request, response) => {
  try {
    const { activationToken } = request.params;
    if (!activationToken) {
      response.status(400).send({
        isSuccess: false,
        message: "User account cannot be activated - Authentication issue.",
      });
      return;
    }

    try {
      let verifyUser;
      jwt.verify(activationToken, process.env.ACTIVATION_KEY, function (
        err,
        decoded
      ) {
        if (err) {
          response.status(400).send({
            isSuccess: false,
            message:
              "Activation link expired. Kindly try to login to resend the activation mail to your email.",
          });
          return;
        }
        verifyUser = decoded;
      });

      await putActivateUser(verifyUser.id);
      response.status(200).send({
        isSuccess: true,
        message: "Your account has been activated successfully !!!",
      });
    } catch (error) {
      response.status(400).send({
        isSuccess: false,
        message: `${error.message}. Kindly retry with the same link or try to login to resend the activation mail to your email.`,
      });
    }
  } catch (error) {
    response.status(400).send({
      isSuccess: false,
      message: `${error.message}. Kindly retry with the same link or try to login to resend the activation mail to your email.`,
    });
  }
});

router.post("/login", async (request, response) => {
  try {
    const { email, password } = request.body;

    const user = await getOneUser({ email: email });
    if (!user) {
      response
        .status(200)
        .send({ isSuccess: false, message: "Invalid credentials!!!" });
      return;
    }

    const storedPw = user.password;
    const isPwMatch = await bcrypt.compare(password, storedPw);
    if (!isPwMatch) {
      response
        .status(200)
        .send({ isSuccess: false, message: "Invalid credentials!!!" });
      return;
    }

    if (!user.activated) {
      const activationToken = jwt.sign(
        { _id: user._id },
        process.env.ACTIVATION_KEY,
        {
          expiresIn: "2h",
        }
      );

      const activationUrl = `${FE_LINK}/account-activation`;
      const mailbody1 =
        "Please click or copy the below activation link to activate your account.";
      const mailNote = "The activation link expires in 2 hours.";
      const subject = "Activation Email - User Registration (URL Shortner)";

      await sendEmail(
        user.firstName,
        user.lastName,
        email,
        activationToken,
        activationUrl,
        mailbody1,
        subject,
        mailNote
      );

      response.status(200).send({
        isSuccess: true,
        message:
          "Account is not activated. Kindly check your email for activation link.",
      });
      return;
    }

    const loginToken = jwt.sign(
      {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email,
        isAdmin: user.isAdmin
      },
      process.env.AUTH_KEY,
      { expiresIn: "1h" }
    );

    if(request.cookies[`${user._id}`]){
      request.cookies[`${user._id}`] = "";
    }

    response.cookie(user._id, loginToken, {
      path: "/",
      expires: new Date(Date.now() + 1000 * 60 * 60),
      httpOnly: true,
      sameSite: "lax",
    });

    response
      .status(200)
      .send({ isSuccess: true, message: "Successful login" });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

router.post("/forgot-password", async function (request, response) {
  try {
    const { email } = request.body;

    const user = await getOneUser({ email: email });
    if (!user) {
      response.status(200).send({
        isSuccess: false,
        message: "Email doesn't exist. Kindly register.",
      });
      return;
    }

    if (!user.activated) {
      response.status(200).send({
        isSuccess: false,
        message:
          "Account is not activated. Kindly activate your account first.",
      });
      return;
    }

    const randomStr = randomstring.generate();
    const expireToken = Date.now() + 1000 * 60 * 10;
    const updateFpToken = await putUpdateUser(email, {
      fpToken: randomStr,
      expireToken: expireToken,
    });

    if (updateFpToken.modifiedCount <= 0) {
      response.status(400).send({
        isSuccess: false,
        message: "Failed to send password reset mail!!!",
      });
      return;
    }

    const resetUrl = `${FE_LINK}/reset-password`;
    const mailbody1 =
      "Please click or copy the below password-reset link to reset your password.";
    const mailNote = "The activation link expires in 10 minutes.";
    const subject = "Password Reset (URL Shortner)";
    await sendEmail(
      user.firstName,
      user.lastName,
      email,
      randomStr,
      resetUrl,
      mailbody1,
      subject,
      mailNote
    );
    response.status(200).send({
      isSuccess: true,
      message: "Kindly check your email for password-reset link.",
    });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

router.get("/reset-password/:resetToken", async function (request, response) {
  try {
    const { resetToken } = request.params;
    const checkTokenExp = await getOneUser({
      fpToken: resetToken,
      expireToken: { $gt: Date.now() },
    });
    if (!checkTokenExp) {
      response.status(400).send({ isSuccess: false, message: "Token expired" });
      return;
    }
    response.status(200).send({ isSuccess: true, message: "Token Verified" });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

router.post("/reset-password/:resetToken", async function (request, response) {
  try {
    const { resetToken } = request.params;
    const checkToken = await getOneUser({ fpToken: resetToken });

    if (!checkToken) {
      response
        .status(400)
        .send({ isSuccess: false, message: "Token not matching" });
      return;
    }

    const { password } = request.body;
    const hashedPassword = await getHashedPassword(password);

    const updatePassword = await putUpdateUser(checkToken.email, {
      password: hashedPassword,
      fpToken: "",
      expireToken: 0,
    });
    if (updatePassword.modifiedCount <= 0) {
      response
        .status(400)
        .send({ isSuccess: false, message: "Failed to update Password" });
      return;
    }

    response.status(200).send({
      isSuccess: true,
      message: "Password has been reset. You will be redirected to Login page.",
    });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

router.get("/user", authMiddleware, async function (request, response) {
  try {
    const user = await getOneUser({ _id: ObjectId(request.user.id), email: request.user.email });
    if (!user) {
      response
        .status(401)
        .send({ isSuccess: false, message: "Unauthorized" });
      return;
    };

    user
      ? response.status(200).send({
          isSuccess: true,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isAdmin: user.isAdmin,
        })
      : response
          .status(404)
          .send({ isSuccess: false, message: "Unknown user" });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
});

router.post("/logout", authMiddleware, (request, response) => {
  try {
    const cookies = request.headers.cookie;
    const prevToken = cookies.split("=")[1];
    if (!prevToken) {
      return response
        .status(404)
        .send({ isSuccess: false, message: "No token found" });
    }

    jwt.verify(prevToken, process.env.AUTH_KEY, (err, decoded) => {
      if (err) return response.status(403).send({ isSuccess: false, message: "No token found" });

      response.clearCookie(`${decoded.id}`);
      request.cookies[`${decoded.id}`] = "";

      return response.status(200).send({ isSuccess: true, message: "Successfully Logged out" });
    });
    
  } catch (error) {
    return response
      .status(400)
      .send({ isSuccess: false, message: error.message });
  }
})

async function sendEmail(
  firstName,
  lastName,
  email,
  token,
  url,
  body,
  subject,
  note
) {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      requireTLS: true,
      auth: {
        user: process.env.EMAIL,
        pass: process.env.APP_PASSWORD,
      },
    });

    const mailOptions = {
      from: `do-not-reply@gmail.com <Do Not Reply>`,
      to: email,
      subject: `${subject}`,
      html: `<p>Hi <b>${lastName}, ${firstName}</b>, </br></br>
                ${body}</br></br>

                <a href="${url}/${token}" target="_blank">${url}/${token}</a></br></br>

                <b>Note: </b>${note}</br></br>

                Regards.                
            </p>`,
    };

    await transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log("Mail has been sent -", info.response);
      }
    });
  } catch (error) {
    response.status(400).send({ isSuccess: false, message: error.message });
  }
}

export const usersRouter = router;
