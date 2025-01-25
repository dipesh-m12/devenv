import Stations from "../models/stations.js";
import express from "express";
const stationRouter = express.Router();

stationRouter.get("/nearest-station", async (req, res) => {
  const { latitude, longitude } = req.query;

  try {
    const nearestStation = await Stations.findOne({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates: [parseFloat(longitude), parseFloat(latitude)],
          },
          $maxDistance: 10000, // 10km radius
        },
      },
    });

    res.json(nearestStation);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
export default stationRouter;
