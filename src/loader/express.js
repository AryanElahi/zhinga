const express = require("express")
const morgan = require("morgan")
const createErrors = require("http-errors")
const routes = require("../api/routes")
require("dotenv").config()
const {save_visitor} = require("./../services/adminpanel/visitCountingServices")
const { errorHandler, notFoundHandler } = require("./..//api/middlewares/errorHandeler");

const expressLoader = async (app) => {
    app.use(morgan("dev"))
    app.use(express.json())
    app.use(express.urlencoded({extended: true}))
    app.get("/", async (req, res, next) => {
        await save_visitor(req)
        res.send("Home Rout")
    })
    app.use("/api", routes())
    app.use(notFoundHandler);
    app.use(errorHandler);
//    app.use(async(req, res, next) => {
//        next(createErrors.NotFound())
//        })
//    app.use( async (err, req, res, next) => {
//    res.status(err.status || 500)
//    res.send({
//        erorr :{
//            status : err.status || 500,
//            message: err.message,
//        }
//    })
// })

app.listen(3000, () => {
    console.log(`Server is running on port 3000`);
})
}

module.exports = expressLoader;