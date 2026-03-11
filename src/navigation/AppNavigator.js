import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Auth Screens
import SplashScreen from '../screens/SplashScreen';
import LoginScreen from '../screens/LoginScreen';
import SignUpScreen from '../screens/SignUpScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';

// Compliance Screens
import TermsOfServiceScreen from '../screens/TermsOfServiceScreen';
import PrivacyPolicyScreen from '../screens/PrivacyPolicyScreen';
import RiskDisclaimerScreen from '../screens/RiskDisclaimerScreen';

// Main App Screens
import HomeScreen from '../screens/HomeScreen';
import TradeScreen from '../screens/TradeScreen';
import HistoryScreen from '../screens/HistoryScreen';
import SettingsScreen from '../screens/SettingsScreen';

import { COLORS, SPACING, FONT_SIZES, BORDER_RADIUS } from '../constants/theme';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function TabIcon({ name, focused }) {
    const icons = {
        Home: { active: '🏠', inactive: '🏠' },
        Trade: { active: '📈', inactive: '📈' },
        History: { active: '📊', inactive: '📊' },
        Settings: { active: '⚙️', inactive: '⚙️' },
    };

    const icon = icons[name] || { active: '●', inactive: '○' };

    return (
        <View style={styles.tabIconContainer}>
            {focused && (
                <LinearGradient
                    colors={COLORS.gradientPrimary}
                    style={styles.activeBackground}
                />
            )}
            <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
                {focused ? icon.active : icon.inactive}
            </Text>
        </View>
    );
}

// Main Tab Navigator (authenticated users)
function MainTabNavigator() {
    return (
        <Tab.Navigator
            screenOptions={({ route }) => ({
                headerShown: false,
                tabBarShowLabel: true,
                tabBarStyle: styles.tabBar,
                tabBarActiveTintColor: COLORS.primary,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: styles.tabLabel,
                tabBarIcon: ({ focused }) => (
                    <TabIcon name={route.name} focused={focused} />
                ),
            })}
        >
            <Tab.Screen
                name="Home"
                component={HomeScreen}
                options={{ tabBarLabel: 'Início' }}
            />
            <Tab.Screen
                name="Trade"
                component={TradeScreen}
                options={{ tabBarLabel: 'Trade' }}
            />
            <Tab.Screen
                name="History"
                component={HistoryScreen}
                options={{ tabBarLabel: 'Histórico' }}
            />
            <Tab.Screen
                name="Settings"
                component={SettingsScreen}
                options={{ tabBarLabel: 'Config' }}
            />
        </Tab.Navigator>
    );
}

// Root Navigator (handles auth flow)
export default function AppNavigator() {
    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerShown: false,
                    animation: 'fade',
                }}
            >
                {/* Splash Screen */}
                <Stack.Screen
                    name="Splash"
                    component={SplashScreen}
                />

                {/* Auth Screens */}
                <Stack.Screen
                    name="Login"
                    component={LoginScreen}
                />
                <Stack.Screen
                    name="SignUp"
                    component={SignUpScreen}
                />
                <Stack.Screen
                    name="ForgotPassword"
                    component={ForgotPasswordScreen}
                />

                {/* Compliance Screens */}
                <Stack.Screen
                    name="TermsOfService"
                    component={TermsOfServiceScreen}
                />
                <Stack.Screen
                    name="PrivacyPolicy"
                    component={PrivacyPolicyScreen}
                />
                <Stack.Screen
                    name="RiskDisclaimer"
                    component={RiskDisclaimerScreen}
                />

                {/* Main App (Tab Navigator) */}
                <Stack.Screen
                    name="Main"
                    component={MainTabNavigator}
                />
            </Stack.Navigator>
        </NavigationContainer>
    );
}

const styles = StyleSheet.create({
    tabBar: {
        position: 'absolute',
        bottom: SPACING.md,
        left: SPACING.md,
        right: SPACING.md,
        height: 70,
        backgroundColor: COLORS.bgCard,
        borderRadius: BORDER_RADIUS.xl,
        borderTopWidth: 0,
        paddingBottom: SPACING.sm,
        paddingTop: SPACING.sm,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 20,
    },
    tabLabel: {
        fontSize: FONT_SIZES.xs,
        fontWeight: '600',
        marginTop: 2,
    },
    tabIconContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        width: 40,
        height: 40,
        borderRadius: BORDER_RADIUS.full,
        overflow: 'hidden',
    },
    activeBackground: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.2,
    },
    tabIcon: {
        fontSize: 22,
    },
    tabIconActive: {
        transform: [{ scale: 1.1 }],
    },
});
