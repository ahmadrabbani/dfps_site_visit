import React from 'react';
import {Modal, Pressable, ScrollView, StyleSheet, Text, View} from 'react-native';
import {useNavigation} from '@react-navigation/native';
import {Icon} from 'react-native-paper';
import {useSafeAreaInsets} from 'react-native-safe-area-context';
import {APP_TOUR_STEPS} from '../constants/appTourSteps';
import {useAppTour} from '../context/AppTourContext';
import {DRAWER_ROUTES, MAIN_STACK_ROUTES} from '../navigation/routeNames';
import {colors} from '../theme/colors';
import {glassStyles} from '../theme/glassStyles';

export default function AppTourModal() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const {visible, stepIndex, stepCount, isFirstStep, isLastStep, nextStep, prevStep, skipTour, finishTour} =
    useAppTour();

  const step = APP_TOUR_STEPS[stepIndex];
  if (!step) {
    return null;
  }

  const primaryLabel = isLastStep ? 'Get started' : isFirstStep ? 'Start tour' : 'Next';

  const openDashboard = () => {
    navigation.navigate(DRAWER_ROUTES.Main, {screen: MAIN_STACK_ROUTES.Dashboard});
  };

  const handleSkip = () => {
    skipTour();
    openDashboard();
  };

  const handlePrimary = () => {
    if (isLastStep) {
      finishTour();
      openDashboard();
      return;
    }
    nextStep();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      presentationStyle="overFullScreen"
      onRequestClose={handleSkip}
      accessibilityViewIsModal>
      <View style={[styles.backdrop, {paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24}]}>
        <View style={styles.card}>
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            <View style={styles.stepRow}>
              {APP_TOUR_STEPS.map((_, index) => (
                <View
                  key={_.id}
                  style={[styles.stepDot, index === stepIndex ? styles.stepDotActive : null]}
                />
              ))}
            </View>

          {step.kind === 'welcome' || step.kind === 'standard' || step.kind === 'done' ? (
            <>
              <View style={styles.heroIcon}>
                <Icon source={step.icon} size={40} color={colors.primary} />
              </View>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
            </>
          ) : null}

          {step.kind === 'actions' ? (
            <>
              <Text style={styles.title}>{step.title}</Text>
              <Text style={styles.body}>{step.body}</Text>
              <View style={styles.actionList}>
                {step.actions.map(action => (
                  <View key={action.title} style={styles.actionCard}>
                    <View style={styles.actionIconWrap}>
                      <Icon source={action.icon} size={26} color={colors.primary} />
                    </View>
                    <View style={styles.actionText}>
                      <Text style={styles.actionTitle}>{action.title}</Text>
                      <Text style={styles.actionDescription}>{action.description}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </>
          ) : null}

          <View style={styles.footer}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Skip app tour"
              onPress={handleSkip}
              style={({pressed}) => [styles.skipBtn, pressed ? styles.btnPressed : null]}>
              <Text style={styles.skipText}>Skip tour</Text>
            </Pressable>

            <View style={styles.primaryRow}>
              {!isFirstStep ? (
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous tour step"
                  onPress={prevStep}
                  style={({pressed}) => [styles.backBtn, pressed ? styles.btnPressed : null]}>
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              ) : null}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={primaryLabel}
                onPress={handlePrimary}
                style={({pressed}) => [
                  styles.primaryBtn,
                  !isFirstStep ? styles.primaryBtnCompact : null,
                  pressed ? styles.btnPressed : null,
                ]}>
                <Text style={styles.primaryBtnText}>{primaryLabel}</Text>
              </Pressable>
            </View>
          </View>

            <Text style={styles.stepCounter}>
              {stepIndex + 1} of {stepCount}
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 51, 102, 0.55)',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  card: {
    ...glassStyles.cardStrong,
    borderRadius: 20,
    paddingHorizontal: 22,
    paddingTop: 20,
    paddingBottom: 18,
    maxWidth: 420,
    width: '100%',
    alignSelf: 'center',
    maxHeight: '88%',
  },
  scroll: {
    maxHeight: '100%',
  },
  scrollContent: {
    paddingBottom: 2,
  },
  stepRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 18,
  },
  stepDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#d1d5db',
  },
  stepDotActive: {
    width: 22,
    backgroundColor: colors.primary,
  },
  heroIcon: {
    alignSelf: 'center',
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#e8f0f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: '800',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  actionList: {
    gap: 12,
    marginBottom: 8,
  },
  actionCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    padding: 14,
    ...glassStyles.panel,
  },
  actionIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#e8f0f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionText: {
    flex: 1,
    minWidth: 0,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.primary,
    marginBottom: 4,
  },
  actionDescription: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.mutedText,
  },
  footer: {
    marginTop: 8,
    gap: 12,
  },
  skipBtn: {
    alignSelf: 'center',
    minHeight: 42,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d1d5db',
    backgroundColor: '#f9fafb',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 14,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.mutedText,
  },
  primaryRow: {
    flexDirection: 'row',
    gap: 10,
  },
  backBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#d0e1f9',
    backgroundColor: '#e8f0f8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  backBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 48,
    borderRadius: 12,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  primaryBtnCompact: {
    flex: 1.4,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
  },
  btnPressed: {
    opacity: 0.88,
  },
  stepCounter: {
    marginTop: 12,
    fontSize: 12,
    color: colors.mutedText,
    textAlign: 'center',
    fontWeight: '600',
  },
});
