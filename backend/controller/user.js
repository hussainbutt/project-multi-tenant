const express = require("express");
const path = require("path");
const User = require("../model/user.js");
const router = express.Router();
const { upload } = require("../multer");
const jwt = require("jsonwebtoken");
const fs = require("fs");
const ErrorHandler = require("../utils/ErrorHandler"); // ✅ Make sure this is imported
const sendMail = require("../utils/sendmail.js");
const catchAsyncError = require("../middleware/catchAsyncError.js");
const sendToken = require("../utils/jwttoken.js");
require("dotenv").config();

router.post("/create-user", upload.single("file"), async (req, res, next) => {
    try {
        const { name, email, password, } = req.body;


        const userEmail = await User.findOne({ email });

        if (userEmail) {
            const filename = req.file.filename;
            const filePath = "uploads/" + filename;
            fs.unlink(filePath, (err) => {
                if (err) {
                    console.error("Error deleting file:", err);
                    res.status(500).json({ message: "Error deleting file" });
                }
            });
            return next(new ErrorHandler("User already exists", 400));
        }

        if (!req.file) {
            return next(new ErrorHandler("No file uploaded", 400));
        }


        const filename = req.file.filename;
        const filePath = "uploads/" + filename;
        const user = {
            name,
            email,
            avatar: { url: filePath },
            password,
        };


        const activationToken = createActivationToken(user);
        const activationUrl = `http://localhost:3000/activation/${activationToken}`;

        try {
            await sendMail(
                {
                    email: user.email,
                    subject: "E-Shop - Account Activation",
                    message: `Hello ${user.name},\n\nPlease click on the link below to activate your account:\n\n${activationUrl}\n\nThank you!`
                })
            res.json({
                success: true,
                message: `Please check your email - ${user.email} to activate your account`,
            });

        } catch (error) {
            console.error("Error creating activation token:", error);
            return next(new ErrorHandler(error.message, 500));
        }


    } catch (error) {
        return next(new ErrorHandler(error.message, 400));
    }
});

const createActivationToken = (user) => {
    console.log("ACTIVATION_SECRET:", process.env.ACTIVATION_SECRET);

    return jwt.sign(user, process.env.ACTIVATION_SECRET, {
        expiresIn: "5m",
    })
};

//active user 
router.post("/activation", catchAsyncError(async (req, res, next) => {
    try {
        console.log("ACTIVATION_SECRET:", process.env.ACTIVATION_SECRET);
        const { activation_token } = req.body;
        console.log("Activation token received:", activation_token);

        const newUser = jwt.verify(activation_token, process.env.ACTIVATION_SECRET);
        if (!newUser) {
            return next(new ErrorHandler("Invalid activation token", 400));
        }
        const { name, email, avatar, password } = newUser;
        let user = await User.findOne({ email });
        if (user) {
            return next(new ErrorHandler("User already exists", 400));
        }
        user = await User.create({
            name,
            email,
            avatar,
            password,
        });
        console.log("sending token");

        sendToken(user, 201, res);


    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}))

// login user
router.post("/login-user", catchAsyncError(async (req, res, next) => {
    console.log("Login request received");

    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return next(new ErrorHandler("Please provide the all fields!", 400));
        }

        const user = await User.findOne({ email }).select("+password");

        if (!user) {
            return next(new ErrorHandler("User doesn't exists!", 400));
        }

        const isPasswordValid = await user.comparePassword(password);

        if (!isPasswordValid) {
            return next(
                new ErrorHandler("Please provide the correct information", 400)
            );
        }

        sendToken(user, 201, res);
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
})
);
//get user
router.get("/getUser", catchAsyncError(async (req, res, next) => {
    try {
        const user = await User.findById(req.user._id).select("-password");
        if (!user) {
            return next(new ErrorHandler("User not found", 404));
        }
        res.status(200).json({
            success: true,
            user,
        });
    } catch (error) {
        return next(new ErrorHandler(error.message, 500));
    }
}));


module.exports = router;
