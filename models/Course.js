const mongoose = require('mongoose')

const CourseSchema = new mongoose.Schema({
  route: {
    type: String,
    trim: true,
    required: [true, 'Please ass the route name'],
  },
  description: {
    type: String,
    required: [true, 'please add a description'],
  },
  distance: {
    type: Number,
    required: [true, 'please ass the total distance'],
  },
  startLocation: {
    type:String,
    required:true
    //GeoJSON point'
    // type: {
    //   type: String,
    //   // enum: ['Point'],
    //   required: true,
    // },
    // coordinates: {
    //   type: [Number],
    //   required: true,
    //   index: '2dsphere',
    // },
    // formattedAddres: String,
    // street: String,
    // city: String,
    // state: String,
    // zipcode: String,
    // country: String,
  },
  endLocation: {
    type:String,
    required:true
    //GeoJSON point'
    // type: {
    //   type: String,
    //   // enum: ['Point'],
    //   required: true,
    // },
    // coordinates: {
    //   type: [Number],
    //   required: true,
    //   index: '2dsphere',
    // },
    // formattedAddres: String,
    // street: String,
    // city: String,
    // state: String,
    // zipcode: String,
    // country: String,
  },
 
  stops:{
    type:String
  },
  vehiclesAssigned:{
    type:Number,
    required:[true, 'please specify the number of vehicles assigned']
  },
  createdAt:{
    type:Date,
    default:Date.now
  },
  vehicle:{
    type:mongoose.Schema.ObjectId,
    ref:'Vehicle',
    required:true
  },
  user:{
    type:mongoose.Schema.ObjectId,
    ref:'User',
    required:true
  }

})


module.exports = mongoose.model('Course', CourseSchema) 