const mongoose = require('mongoose')
const validator = require('validator')

const connectionRequestSchema = new mongoose.Schema({
    '@id': {
        type: String,
        default: 'connection-request',
        required: true,
    },
    did:{
        type: String,
        required: true
    },
    newDid:{
        type: String,
        required: true
    },
    newKey: {
        type: String,
        required: true
    },
    ip: {
        type: String,
        required: true
    },
    // port: {
    //     type: Mixed,
    //     required: true
    // },
    recipientDid:{
        type: String,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        ref: 'User'
    },
    public: {
        type: Boolean,
        default: false,
        required: true
    },
    responded: {
        type: Boolean,
        default: false,
        required: true
    }
    // accepted: {
    //     type: Boolean,
    //     default: false,
    //     required: true
    // }
    // reverted: {
    //     type: Boolean,
    //     default: false,
    //     required: true
    // }
},{
    timestamps: true
})

const ConnectionRequest = mongoose.model('ConnectionRequest', connectionRequestSchema)

module.exports = ConnectionRequest