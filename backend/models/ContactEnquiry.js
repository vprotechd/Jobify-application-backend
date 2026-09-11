import mongoose from "mongoose";
const schema = new mongoose.Schema({
  name:{type:String,required:true,trim:true}, email:{type:String,required:true,lowercase:true,trim:true}, subject:{type:String,required:true,trim:true}, message:{type:String,required:true,trim:true}, status:{type:String,enum:["new","in_progress","resolved"],default:"new"}
},{timestamps:true});
export default mongoose.model("ContactEnquiry",schema);
