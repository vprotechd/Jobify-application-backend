import ContactEnquiry from "../models/ContactEnquiry.js";
import User from "../models/User.js";
import { createNotification } from "../utils/createNotification.js";
export const createEnquiry = async (req,res)=>{try{const {name,email,subject,message}=req.body;if(!name?.trim()||!email?.trim()||!subject?.trim()||!message?.trim())return res.status(400).json({success:false,message:"Name, email, subject and message are required."});const enquiry=await ContactEnquiry.create({name,email,subject,message});
const admins=await User.find({role:"admin"}).select("_id").lean();
await Promise.all(admins.map(admin=>createNotification({
  recipient:admin._id,type:"contact",title:"New contact enquiry",
  message:`${name.trim()} submitted: ${subject.trim()}.`,link:"AdminMenu"
})));
res.status(201).json({success:true,message:"Your enquiry has been submitted successfully.",enquiry});}catch(e){console.error(e);res.status(500).json({success:false,message:"Unable to submit enquiry."})}};
export const listEnquiries = async (req,res)=>{try{const enquiries=await ContactEnquiry.find().sort({createdAt:-1});res.json({success:true,enquiries});}catch(e){res.status(500).json({success:false,message:"Unable to load enquiries."})}};
export const updateEnquiry = async (req,res)=>{try{const enquiry=await ContactEnquiry.findByIdAndUpdate(req.params.id,{status:req.body.status},{new:true});if(!enquiry)return res.status(404).json({success:false,message:"Enquiry not found."});res.json({success:true,message:"Enquiry status updated successfully.",enquiry});}catch(e){res.status(500).json({success:false,message:"Unable to update enquiry."})}};
