const express = require("express")
const router = express.Router()
const creatErrors = require("http-errors")
const {signupVal, loginVal, phone, codephone} = require("../../../../validation/user.auth.validation copy")
const {doesExistphone, hashPassword, signRefreshToken, creatUser, 
     getUserByPhone, isValid, signAccessToken, getUserByAccessToken, updateUser, userPhoneVarify, getUserAnnounce} = require("../../../../services/user/auth")
const {verifyAccessToken, verifyRefreshToken} = require("../../../middlewares/isAuth.middleware")
const {    
    generateNewCodeForThisNumber,
    CheckIfCorrect,
    sendSMS, getRandomInt, saveCodeInDB
} = require ("../../../../services/user/sms")
const { client , connectRedis, disconnectRedis } = require("./../../../../loader/redis")
router.post("/test", verifyAccessToken,async (req, res)=> {
    const a = await getUserByAccessToken (req.body.AccessToken)
    const AS = await getUserAnnounce(a)
    res.send(AS)
})
router.post ("/register", async (req, res, next) => {
    try {
        const result = await signupVal.validateAsync (req.body)
        if (await doesExistphone(result.phone) === true) throw creatErrors.Conflict("phone already exists")
        result.password = await hashPassword(result.password)
        await creatUser(result)
        console.log(await getUserByPhone(result.phone))
        const phone = result.phone
        console.log(phone)
        const code = getRandomInt()
        await sendSMS(code, phone)
        await saveCodeInDB(code, phone)
        res.send(await getUserByPhone(result.phone))
    } catch (error) {
        if (error.isJoi === true) error.status = 422
        next(error)
    }
    })
router.post ("/varify", async (req, res, next) =>
    {
        let result = await codephone.validateAsync (req.body)
        const phone = result.phone
        const code = result.code
        const status = await CheckIfCorrect(code, phone)
        if (status == 1) {
            userPhoneVarify(phone)
            res.send(await getUserByPhone(phone))
        } if ( status == 2 ){
            res.status(200).send("code is not true")
        } if ( status == 3) {
            res.status(200).send("code expired")
        }
    })
router.post ("/newcode", async (req, res, next) => {
    const result = await phone.validateAsync(req.body)
    const number = result.phone
    const code = getRandomInt()
    await generateNewCodeForThisNumber(code, number)
    res.send("ok")
})
router.post("/login", async (req, res, next) => {
    try {
        const result = await loginVal.validateAsync(req.body) 
        const user = await getUserByPhone(result.phone)
        if (user.phoneVarify === false) {
            res.status(401).send("phone not varify")
        }
        else {
        const compare = await isValid(result.password, user.password)
        if (!user || result.softDelete) throw creatErrors.NotFound("user is not regesterd")
        if (compare === false) throw creatErrors.Unauthorized("username or password is not correct")
        const refreshToken = await signRefreshToken(user.phone)
        const AccessToken = await signAccessToken(user.phone)
        res.send({refreshToken, AccessToken})
        }       
    } catch (error) {
        if (error.isJoi === true) error.status = 422
        if (error.isJoi === true) return next(creatErrors.BadRequest("username or password is invalid"))
        next(error)
    }
})

router.delete ("/refreshToken", async (req, res, next) => {
    try {
        const {refreshToken} = req.body
        if (!refreshToken) throw creatErrors.BadRequest()
        const phone = await verifyRefreshToken(refreshToken)
        const AccessToken = await signAccessToken(phone)
        const RefreshToken = await signRefreshToken(phone)
        res.send({AccessToken, RefreshToken})
    } catch (error) {
        console.error('Auth Error:', error);
        next(error);    }
})

router.put ("/updateuser", async (req, res) => {
    try {
        let result = await signupVal.validateAsync(req.body)
        if (!req.headers["authorization"]) next (creatErrors.Unauthorized())
        const authheader = req.headers["authorization"]
        let phone = await getUserByAccessToken(authheader)
        res.send(await updateUser(phone, result))
    } catch (error) {
        if (error) throw error
    }

})

router.delete ("/logout", async (req, res, next) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            throw creatErrors.BadRequest("Refresh token is required!");
        }
        const phone = await verifyRefreshToken(refreshToken);
        try {
            await connectRedis();
            const result = await client.del(phone)
            console.log(result)
            if (result === 0) {
                throw creatErrors.NotFound("Refresh token not found or already deleted.");
            }
            await disconnectRedis();
            res.sendStatus(204);
        } catch (redisError) {
            console.error("Redis error:", redisError);
            return next(creatErrors.InternalServerError("Redis connection or operation failed."));
        }
    } catch (error) {
        if (error instanceof creatErrors.HttpError) {
            return next(error);
        } else {
            console.error("Unexpected error:", error);
            return next(creatErrors.InternalServerError("An unexpected error occurred"));
        }
    }
});

router.post("/getAnnouncements", verifyAccessToken ,async (req, res)=> {
    const phone = await getUserByAccessToken (req.body.AccessToken)
    const Announces = await getUserAnnounce(phone)
    res.send(Announces)
})




module.exports = router