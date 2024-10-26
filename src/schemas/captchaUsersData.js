const { model, Schema } = require("mongoose");

let captchaUsersDataSchema = new Schema({
    Guild: String,
    UserID: String,
    Username: String,
    JoinedAt: String,
    ReJoinedTimes: Number,
    Captcha: String,
    CaptchaStatus: String,
    CaptchaExpired: Boolean,
    MissedTimes: Number
});

module.exports = model("captchas-data", captchaUsersDataSchema)