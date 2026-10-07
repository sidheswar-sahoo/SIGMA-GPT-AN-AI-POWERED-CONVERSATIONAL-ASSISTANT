import mongoose from "mongoose";

const documentSchema = new mongoose.Schema(
    {
        filename: {
            type: String,
            required: true
        },

        content: {
            type: String,
            required: true
        },

        embedding: {
            type: [Number],
            required: true
        },

        metadata: {
            type: Object,
            default: {}
        }
    },
    {
        timestamps: true
    }
);

const Document = mongoose.model("Document", documentSchema);

export default Document;