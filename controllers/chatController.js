const Joi = require('joi');

const Chat = require("../models/Chat");
const { User } = require("../models/User");

const AppError = require("../utils/AppError");
const { success } = require('../utils/apiResponse');


/**
 * @route   POST /api/v1/chats
 * @desc    get or create the chat of the specified user with the current user
 * @access  Protected
 *
 * @param   {Object} req - Express request object.
 * @param   {Object} res - Express response object.
 *
 * @returns {void}
 */

const getOrCreateChat = async (req, res) => {
    // Define Joi schema for params validation
    const schema = Joi.string()
        .label('User ID')
        .required()
        .regex(/^[0-9a-fA-F]{24}$/)
        .rule({ message: '{{#label}} is Invalid!' });

    // Validate request param with Joi schema
    const { error, value: userId } = schema.validate(req.body.userId);
    if (error) {
        // If input validation fails, throw AppError with 422 status code and validation errors
        throw new AppError(error.details[0].message, 422);
    }

    // Check if user already exists in database or not
    let checkId = await User.findOne({ id: userId });
    if (!checkId) throw new AppError("User Not Found", 404);

    const chat = await Chat.find({
        isGroupChat: false,
        $and: [
            { 
                users: { 
                    $elemMatch: { 
                        $eq: req.user._id 
                    } 
                }
            },
            {
                users: { 
                    $elemMatch: { 
                        $eq: userId
                    } 
                }
            },
        ],
    })
        .populate({
            path: "users",
            select: "-password",
        })
        .populate({
            path: "latestMessage",
            populate: {
                path: "sender",
                select: "username, firstName, lastName, avatar",
            }
        });

    if (chat.length) {
        return res.status(200).json(success("Success", 200, { chat: chat[0] }));
    }
    else {
        let chatData = {
            chatName: "sender",
            isGroupChat: false,
            users: [req.user._id, userId],
        };

        const createdChat = await Chat.create(chatData);

        const completeChat = await Chat.findOne({ _id: createdChat._id }).populate({
            path: "users",
            select: "-password",
        });

        return res.status(200).json(success("Success", 200, { chat: completeChat }));
    }
}



/**
 * @route   GET /api/v1/chats
 * @desc    get all the chats related to the current user
 * @access  Protected
 *
 * @param   {Object} req - Express request object.
 * @param   {Object} res - Express response object.
 *
 * @returns {void}
 */

const getAllChats = async (req, res) => {
    
    const chats = await Chat.find({ 
        users: { 
            $elemMatch: { $eq: req.user._id } 
        }
    })
        .populate({
            path: "users",
            select: "-password",
        })
        .populate({
            path: "groupAdmin",
            select: "-password",
        })
        .populate({
            path: "latestMessage",
            populate: {
                path: "sender",
                select: "username, firstName, lastName, avatar",
            }
        })
        .sort({ updatedAt: -1 });

    return res.status(200).json(success("Success", 200, { chats }));
}



module.exports = {
    getOrCreateChat,
    getAllChats
}