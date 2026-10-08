import React, { useState, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  BackHandler,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { WebView } from 'react-native-webview';
import { SafeAreaView, SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

const APP_URL = 'https://volleyballstats-virid.vercel.app/';

const COLORS = {
  bg: '#0a0f1e',
  purple: '#4a1d8a',
  blue: '#5ab3d0',
  white: '#ffffff',
  error: '#1a1a2e',
};

export default function App() {
  const webviewRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [canGoBack, setCanGoBack] = useState(false);

  // Android back button navigates inside the site
  const onAndroidBack = useCallback(() => {
    if (canGoBack && webviewRef.current) {
      webviewRef.current.goBack();
      return true;
    }
    return false;
  }, [canGoBack]);

  React.useEffect(() => {
    if (Platform.OS === 'android') {
      const sub = BackHandler.addEventListener('hardwareBackPress', onAndroidBack);
      return () => sub.remove();
    }
  }, [onAndroidBack]);

  function reload() {
    setOffline(false);
    setLoading(true);
    webviewRef.current?.reload();
  }

  // Open external links in the system browser
  const onShouldStartLoadWithRequest = useCallback((req) => {
    const isInternal =
      req.url === APP_URL ||
      req.url.startsWith(APP_URL) ||
      req.url.startsWith('about:') ||
      req.url.startsWith('blob:');
    return isInternal;
  }, []);

  const Webview = (
    <WebView
      ref={webviewRef}
      source={{ uri: APP_URL }}
      style={{ flex: 1, backgroundColor: COLORS.bg }}
      // Behaviour
      bounces={false}
      overScrollMode="never"
      contentInsetAdjustmentBehavior="never"
      textZoom={100}
      // Storage & cookies so logins persist
      domStorageEnabled
      sharedCookiesEnabled
      cacheEnabled
      // Navigation
      onNavigationStateChange={(s) => setCanGoBack(s.canGoBack)}
      onShouldStartLoadWithRequest={onShouldStartLoadWithRequest}
      // Loading
      onLoadStart={() => setLoading(true)}
      onLoadEnd={() => setLoading(false)}
      onLoad={() => { setLoading(false); setOffline(false); }}
      onError={() => setOffline(true)}
      onHttpError={(e) => { if (e.nativeEvent.statusCode >= 500) setOffline(true); }}
      // Recover if iOS kills the web process
      onContentProcessDidTerminate={() => webviewRef.current?.reload()}
      onRenderProcessGone={() => webviewRef.current?.reload()}
    />
  );

  if (offline) {
    return (
      <SafeAreaProvider>
        <SafeAreaView style={[styles.center, { backgroundColor: COLORS.bg }]}>
          <StatusBar style="light" />
          <Text style={styles.offlineEmoji}>📡</Text>
          <Text style={styles.offlineTitle}>Can't reach Court Scope</Text>
          <Text style={styles.offlineSub}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={reload}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      {Platform.OS === 'ios' ? (
        // iOS: WebView fills the entire screen; the site uses env(safe-area-inset-*)
        <View style={[styles.fill, { backgroundColor: COLORS.bg }]}>
          {Webview}
          {loading && (
            <View style={[styles.splash, StyleSheet.absoluteFill]}>
              <Text style={styles.splashTitle}>Court Scope</Text>
              <ActivityIndicator color={COLORS.blue} size="large" style={{ marginTop: 24 }} />
            </View>
          )}
        </View>
      ) : (
        // Android: sit inside SafeAreaView
        <SafeAreaView style={[styles.fill, { backgroundColor: COLORS.bg }]}>
          {Webview}
          {loading && (
            <View style={[styles.splash, StyleSheet.absoluteFill]}>
              <Text style={styles.splashTitle}>Court Scope</Text>
              <ActivityIndicator color={COLORS.blue} size="large" style={{ marginTop: 24 }} />
            </View>
          )}
        </SafeAreaView>
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  splash: {
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  splashTitle: {
    color: COLORS.white,
    fontSize: 32,
    fontWeight: '800',
    letterSpacing: 1,
  },
  offlineEmoji: { fontSize: 48, marginBottom: 16 },
  offlineTitle: { color: COLORS.white, fontSize: 20, fontWeight: '700', textAlign: 'center' },
  offlineSub: { color: '#888', fontSize: 14, textAlign: 'center', marginTop: 8 },
  retryBtn: {
    marginTop: 28,
    backgroundColor: COLORS.purple,
    paddingHorizontal: 32,
    paddingVertical: 14,
    borderRadius: 16,
  },
  retryText: { color: COLORS.white, fontWeight: '700', fontSize: 16 },
});
