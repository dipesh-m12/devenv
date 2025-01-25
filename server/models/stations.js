import mongoose from "mongoose";

const stationSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, index: true },
    location: {
      type: { type: String, default: "Point" },
      coordinates: {
        type: [Number],
        required: true,
        index: "2dsphere",
      },
    },
  },
  {
    timestamps: true,
  }
);
const Stations = mongoose.model("Stations", stationSchema);

// In your station model file
stationSchema.index({ location: "2dsphere" });
Stations.createIndexes();

export default Stations;
