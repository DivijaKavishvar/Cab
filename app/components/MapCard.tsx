import { useEffect, useRef, useState } from "react";
import { Platform, StyleSheet, View, TouchableOpacity, Text } from "react-native";
import MapView, { Marker, PROVIDER_GOOGLE, Region } from "react-native-maps";
import * as Location from "expo-location";
import { Polyline } from "react-native-maps";

type Props = {
  height?: number;
  initial?: Region;
  origin?: { latitude: number; longitude: number } | null;
  destination?: { latitude: number; longitude: number } | null;
  routeCoords?: { latitude: number; longitude: number }[] | null;
};

const INDIA_DEFAULT: Region = {
  latitude: 23.0225,
  longitude: 72.5714,
  latitudeDelta: 0.05,
  longitudeDelta: 0.05,
};

export default function MapCard({
  height = 320,
  initial = INDIA_DEFAULT,
  origin,
  destination,
  routeCoords,
}: Props) {
  const [region, setRegion] = useState<Region>(initial);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const mapRef = useRef<MapView | null>(null);
  const locSub = useRef<Location.LocationSubscription | null>(null);
  useEffect(() => {
   let isMounted = true;

    const initLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        setHasPermission(status === "granted");
        if (status !== "granted") return;

        const pos = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });

        if (!isMounted) return;

        const r: Region = {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          latitudeDelta: 0.02,
          longitudeDelta: 0.02,
        };

        setRegion(r);
        mapRef.current?.animateToRegion(r, 600);

        // Start watching location updates
        locSub.current = await Location.watchPositionAsync(
          { accuracy: Location.Accuracy.Balanced, timeInterval: 3000, distanceInterval: 5 },
          (loc) => {
            if (!isMounted) return;
            const next: Region = {
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
              latitudeDelta: 0.02,
             longitudeDelta: 0.02,
            };
            setRegion(next);
            mapRef.current?.animateToRegion(next, 500);
          }
        );
      } catch (e) {
        console.error("❌ Location Error:", e);
      }
    };

    initLocation();

    return () => {
      isMounted = false;
      locSub.current?.remove();
    };
  }, []);


  return (
    <View style={[styles.card, { height }]}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        provider={Platform.OS === "ios" ? PROVIDER_GOOGLE : undefined}
        showsUserLocation
        followsUserLocation
        initialRegion={region}
        onMapReady={() => {
          if (routeCoords && routeCoords.length > 1 && mapRef.current) {
            mapRef.current.fitToCoordinates(routeCoords, {
              edgePadding: { top: 60, right: 60, bottom: 60, left: 60 },
              animated: true,
            });
          }
        }}
      >
        {origin && <Marker coordinate={origin} />}
        {destination && <Marker coordinate={destination} />}
        {routeCoords && routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeWidth={5} strokeColor="#1b73e8" />
        )}
      </MapView>

      <TouchableOpacity
        onPress={() => mapRef.current?.animateToRegion(region, 400)}
        style={styles.recenter}
      >
        <Text style={styles.recenterText}>Locate me</Text>
      </TouchableOpacity>

      {hasPermission === false && (
        <View style={styles.banner}>
          <Text style={styles.bannerText}>Location permission denied. Showing default map.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, overflow: "hidden", backgroundColor: "#f6f7fb" },
  recenter: {
    position: "absolute", right: 12, bottom: 12,
    backgroundColor: "white", paddingHorizontal: 12, paddingVertical: 8,
    borderRadius: 12, elevation: 3,
  },
  recenterText: { fontWeight: "600" },
  banner: {
    position: "absolute", top: 10, alignSelf: "center",
    backgroundColor: "rgba(0,0,0,0.7)", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8,
  },
  bannerText: { color: "white", fontSize: 12 },
});
