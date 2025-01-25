import Stations from "./models/stations.js";
import mongoose from "mongoose";

const stations = [
  { name: "CST", coordinates: [18.94215, 72.835652] },
  { name: "Masjid", coordinates: [18.951724, 72.838397] },
  { name: "Sandhurst Road", coordinates: [18.961169, 72.839535] },
  { name: "Dockyard Road", coordinates: [18.966397, 72.844261] },
  { name: "Reay Road", coordinates: [18.976397, 72.844313] },
  { name: "Cotton Green", coordinates: [18.985479, 72.842823] },
  { name: "Sewri", coordinates: [18.998699, 72.854712] },
  { name: "Vadala Road", coordinates: [19.015762, 72.85899] },
  { name: "GTB Nagar", coordinates: [19.037804, 72.864461] },
  { name: "Chunabhatti", coordinates: [19.051384, 72.869084] },
  { name: "Kurla", coordinates: [19.065298, 72.878657] },
  { name: "Tilak Nagar", coordinates: [19.065495, 72.89157] },
  { name: "Chembur", coordinates: [19.062314, 72.902195] },
  { name: "Govandi", coordinates: [19.056206, 72.914055] },
  { name: "Mankhurd", coordinates: [19.047843, 72.929271] },
  { name: "Vashi", coordinates: [19.062393, 72.998048] },
  { name: "Sanpada", coordinates: [19.066011, 73.008174] },
  { name: "Juinagar", coordinates: [19.0549, 73.018819] },
  { name: "Nerul", coordinates: [19.033239, 73.018734] },
  { name: "Seawoods Darave", coordinates: [19.021823, 73.019711] },
  { name: "Belapur", coordinates: [19.018873, 73.038348] },
  { name: "Kharghar", coordinates: [19.026, 73.0592] },
  { name: "Mansarovar", coordinates: [19.016449, 73.080491] },
  { name: "Khandeshwar", coordinates: [19.007241, 73.09517] },
  { name: "Panvel", coordinates: [18.9904, 73.1221] },
];

async function seedStations() {
  mongoose.connect(
    process.env.MONGO_URI ||
      "mongodb+srv://mavinash422:kSXwqEAWiVbUXkLa@cluster0.yefvx.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
  );

  await Stations.deleteMany({}); // Clear existing data
  const stationDocuments = stations.map((station) => ({
    name: station.name,
    location: {
      type: "Point",
      coordinates: [station.coordinates[1], station.coordinates[0]],
    },
  }));
  await Stations.insertMany(stationDocuments);
  console.log("Stations seeded successfully");
}

// Call this function to seed your database
seedStations();
