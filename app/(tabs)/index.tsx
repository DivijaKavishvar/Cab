import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Modal,
  Alert,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '../../constants/Colors';
import { useAuth } from '../../context/AuthContext';
import { Minus, Plus, User, CreditCard, HelpCircle, MapPin, Navigation, Car, Bike, Truck } from 'lucide-react-native';
import MapCard from "../components/MapCard";
import * as Location from "expo-location";
import polyline from "polyline";


type VehicleType = 'car' | 'auto' | 'bike' | 'tempo';

interface VehicleOption {
  id: VehicleType;
  name: string;
  icon: any;
  capacity: string;
  baseFare: number;
  perKm: number;
  eta: string;
}

const vehicleOptions: VehicleOption[] = [
  {
    id: 'bike',
    name: 'Bike',
    icon: Bike,
    capacity: '1 person',
    baseFare: 10,
    perKm: 2,
    eta: '2 mins',
  },
  {
    id: 'auto',
    name: 'Auto',
    icon: Truck,
    capacity: '3 people',
    baseFare: 15,
    perKm: 3,
    eta: '3 mins',
  },
  {
    id: 'car',
    name: 'Car',
    icon: Car,
    capacity: '4 people',
    baseFare: 25,
    perKm: 5,
    eta: '5 mins',
  },
  {
    id: 'tempo',
    name: 'Tempo',
    icon: Truck,
    capacity: '6 people',
    baseFare: 40,
    perKm: 7,
    eta: '7 mins',
  },
];

export default function MapScreen() {
  const { user } = useAuth();
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropLocation, setDropLocation] = useState('');
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleType | null>(null);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [showVehicleSelection, setShowVehicleSelection] = useState(false);
  const [showDriverModal, setShowDriverModal] = useState(false);
  const [showRideRequests, setShowRideRequests] = useState(false);
  const [estimatedDistance] = useState(5);
  const [detectingPickup, setDetectingPickup] = useState(false);
  const [pickupCoords, setPickupCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [dropCoords, setDropCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[] | null>(null);
  const [etaText, setEtaText] = useState<string | null>(null);
  const [distanceText, setDistanceText] = useState<string | null>(null);


  const calculateFare = (vehicle: VehicleOption) => {
    return vehicle.baseFare + (vehicle.perKm * estimatedDistance);
  };

  const handleContinueToVehicleSelection = async () => {
    if (!pickupLocation || !dropLocation) {
      Alert.alert('Error', 'Please enter pickup and drop locations');
      return;
    }

  // If we don’t have dest coords yet, geocode the drop text
    let dest = dropCoords;
    if (!dest) {
      const g = await geocodeAddress(dropLocation);
      if (!g) {
        Alert.alert('Location', 'Please enter a valid drop address.');
        return;
      }
      dest = { lat: g.lat, lng: g.lng };
      setDropCoords(dest);
      setDropLocation(g.formatted); // normalize text (optional)
    }

  // If we also have pickup coords, build the route on the map
    if (pickupCoords && dest) {
      await buildRoute(pickupCoords, dest);
    } else if (!pickupCoords) {
      Alert.alert('Tip', "Tap 'Use current' for Pickup first.");
    }

    setShowBookingModal(false);
    setShowVehicleSelection(true);
  };


  const handleBookRide = (vehicle: VehicleOption) => {
    setSelectedVehicle(vehicle.id);
    setShowVehicleSelection(false);
    setTimeout(() => {
      setShowDriverModal(true);
    }, 500);
  };

  const mockRideRequests = [
    {
      id: '1',
      customerName: 'John Doe',
      pickup: '123 Main St',
      drop: '456 Oak Ave',
      fare: 18,
    },
    {
      id: '2',
      customerName: 'Jane Smith',
      pickup: '789 Pine Rd',
      drop: '321 Elm St',
      fare: 22,
    },
  ];
  const useCurrentPickup = async () => {
    try {
      setDetectingPickup(true);
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Location permission", "Please enable location permission to auto-fill pickup.");
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setPickupCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });

      const results = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });

      const a = results?.[0] as any; // or type it properly if you prefer
      const formatted =
        [a?.name, a?.street, a?.subLocality, a?.locality, a?.postalCode]
          .filter(Boolean)
          .join(", ") ||
        `${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`;

      setPickupLocation(formatted);
    } catch (e) {
      Alert.alert("Error", "Could not fetch current location.");
    } finally {
      setDetectingPickup(false);
    }
  }; 

    const GOOGLE_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY ?? '';
      
    const buildRoute = async (
      origin: { lat: number; lng: number },
      dest: { lat: number; lng: number }
    ) => {
      if (!GOOGLE_KEY) {
        Alert.alert("Config error", "Missing EXPO_PUBLIC_GOOGLE_MAPS_KEY.");
      return;
    }

    try {
      // reset previous route/ETA
      setRouteCoords(null);
      setEtaText(null);
      setDistanceText(null);

      const url =
        `https://maps.googleapis.com/maps/api/directions/json?` +
        `origin=${origin.lat},${origin.lng}` +
        `&destination=${dest.lat},${dest.lng}` +
        `&mode=driving&region=in&key=${GOOGLE_KEY}`;

      const res = await fetch(url);
      const json = await res.json();

      if (json.status !== "OK" || !json.routes?.length) {
        console.log("Directions error:", json.status, json.error_message);
        Alert.alert("Route error", json.error_message ?? "Could not find a driving route.");
        return;
      }

      const leg = json.routes[0].legs?.[0];
      setEtaText(leg?.duration?.text ?? null);
      setDistanceText(leg?.distance?.text ?? null);

      const points: string = json.routes[0].overview_polyline.points;
      const decoded = (polyline.decode(points) as [number, number][])
        .map(([lat, lng]) => ({ latitude: lat, longitude: lng }));

      setRouteCoords(decoded);
    } catch (e) {
      console.error("Directions fetch failed:", e);
      Alert.alert("Route error", "Failed to fetch route.");
    }
  };
  const geocodeAddress = async (address: string) => {
    try {
      const url =
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_KEY}`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.status !== "OK" || !json.results?.length) return null;

      const best = json.results[0];
      const { lat, lng } = best.geometry.location;
      return { lat, lng, formatted: best.formatted_address as string };
    } catch {
      return null;
    }
  };


  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="dark" />

      <View style={styles.mapPlaceholder}>
        <View style={{ flex: 1, width: '100%', borderRadius: 16, overflow: 'hidden' }}>
           <MapCard
              height={400}
              origin={pickupCoords ? { latitude: pickupCoords.lat, longitude: pickupCoords.lng } : null}
              destination={dropCoords ? { latitude: dropCoords.lat, longitude: dropCoords.lng } : null}
              routeCoords={routeCoords}
            />
        </View>


        {user?.role === 'driver' && (
          <TouchableOpacity
            style={styles.viewRequestsButton}
            onPress={() => setShowRideRequests(!showRideRequests)}
          >
            <Text style={styles.viewRequestsButtonText}>
              {showRideRequests ? 'Hide Ride Requests' : 'View Ride Requests'}
            </Text>
          </TouchableOpacity>
        )}

        {user?.role === 'customer' && (
          <TouchableOpacity
            style={styles.setLocationButton}
            onPress={() => setShowBookingModal(true)}
          >
            <Text style={styles.setLocationButtonText}>Book a Ride</Text>
          </TouchableOpacity>
        )}
      </View>

      {user?.role === 'driver' && showRideRequests && (
        <ScrollView style={styles.rideRequestsContainer}>
          <Text style={styles.rideRequestsTitle}>Ride Requests</Text>
          {mockRideRequests.map((request) => (
            <View key={request.id} style={styles.rideRequestCard}>
              <View style={styles.rideRequestHeader}>
                <Text style={styles.rideRequestCustomer}>{request.customerName}</Text>
                <Text style={styles.rideRequestFare}>${request.fare}</Text>
              </View>
              <View style={styles.rideRequestLocation}>
                <Navigation size={16} color={Colors.primary} />
                <Text style={styles.rideRequestLocationText}>{request.pickup}</Text>
              </View>
              <View style={styles.rideRequestLocation}>
                <MapPin size={16} color={Colors.error} />
                <Text style={styles.rideRequestLocationText}>{request.drop}</Text>
              </View>
              <View style={styles.rideRequestActions}>
                <TouchableOpacity
                  style={styles.declineButton}
                  onPress={() => Alert.alert('Ride Declined')}
                >
                  <Text style={styles.declineButtonText}>Decline</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.acceptButton}
                  onPress={() => Alert.alert('Success', 'Ride Accepted!')}
                >
                  <Text style={styles.acceptButtonText}>Accept</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </ScrollView>
      )}

      {user?.role === 'customer' && (
        <View style={styles.bottomNav}>
          <TouchableOpacity
            style={styles.navBox}
            onPress={() => Alert.alert('Payment', 'Payment options coming soon')}
          >
            <View style={styles.navIcon}>
              <CreditCard size={28} color={Colors.primary} />
            </View>
            <Text style={styles.navLabel}>Payments</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.navBox}
            onPress={() => Alert.alert('Help', 'Need assistance? Contact support at help@cabby.com')}
          >
            <View style={styles.navIcon}>
              <HelpCircle size={28} color={Colors.primary} />
            </View>
            <Text style={styles.navLabel}>Help</Text>
          </TouchableOpacity>
        </View>
      )}

      <Modal
        visible={showBookingModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowBookingModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Where to?</Text>

            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <Navigation size={20} color={Colors.primary} />
              </View>

              <TextInput
                style={styles.inputWithIcon}
                placeholder="Pickup location"
                placeholderTextColor={Colors.textSecondary}
                value={pickupLocation}
                onChangeText={setPickupLocation}
              />

              <TouchableOpacity
                onPress={useCurrentPickup}
                disabled={detectingPickup}
                style={styles.currentBtn}
              >
              <Text style={styles.currentBtnText}>
                {detectingPickup ? "Detecting…" : "Use current"}
              </Text>
            </TouchableOpacity>
          </View>


            <View style={styles.inputContainer}>
              <View style={styles.inputIcon}>
                <MapPin size={20} color={Colors.error} />
              </View>
              <TextInput
                style={styles.inputWithIcon}
                placeholder="Drop location"
                placeholderTextColor={Colors.textSecondary}
                value={dropLocation}
                onChangeText={setDropLocation}
              />
            </View>



            <TouchableOpacity style={styles.bookButton} onPress={handleContinueToVehicleSelection}>
              <Text style={styles.bookButtonText}>Continue</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowBookingModal(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showVehicleSelection}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowVehicleSelection(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, styles.vehicleModalContent]}>
            <Text style={styles.modalTitle}>Choose a ride</Text>
            <Text style={styles.modalSubtitle}>Estimated distance: {estimatedDistance} km</Text>

            <ScrollView style={styles.vehicleList} showsVerticalScrollIndicator={false}>
              {vehicleOptions.map((vehicle) => {
                const Icon = vehicle.icon;
                const fare = calculateFare(vehicle);

                return (
                  <TouchableOpacity
                    key={vehicle.id}
                    style={styles.vehicleCard}
                    onPress={() => handleBookRide(vehicle)}
                  >
                    <View style={styles.vehicleIconContainer}>
                      <Icon size={32} color={Colors.primary} />
                    </View>
                    <View style={styles.vehicleInfo}>
                      <Text style={styles.vehicleName}>{vehicle.name}</Text>
                      <Text style={styles.vehicleCapacity}>{vehicle.capacity}</Text>
                      <Text style={styles.vehicleEta}>{vehicle.eta} away</Text>
                    </View>
                    <View style={styles.vehicleFare}>
                      <Text style={styles.vehicleFareAmount}>${fare}</Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => {
                setShowVehicleSelection(false);
                setShowBookingModal(true);
              }}
            >
              <Text style={styles.cancelButtonText}>Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        visible={showDriverModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDriverModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Driver Assigned!</Text>
            <View style={styles.driverInfo}>
              <View style={styles.driverAvatar}>
                <User size={40} color={Colors.primary} />
              </View>
              <Text style={styles.driverName}>Jane Driver</Text>
              <Text style={styles.driverVehicle}>Toyota Camry 2022</Text>
              <Text style={styles.driverPlate}>ABC-1234</Text>
            </View>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => {
                setShowDriverModal(false);
                Alert.alert('Success', 'Your ride is on the way!');
              }}
            >
              <Text style={styles.bookButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  mapPlaceholder: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    margin: 16,
    borderRadius: 16,
  },
  mapContent: {
    alignItems: 'center',
  },
  mapText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
  },
  mapSubtext: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 8,
  },
  setLocationButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  setLocationButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  viewRequestsButton: {
    position: 'absolute',
    bottom: 20,
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  viewRequestsButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '700',
  },
  rideRequestsContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    maxHeight: 400,
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 16,
  },
  rideRequestsTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  rideRequestCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  rideRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  rideRequestCustomer: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  rideRequestFare: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  rideRequestLocation: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  rideRequestLocationText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  rideRequestActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
  },
  declineButton: {
    flex: 1,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  declineButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
  acceptButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center',
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomNav: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.white,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 12,
  },
  navBox: {
    flex: 1,
    aspectRatio: 1,
    maxWidth: 84,
    backgroundColor: Colors.white,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  navIcon: {
    marginBottom: 4,
  },
  navLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 24,
    textAlign: 'center',
  },
  inputContainer: {
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWithIcon: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    height: 56,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
  },
  fareContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    alignItems: 'center',
  },
  fareLabel: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  fareAmount: {
    fontSize: 32,
    fontWeight: '700',
    color: Colors.primary,
  },
  bookButton: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  bookButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  cancelButton: {
    height: 56,
    backgroundColor: Colors.white,
    borderWidth: 2,
    borderColor: Colors.border,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  driverInfo: {
    alignItems: 'center',
    marginBottom: 24,
  },
  driverAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  driverName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  driverVehicle: {
    fontSize: 16,
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  driverPlate: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: -16,
    marginBottom: 24,
  },
  vehicleModalContent: {
    maxHeight: '80%',
  },
  vehicleList: {
    maxHeight: 400,
    marginBottom: 16,
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  vehicleIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 12,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  vehicleInfo: {
    flex: 1,
  },
  vehicleName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  vehicleCapacity: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 2,
  },
  vehicleEta: {
    fontSize: 12,
    color: Colors.primary,
  },
  vehicleFare: {
    alignItems: 'flex-end',
  },
  vehicleFareAmount: {
    fontSize: 22,
    fontWeight: '700',
    color: Colors.text,
  },
  currentBtn: {
    marginLeft: 8,
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: Colors.background,
    borderRadius: 8,
  },
  currentBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: Colors.primary,
  },
});
