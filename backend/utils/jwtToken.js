const sendToken = (user, statusCode, res) => {
    const token = user.getJwtToken();

    // Cookie options with default expiry of 7 days if not set
    const options = {
        expires: new Date(
            Date.now() + (Number(process.env.COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000
        ),
        httpOnly: true,

    }

    res.status(statusCode).cookie("token", token, options).json({
        success: true,
        user,
        token
    });
}

module.exports = sendToken;