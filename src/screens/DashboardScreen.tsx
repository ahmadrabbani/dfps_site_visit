import React from 'react';
import {View, Text, TouchableOpacity, StyleSheet, ScrollView} from 'react-native';
import {Icon} from 'react-native-paper';
import {useNavigation} from '@react-navigation/native';
import {isTestModeSession, type SessionUser} from '../services/api';
import {colors} from '../theme/colors';
import {glass, glassStyles} from '../theme/glassStyles';
import {SCREEN_TOP_INSET} from '../theme/screenLayout';
import {usePendingVisitCount} from '../hooks/usePendingVisitsQuery';
import {MAIN_STACK_ROUTES} from '../navigation/routeNames';
import FadeInView from '../components/animated/FadeInView';

function CardChevron({variant = 'default'}: {variant?: 'default' | 'onDark'}) {
  const onDark = variant === 'onDark';
  return (
    <View style={[styles.cardChevron, onDark ? styles.cardChevronOnDark : null]}>
      <Icon source="chevron-right" size={24} color={onDark ? '#ffffff' : colors.primary} />
    </View>
  );
}

interface DashboardScreenProps {
  user: SessionUser;
  onStartVisit: () => void;
  startingVisit?: boolean;
}

export default function DashboardScreen({user, onStartVisit, startingVisit = false}: DashboardScreenProps) {
  const navigation = useNavigation<any>();
  const pendingCount = usePendingVisitCount();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
      {/* Welcome Header */}
      <FadeInView style={styles.header}>
        <View style={styles.avatar}>
          <Icon source="account" size={28} color={colors.primary} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.greeting} numberOfLines={1}>Welcome, {user.name}</Text>
          <Text style={styles.subtitle}>Completion Certificate Site Visit</Text>
        </View>
      </FadeInView>

      {/* Red warning bar of pending violations */}
      {pendingCount > 0 ? (
        <FadeInView delay={60}>
        <TouchableOpacity
          className="flex-row items-center bg-[#dc2626] py-3.5 px-4 rounded-2xl mb-6 justify-between shadow-md"
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.MySubmissions)}
          accessibilityRole="button"
          accessibilityLabel={`You have ${pendingCount} unpushed violations. Tap to view.`}>
          <View className="flex-row items-center flex-1">
            <View className="animate-pulse mr-2.5">
              <Icon source="alert-circle-outline" size={22} color="#ffffff" />
            </View>
            <Text className="text-white text-[14px] font-bold flex-1">
              View {pendingCount} unpushed {pendingCount === 1 ? 'violation' : 'violations'}
            </Text>
          </View>
          <CardChevron variant="onDark" />
        </TouchableOpacity>
        </FadeInView>
      ) : null}

      {/* Bypass Login Banner */}
      {isTestModeSession(user) ? (
        <FadeInView delay={80}>
        <View style={styles.bypassBanner}>
          <Text style={styles.bypassText}>
            Test mode — signed in as <Text style={styles.bypassStrong}>{user.username}</Text> for CC
          </Text>
        </View>
        </FadeInView>
      ) : null}

      {/* Quick Actions Title */}
      <FadeInView delay={100}>
      <Text style={styles.sectionTitle}>Quick Actions</Text>
      </FadeInView>

      {/* Actions Grid/List */}
      <FadeInView delay={140} style={styles.cardsContainer}>
        <TouchableOpacity
          style={[styles.card, startingVisit ? styles.cardDisabled : null]}
          onPress={onStartVisit}
          disabled={startingVisit}
          accessibilityRole="button"
          accessibilityLabel="Initiate site visit">
          <View style={styles.cardIconWrap}>
            <Icon source="map-marker-check-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>DFPS Site Visit</Text>
            <Text style={styles.cardDescription}>
              Start a New Completion Certificate Survey on Site
            </Text>
          </View>
          <CardChevron />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.card}
          onPress={() => navigation.navigate(MAIN_STACK_ROUTES.MySubmissions)}
          accessibilityRole="button"
          accessibilityLabel="My site visits and submissions">
          <View style={styles.cardIconWrap}>
            <Icon source="cloud-upload-outline" size={24} color={colors.primary} />
          </View>
          <View style={styles.cardContent}>
            <Text style={styles.cardTitle}>My Site Visits & Submissions</Text>
            <Text style={styles.cardDescription}>
              View saved visits, server uploads, and push to server
            </Text>
          </View>
          <CardChevron />
        </TouchableOpacity>
      </FadeInView>

      {/* Navigation Drawer Swipe Hint */}
      <View className="flex-row items-center bg-[#e8f0f8] rounded-xl p-3 mt-4 border border-[#d0e1f9]">
        <View className="animate-pulse mr-2.5">
          <Icon source="gesture-swipe-right" size={20} color={colors.primary} />
        </View>
        <Text className="flex-1 text-[12px] text-[#003366] font-medium leading-relaxed">
          Tip: Swipe from the left edge of the screen or tap the menu icon (☰) at the top-left to open the navigation drawer.
        </Text>
      </View>

      <Text className="text-center mt-7 text-[12px] text-[#6b7280] leading-relaxed">
        Enable GPS on DFPS Site Visit to save a survey. Unsent visits stay on this device until you push
        them to the server from My Site Visits & Submissions.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingTop: 20 + SCREEN_TOP_INSET,
    paddingBottom: 20,
    flexGrow: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    ...glassStyles.cardStrong,
    padding: 16,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#e8f0f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  headerText: {
    flex: 1,
  },
  greeting: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 2,
  },

  bypassBanner: {
    backgroundColor: '#fff8e6',
    borderColor: '#f0c040',
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    marginBottom: 24,
  },
  bypassText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5c4a00',
    lineHeight: 18,
    textAlign: 'center',
  },
  bypassStrong: {
    fontWeight: '700',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 14,
    letterSpacing: 0.2,
  },
  cardsContainer: {
    gap: 16,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 88,
    ...glassStyles.cardStrong,
    padding: 18,
    borderRadius: 18,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  cardIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: glass.fill.frost,
    borderWidth: 1,
    borderColor: glass.border.inner,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    flexShrink: 0,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  cardDescription: {
    fontSize: 12,
    color: colors.mutedText,
    marginTop: 4,
    lineHeight: 16,
  },
  cardChevron: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: glass.fill.frost,
    borderWidth: 1,
    borderColor: glass.border.inner,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 10,
    flexShrink: 0,
  },
  cardChevronOnDark: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.35)',
  },
});
