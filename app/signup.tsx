import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors } from '../constants/Colors';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/database';

export default function SignupScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('customer');
  const [vehicleModel, setVehicleModel] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { signUp } = useAuth();

  const handleSignup = async () => {
    if (!email || !password || !name || !phone) {
      setError('Please fill in all required fields');
      return;
    }

    if (role === 'driver' && (!vehicleModel || !registrationNumber)) {
      setError('Please fill in vehicle details');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const driverDetails =
        role === 'driver'
          ? {
              vehicleModel,
              registrationNumber,
              licenseUrl: 'https://example.com/license.jpg',
            }
          : undefined;

      await signUp(email, password, name, phone, role, driverDetails);

      Alert.alert('Success', 'Account created successfully!', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') }
      ]);
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.header}>
          <Text style={styles.title}>Create Account</Text>
          <Text style={styles.subtitle}>Join Cabby today</Text>
        </View>

        <View style={styles.roleSelector}>
          <TouchableOpacity
            style={[
              styles.roleButton,
              role === 'customer' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('customer')}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'customer' && styles.roleButtonTextActive,
              ]}
            >
              Customer
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.roleButton,
              role === 'driver' && styles.roleButtonActive,
            ]}
            onPress={() => setRole('driver')}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.roleButtonText,
                role === 'driver' && styles.roleButtonTextActive,
              ]}
            >
              Driver
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.form}>
          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your full name"
              placeholderTextColor={Colors.textSecondary}
              value={name}
              onChangeText={setName}
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your email"
              placeholderTextColor={Colors.textSecondary}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your phone number"
              placeholderTextColor={Colors.textSecondary}
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
              editable={!isLoading}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="Create a password"
              placeholderTextColor={Colors.textSecondary}
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
            />
          </View>

          {role === 'driver' && (
            <>
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Vehicle Model</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Toyota Camry 2022"
                  placeholderTextColor={Colors.textSecondary}
                  value={vehicleModel}
                  onChangeText={setVehicleModel}
                  editable={!isLoading}
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.label}>Registration Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., ABC-1234"
                  placeholderTextColor={Colors.textSecondary}
                  value={registrationNumber}
                  onChangeText={setRegistrationNumber}
                  autoCapitalize="characters"
                  editable={!isLoading}
                />
              </View>

              <View style={styles.licenseNote}>
                <Text style={styles.licenseNoteText}>
                  License verification will be required after registration
                </Text>
              </View>
            </>
          )}

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSignup}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color={Colors.white} />
            ) : (
              <Text style={styles.buttonText}>Create Account</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.loginLink}
            onPress={() => router.back()}
            disabled={isLoading}
          >
            <Text style={styles.loginLinkText}>
              Already have an account? <Text style={styles.loginLinkTextBold}>Sign In</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  scrollContent: {
    flexGrow: 1,
    padding: 24,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  roleSelector: {
    flexDirection: 'row',
    marginBottom: 24,
    gap: 12,
  },
  roleButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.white,
  },
  roleButtonActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  roleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
  },
  roleButtonTextActive: {
    color: Colors.white,
  },
  form: {
    flex: 1,
  },
  inputContainer: {
    marginBottom: 16,
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
    backgroundColor: Colors.white,
  },
  licenseNote: {
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  licenseNoteText: {
    fontSize: 12,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  button: {
    height: 56,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.white,
  },
  errorText: {
    fontSize: 14,
    color: Colors.error,
    marginBottom: 16,
    textAlign: 'center',
  },
  loginLink: {
    alignItems: 'center',
    marginTop: 8,
  },
  loginLinkText: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
  loginLinkTextBold: {
    color: Colors.primary,
    fontWeight: '600',
  },
});
