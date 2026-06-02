import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ImageBackground,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Animated,
  AccessibilityInfo,
  Modal,
  ActivityIndicator,
} from 'react-native';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {Controller, useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {Button, Chip, HelperText, Surface, TextInput, useTheme} from 'react-native-paper';
import {BYPASS_LOGIN, USE_FAKE_API, getBypassLoginUsername} from '../config/env';
import {login as loginRequest, type SessionUser} from '../services/api';
import {notifyError, notifySuccess} from '../utils/notify';
import {glass} from '../theme/glassStyles';

const backgroundImage = require('../../LDABackground.jpg');
const logoImage = require('../../LDA-logo.png');

const loginSchema = z.object({
  username: z.string().trim().min(1, {message: 'Enter your username'}),
  password: z.string().min(1, {message: 'Enter your password'}),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const INPUT_RADIUS = 14;
const BUTTON_RADIUS = 14;
const CARD_RADIUS = 20;

/** Avoid `Animated` native timers firing after Jest tears down the tree. */
const SKIP_LOGIN_ANIMATIONS =
  (globalThis as {process?: {env?: {NODE_ENV?: string}}})?.process?.env?.NODE_ENV === 'test';

interface LoginScreenProps {
  onLogin: (user: SessionUser) => void;
}

export default function LoginScreen({onLogin}: LoginScreenProps) {
  const theme = useTheme();
  const inputTheme = useMemo(
    () => ({
      ...theme,
      roundness: INPUT_RADIUS,
    }),
    [theme],
  );
  const insets = useSafeAreaInsets();
  const [secure, setSecure] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const announceRef = useRef('');

  const headerOpacity = useRef(new Animated.Value(0)).current;
  const headerTranslate = useRef(new Animated.Value(20)).current;
  const logoScale = useRef(new Animated.Value(0.88)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslate = useRef(new Animated.Value(28)).current;

  const {
    control,
    handleSubmit,
    formState: {errors},
    setError,
    clearErrors,
    watch,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: BYPASS_LOGIN ? getBypassLoginUsername() : '',
      password: '',
    },
    mode: 'onSubmit',
  });

  const rootError = errors.root?.message;

  useEffect(() => {
    if (SKIP_LOGIN_ANIMATIONS) {
      headerOpacity.setValue(1);
      headerTranslate.setValue(0);
      logoScale.setValue(1);
      cardOpacity.setValue(1);
      cardTranslate.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(headerOpacity, {
        toValue: 1,
        duration: 520,
        useNativeDriver: true,
      }),
      Animated.timing(headerTranslate, {
        toValue: 0,
        duration: 480,
        useNativeDriver: true,
      }),
      Animated.spring(logoScale, {
        toValue: 1,
        friction: 7,
        tension: 68,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.sequence([
      Animated.delay(120),
      Animated.parallel([
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 420,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslate, {
          toValue: 0,
          duration: 400,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [headerOpacity, headerTranslate, logoScale, cardOpacity, cardTranslate]);

  useEffect(() => {
    if (rootError && rootError !== announceRef.current) {
      announceRef.current = rootError;
      AccessibilityInfo.announceForAccessibility?.(rootError);
    }
  }, [rootError]);

  useEffect(() => {
    if (submitting) {
      AccessibilityInfo.announceForAccessibility?.('Logging in, please wait.');
    }
  }, [submitting]);

  const bypassUsername = getBypassLoginUsername();

  const onValidSubmit = async ({username, password}: LoginFormValues) => {
    clearErrors('root');
    setSubmitting(true);
    try {
      const user = await loginRequest(username.trim(), password);
      notifySuccess(`Welcome, ${user.name || 'Officer'}.`);
      onLogin(user);
    } catch (err) {
      const msg = (err as Error)?.message || 'Login failed';
      notifyError(msg);
      setError('root', {type: 'server', message: msg});
    } finally {
      setSubmitting(false);
    }
  };

  const usernameValue = watch('username');
  const passwordValue = watch('password');
  const canSubmit = String(usernameValue || '').trim().length > 0 && String(passwordValue || '').length > 0;

  return (
    <View style={styles.root} accessibilityLabel="Login screen">
      <Modal visible={submitting} transparent animationType="fade" statusBarTranslucent accessibilityViewIsModal>
        <View style={styles.loginOverlay} accessibilityLabel="Logging in, please wait">
          <View style={styles.loginOverlayCard}>
            <ActivityIndicator size="large" color="#003366" />
            <Text style={styles.loginOverlayTitle}>Logging in</Text>
            <Text style={styles.loginOverlaySubtitle}>Please wait...</Text>
          </View>
        </View>
      </Modal>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      <ImageBackground
        source={backgroundImage}
        style={styles.background}
        imageStyle={styles.backgroundImage}
        accessibilityIgnoresInvertColors>
        <View
          style={styles.scrim}
          pointerEvents="none"
          importantForAccessibility="no-hide-descendants"
          accessibilityElementsHidden
        />
        <KeyboardAvoidingView
          style={styles.flex}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? insets.top + 12 : 0}>
          <ScrollView
            contentContainerStyle={[
              styles.scrollContent,
              {paddingTop: Math.max(insets.top, 12) + 8, paddingBottom: Math.max(insets.bottom, 16) + 24},
            ]}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            accessibilityRole="none">
            <Animated.View
              style={[
                styles.header,
                {
                  opacity: headerOpacity,
                  transform: [{translateY: headerTranslate}],
                },
              ]}
              accessible={false}
              importantForAccessibility="no-hide-descendants">
              <Animated.View style={{transform: [{scale: logoScale}]}} accessible={false}>
                <Image
                  source={logoImage}
                  style={styles.logo}
                  resizeMode="contain"
                  accessibilityLabel="L D A logo"
                  accessibilityIgnoresInvertColors
                />
              </Animated.View>
              <Text style={styles.title} accessibilityRole="header">
                LDA DFPS
              </Text>
              <Text style={styles.subtitle}>Site Visit Module</Text>
            </Animated.View>

            <Animated.View
              style={{
                opacity: cardOpacity,
                transform: [{translateY: cardTranslate}],
              }}
              accessibilityRole="none">
              <Surface
                style={styles.card}
                elevation={4}
                accessible
                accessibilityRole="none"
                accessibilityLabel="Sign in form">
                {USE_FAKE_API ? (
                  <Chip
                    icon="flask-outline"
                    mode="flat"
                    compact
                    style={styles.testChip}
                    textStyle={styles.testChipText}
                    accessibilityLabel="Test mode is on. The real API is not used.">
                    Test mode - any username and password work
                  </Chip>
                ) : null}
                {BYPASS_LOGIN ? (
                  <Chip
                    icon="flask-outline"
                    mode="flat"
                    compact
                    style={styles.testChip}
                    textStyle={styles.testChipText}
                    accessibilityLabel="Test login uses junaid.tp3 with any password.">
                    Test login: {bypassUsername} + any password
                  </Chip>
                ) : null}

                <Controller
                  control={control}
                  name="username"
                  render={({field: {onChange, onBlur, value}}) => (
                    <View style={styles.fieldBlock}>
                      <TextInput
                        mode="outlined"
                        label="Username"
                        value={value}
                        onChangeText={text => {
                          clearErrors('root');
                          onChange(text);
                        }}
                        onBlur={onBlur}
                        autoCapitalize="none"
                        autoCorrect={false}
                        autoComplete="username"
                        textContentType="username"
                        returnKeyType="next"
                        style={styles.field}
                        theme={inputTheme}
                        disabled={submitting}
                        error={!!errors.username}
                        accessibilityLabel="Username"
                        accessibilityHint="Enter your account username"
                      />
                      <HelperText type="error" visible={!!errors.username} accessibilityLiveRegion="polite">
                        {errors.username?.message}
                      </HelperText>
                    </View>
                  )}
                />

                <Controller
                  control={control}
                  name="password"
                  render={({field: {onChange, onBlur, value}}) => (
                    <View style={styles.fieldBlock}>
                      <TextInput
                        mode="outlined"
                        label="Password"
                        value={value}
                        onChangeText={text => {
                          clearErrors('root');
                          onChange(text);
                        }}
                        onBlur={onBlur}
                        secureTextEntry={secure}
                        autoComplete="password"
                        textContentType="password"
                        returnKeyType="go"
                        onSubmitEditing={handleSubmit(onValidSubmit)}
                        style={styles.field}
                        theme={inputTheme}
                        disabled={submitting}
                        error={!!errors.password}
                        accessibilityLabel="Password"
                        accessibilityHint="Enter your account password. Double tap the eye button to show or hide text."
                        right={
                          <TextInput.Icon
                            icon={secure ? 'eye' : 'eye-off'}
                            onPress={() => setSecure(!secure)}
                            forceTextInputFocus={false}
                            accessibilityLabel={secure ? 'Show password' : 'Hide password'}
                            accessibilityRole="button"
                          />
                        }
                      />
                      <HelperText type="error" visible={!!errors.password} accessibilityLiveRegion="polite">
                        {errors.password?.message}
                      </HelperText>
                    </View>
                  )}
                />

                {rootError ? (
                  <HelperText
                    type="error"
                    visible
                    style={styles.serverError}
                    accessibilityRole="alert"
                    accessibilityLiveRegion="assertive">
                    {rootError}
                  </HelperText>
                ) : null}

                <Button
                  mode="contained"
                  onPress={handleSubmit(onValidSubmit)}
                  loading={false}
                  disabled={submitting || !canSubmit}
                  style={styles.button}
                  contentStyle={styles.buttonContent}
                  labelStyle={styles.buttonLabel}
                  theme={inputTheme}
                  accessibilityLabel="Sign in"
                  accessibilityHint="Submits your username and password"
                  accessibilityState={{disabled: submitting || !canSubmit, busy: submitting}}>
                  Sign in
                </Button>
              </Surface>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {flex: 1},
  loginOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 18, 36, 0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  loginOverlayCard: {
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderRadius: 16,
    paddingVertical: 28,
    paddingHorizontal: 32,
    alignItems: 'center',
    minWidth: 260,
    elevation: 8,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 16,
    shadowOffset: {width: 0, height: 4},
  },
  loginOverlayTitle: {
    marginTop: 18,
    fontSize: 18,
    fontWeight: '700',
    color: '#003366',
  },
  loginOverlaySubtitle: {
    marginTop: 6,
    fontSize: 15,
    color: '#4b5563',
  },
  flex: {flex: 1},
  background: {flex: 1},
  backgroundImage: {resizeMode: 'cover'},
  scrim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 26, 51, 0.78)',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 22,
  },
  header: {
    alignItems: 'center',
    marginBottom: 28,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 14,
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.4,
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 16,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '500',
    textAlign: 'center',
  },
  card: {
    borderRadius: CARD_RADIUS,
    paddingVertical: 22,
    paddingHorizontal: 20,
    backgroundColor: glass.fill.lightStrong,
    borderWidth: 1,
    borderColor: glass.border.outer,
  },
  testChip: {
    alignSelf: 'stretch',
    marginBottom: 18,
    backgroundColor: 'rgba(0, 51, 102, 0.08)',
    borderRadius: INPUT_RADIUS,
  },
  testChipText: {
    fontSize: 12,
    lineHeight: 16,
  },
  fieldBlock: {
    marginBottom: 4,
  },
  field: {
    backgroundColor: glass.fill.frost,
  },
  serverError: {
    marginBottom: 8,
    marginTop: 2,
  },
  button: {
    marginTop: 16,
    borderRadius: BUTTON_RADIUS,
    overflow: 'hidden',
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});
