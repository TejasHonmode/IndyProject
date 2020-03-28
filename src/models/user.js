const mongoose = require('mongoose')
const validator = require('validator')
const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const DidKeyPair = require('./didKeyPair')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        //trim: true
    },

    id: {
        type: String,
        unique: true,
        required: true,
        trim: true,
        //lowercase: true,
        // validate(value) {
        //     if(!validator.isEmail(value)){
        //         throw new Error('Email is invalid')
        //     }
        // }
    },
    key: {
        type: String,
        required: true,
        trim: true,
        minlength: 7
        // validate(value){
        //     if(value.toLowerCase().includes('password')){
        //         throw new Error('Password cannot contain "password"')
        //     }
        // }

    },

    // refid: {
    //     type: String, 
    //     default: '0',
    //     validate(value) {
    //         if(value.length>32){
    //             throw new Error('Max length 32')
    //         }
    //     }
    // },
    // did: {
    //     type: String,
    // },
    // verkey: {
    //     type: String
    // },
    userWalletHandle: {
        type: Number,
        default: -1
    },
    role : {
        type: String,
        default: 'USER',
        required: true
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }]
}, {
    timestamps: true
})


userSchema.virtual('didKeyPairs', {
    ref: 'DidKeyPair',
    localField: '_id',
    foreignField: 'owner'
})


userSchema.methods.toJSON = function() {
    const user = this

    const userObject = user.toObject()

    delete userObject.key
    delete userObject.tokens

    return userObject
}


userSchema.methods.generateAuthToken = async function() {
    const user = this

    const token = jwt.sign({ _id: user._id.toString() }, 'indyProject')

    user.tokens = user.tokens.concat({token})
    await user.save()
    
    return token
}


userSchema.pre('save', async function (next) {
    const user = this
    console.log('Just before saving.....')

    if(user.isModified('key')){
        user.key = await bcryptjs.hash(user.key, 8)
    }

    next()
})


userSchema.pre('remove', async function(next) {
    const user = this

    await DidKeyPair.deleteMany({owner: user._id})

    next()

})


userSchema.statics.findByCredentials = async(id, key) => {
    // const user = this
    const user = await User.findOne({id})
    if(!user){
        throw new Error('Wrong wallet id')
    }

    const isMatch = await bcryptjs.compare(key, user.key)

    if(!isMatch){
        throw new Error('Wrong password')
    }

    return user
}

const User = mongoose.model('User', userSchema)

module.exports = User