import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Location from "expo-location";
import axios from "axios";
import { host } from "@/utils/apiRoutes";

const stations = () => {
  const [location, setLocation] = useState<any>();
  const [nearestStation, setNearestStation] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<any>();

  const requestLocationPermission = async () => {
    let { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") {
      setError("Permission to access location was denied");
      return null;
    }

    let currentLocation = await Location.getCurrentPositionAsync({});
    setLocation(currentLocation.coords);
    return currentLocation.coords;
  };

  const findNearestStation = async () => {
    setLoading(true);
    setError(null);
    try {
      const coords = await requestLocationPermission();
      if (coords) {
        const response = await axios.get(
          `${host}/api/stations/nearest-station`,
          {
            params: {
              latitude: coords.latitude,
              longitude: coords.longitude,
            },
          }
        );
        setNearestStation(response.data);
      }
    } catch (err: any) {
      setError(err.message);
      console.log("error,", err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <TouchableOpacity style={styles.findButton} onPress={findNearestStation}>
        <Text style={styles.buttonText}>Find Nearest Station</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#0000ff" />}

      {error && (
        <View style={styles.resultBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {nearestStation && (
        <View style={styles.resultBox}>
          <Text style={styles.stationName}>
            Nearest Station: {nearestStation.name}
          </Text>
          <Text>
            Coordinates: {nearestStation.location.coordinates[1]},
            {nearestStation.location.coordinates[0]}
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
  },
  findButton: {
    backgroundColor: "#007bff",
    padding: 15,
    borderRadius: 10,
    marginVertical: 20,
  },
  buttonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
  resultBox: {
    width: "100%",
    backgroundColor: "white",
    padding: 15,
    borderRadius: 10,
    marginTop: 15,
    elevation: 3,
  },
  stationName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
  },
  errorText: {
    color: "red",
    textAlign: "center",
  },
});

export default stations;
