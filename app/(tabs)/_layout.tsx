import { Tabs } from "expo-router";
import { Video, Settings } from "lucide-react-native";
import React from "react";
import { Platform, View, StyleSheet } from 'react-native';
import { useTheme } from '@/hooks/use-theme';

export default function TabLayout() {
  const { theme } = useTheme();
  
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.tabBarActive,
        tabBarInactiveTintColor: theme.colors.tabBarInactive,
        tabBarHideOnKeyboard: false,
        tabBarVisibilityAnimationConfig: {
          show: { animation: 'timing', config: { duration: 0 } },
          hide: { animation: 'timing', config: { duration: 0 } },
        },
        tabBarBackground: () => (
          <View testID="tabBarBackground" style={[
            styles.tabBarBackground,
            { backgroundColor: theme.colors.tabBarBackground }
          ]} />
        ),
        tabBarStyle: {
          backgroundColor: theme.colors.tabBarBackground,
          // Complete border removal
          borderTopWidth: 0,
          borderTopColor: 'transparent',
          borderBottomWidth: 0,
          borderBottomColor: 'transparent',
          borderLeftWidth: 0,
          borderLeftColor: 'transparent',
          borderRightWidth: 0,
          borderRightColor: 'transparent',
          borderWidth: 0,
          borderColor: 'transparent',
          // Complete shadow removal
          elevation: 0,
          shadowOpacity: 0,
          shadowOffset: { width: 0, height: 0 },
          shadowRadius: 0,
          shadowColor: 'transparent',
          // Layout properties
          overflow: 'hidden',
          position: 'absolute' as const,
          bottom: 0,
          left: 0,
          right: 0,
          // iOS specific fixes for white line/glow removal
          ...(Platform.OS === 'ios' && {
            // Ensure all shadow properties are disabled
            shadowOpacity: 0,
            shadowRadius: 0,
            shadowOffset: { width: 0, height: 0 },
            shadowColor: 'transparent',
            // Ensure all border properties are disabled
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            borderStyle: 'solid' as const,
            // Remove any iOS-specific visual effects
            backdropFilter: 'none' as const,
            WebkitBackdropFilter: 'none',
            // Remove separator lines
            separatorColor: 'transparent',
            // Remove blur effects that might cause glow
            blurType: 'none' as const,
            // Additional iOS-specific properties to prevent white line
            borderCurve: 'continuous' as const,
            // Ensure no translucency effects
            translucent: false,
            // Remove any potential backdrop blur
            backgroundBlurType: 'none' as const,
          }),
          // Android specific fixes
          ...(Platform.OS === 'android' && {
            elevation: 0,
            borderTopWidth: 0,
            borderTopColor: 'transparent',
            // Remove any material design elevation effects
            shadowColor: 'transparent',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0,
            shadowRadius: 0,
          }),
          // Web specific fixes
          ...(Platform.OS === 'web' && {
            // Remove all CSS box shadows
            boxShadow: 'none' as const,
            WebkitBoxShadow: 'none',
            MozBoxShadow: 'none',
            // Remove all borders
            border: 'none' as const,
            borderTop: 'none' as const,
            borderBottom: 'none' as const,
            borderLeft: 'none' as const,
            borderRight: 'none' as const,
            // Remove outline
            outline: 'none' as const,
            // Remove any CSS filters that might cause glow
            filter: 'none' as const,
            WebkitFilter: 'none',
            // Remove backdrop filters
            backdropFilter: 'none' as const,
            WebkitBackdropFilter: 'none',
            // Ensure no CSS transitions that might cause visual artifacts
            transition: 'none' as const,
            WebkitTransition: 'none',
          }),
        },
        headerStyle: {
          backgroundColor: theme.colors.headerBackground,
        },
        headerTintColor: theme.colors.headerText,
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Controller",
          tabBarIcon: ({ color }) => <Video color={color as string} size={24} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ color }) => <Settings color={color as string} size={24} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBarBackground: {
    flex: 1,
    // Extend above to completely cover any potential white line or glow
    marginTop: Platform.OS === 'ios' ? -5 : -2,
    paddingTop: Platform.OS === 'ios' ? 5 : 2,
    // Ensure absolutely no borders, shadows, or visual effects
    borderWidth: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderRightWidth: 0,
    borderColor: 'transparent',
    borderTopColor: 'transparent',
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    shadowColor: 'transparent',
    elevation: 0,
    // Platform-specific fixes
    ...(Platform.OS === 'ios' && {
      // Additional iOS properties to prevent any visual artifacts
      backdropFilter: 'none' as const,
      WebkitBackdropFilter: 'none',
    }),
    ...(Platform.OS === 'web' && {
      // Additional web properties to prevent any visual artifacts
      boxShadow: 'none' as const,
      WebkitBoxShadow: 'none',
      MozBoxShadow: 'none',
      filter: 'none' as const,
      WebkitFilter: 'none',
      backdropFilter: 'none' as const,
      WebkitBackdropFilter: 'none',
    }),
  },
});