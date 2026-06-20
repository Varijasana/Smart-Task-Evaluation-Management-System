const mongoose = require("mongoose");

const MediaSchema = new mongoose.Schema({
	uploadedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required: true
	},
	taskId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Task",
		default: null
	},
	fileName: {
		type: String,
		required: true
	},
	fileType: {
		type: String,
		enum: ["image", "video", "document"],
		required: true
	},
	filePath: {
		type: String,
		required: true
	},
	description: {
		type: String,
		default: ""
	},
	status: {
		type: String,
		enum: ["pending", "approved", "rejected"],
		default: "pending"
	},
	verifiedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		default: null
	},
	verificationDate: {
		type: Date,
		default: null
	},
	feedback: {
		type: String,
		default: ""
	}
}, { timestamps: true });

module.exports = mongoose.model("Media", MediaSchema);