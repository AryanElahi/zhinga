const express = require("express")
const {PrismaClient} = require("@prisma/client")
const prisma = new PrismaClient()
const bcrypt = require("bcrypt")
const JWT = require("jsonwebtoken")
const createErrors = require ("http-errors")
const { client, connectRedis, disconnectRedis } = require("./../../loader/redis")

async function doesExistphone(phone) {
const Exist = await prisma.user.findUnique({
    where: {
        phone: phone
    }
    })
    if (Exist) return (true)
    if (!Exist) return (false)
}
async function hashPassword (pass) {
    const salt = await bcrypt.genSalt(10)
    let hashedpass = await bcrypt.hash(pass, salt)
    return (hashedpass)
}
async function creatUser (data){
    const newuser =await prisma.user.create({
        data :
            data           
    })
    return newuser
}
async function userPhoneVarify(phone) {
  await prisma.user.update({
  where: {phone: phone},
  data : {phoneVarify : true}
  })
}
async function getUserByPhone (phone){
    const user = await prisma.user.findUnique({
        where:  {
            phone : phone 
        }
    })
    return user
}
async function getAllUsers () {
    const user = await prisma.user.findMany()
    const counter = user.length
    return ({"users" : user, "number" : counter} )
}
async function isValid(pass, dpass){
    try {
        bcrypt.compare(pass, dpass ,(err, data) => {
            if (err) throw err
            if (data) {
                return  (true)
            }
            if (!data) return  (false)
        })
    } catch (error) {
        throw error
    }
}
async function updateUser (phone, result){
  try {
    const updated = await prisma.user.update({
    where: {phone: phone},
    data : result
    })
  return (updated)
  } catch (error) {
    if (error) return(error)
  }
}
async function getUserByAccessToken(AccessToken){
  //enter just the AT without of any othe thing
  
  return new Promise((resolve, reject) => {
    JWT.verify(AccessToken, "sdljkdlkjasdlkdjsalkdjsakldsajklajsd" , (err, payload) => {
      if (err) {
        reject(createErrors.InternalServerError())
        return
      }
      const phone = payload.aud.toString()
      resolve (phone)
    })
  })
}
async function getUserAnnounce(phone) {
  const userAnnounces = await prisma.property.findMany(
    {where : {
      userID : phone
    }}
  )
  return userAnnounces
}
module.exports = {
    doesExistphone,
    hashPassword,
    creatUser,
    getUserByPhone,
    getAllUsers,
    isValid,
    updateUser,
    getUserByAccessToken,
    getUserAnnounce,
    signRefreshToken: (phone) => {
      return new Promise((resolve, reject) => {
        const payload = {};
        const secret = "80a3236d80c07f007bc56c5c30598a9ea4876f7bab2e69cc777e22f96ccead6a";
        const options = {
          expiresIn: '1y',
          issuer: 'pickurpage.com',
          audience: phone,
        };
    
        JWT.sign(payload, secret, options, async (err, token) => {
          if (err) {
            return reject(createError.InternalServerError());
          }
          try {
            await connectRedis();
            await client.set(phone, token, {
              EX: 365 * 24 * 60 * 60,
            });
            resolve(token);
          } catch (err) {
            console.error('Error:', err);
            reject(createError.InternalServerError());
          } finally {
            await disconnectRedis();
          }
        });
      });
    },
    signAccessToken: (phone) => {
        return new Promise((resolve, reject) => {
          const payload = {}
          const secret = "sdljkdlkjasdlkdjsalkdjsakldsajklajsd"
          const options = {
            expiresIn: '1y',
            issuer: 'pickurpage.com',
            audience: phone,
          }
          JWT.sign(payload, secret, options, (err, token) => {
            if (err) {
              reject(createError.InternalServerError())
              return
            }
            resolve(token)
          })
        })
      },
    userPhoneVarify
}