import { Stack } from "expo-router";
import React from "react";

export default function TabLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackVisible: true,
        headerBackTitle: "Back",
        headerStyle: {
          backgroundColor: "#f5f5f5",
        },
        headerTintColor: "#333",
        headerTitleStyle: {
          fontWeight: "bold",
        },
      }}
    >
      <Stack.Screen
        name="stations"
        options={{
          title: "Stations",
          headerShown: true,
        }}
      />
    </Stack>
  );
}
