import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0e0e1a' },
          headerTintColor: '#f1f5f9',
          headerTitleStyle: { fontWeight: '800', fontSize: 17 },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: '#0e0e1a' },
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="results"
          options={{
            title: '📊 Analysis Results',
            headerStyle: { backgroundColor: '#070714' },
            headerTintColor: '#e2e8f0',
            headerTitleStyle: { fontWeight: '900', fontSize: 17 },
            headerShadowVisible: false,
            presentation: 'card',
          }}
        />
      </Stack>
    </>
  );
}
