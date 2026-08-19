import React from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import type { MainTabScreenProps } from '../types/navigation';

interface Checkup {
  id: string;
  name: string;
  due: string;
  goal: string;
  overdue: boolean;
  initials: string;
}

const checkups: Checkup[] = [
  {
    id: '1',
    name: 'Anjali Mehta',
    due: 'Today',
    goal: 'Diabetes Care',
    overdue: false,
    initials: 'AM',
  },
  {
    id: '2',
    name: 'Suresh Patel',
    due: 'Tomorrow',
    goal: 'Weight Loss',
    overdue: false,
    initials: 'SP',
  },
  {
    id: '3',
    name: 'Rohit Das',
    due: '3 days ago',
    goal: 'Muscle Gain',
    overdue: true,
    initials: 'RD',
  },
  {
    id: '4',
    name: 'Kavita Sharma',
    due: 'Jun 10',
    goal: 'PCOD Management',
    overdue: false,
    initials: 'KS',
  },
  {
    id: '5',
    name: 'Ajay Kumar',
    due: '1 week ago',
    goal: 'Heart Health',
    overdue: true,
    initials: 'AK',
  },
];

export default function ReCheckupListScreen({ navigation }: MainTabScreenProps<'Checkups'>) {
  const overdue = checkups.filter(c => c.overdue).length;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Re-Checkups</Text>
        {overdue > 0 && (
          <View style={styles.overdueChip}>
            <Text style={styles.overdueText}>{overdue} Overdue</Text>
          </View>
        )}
      </View>

      <View style={styles.body}>
        <FlatList
          data={checkups}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.card, item.overdue && styles.cardOverdue]}
              onPress={() => navigation.navigate('ClientDetail', { client: item })}
            >
              <View style={[styles.avatar, item.overdue && styles.avatarOverdue]}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.goal}>{item.goal}</Text>
                <View style={styles.dueRow}>
                  <Ionicons
                    name={item.overdue ? 'warning-outline' : 'time-outline'}
                    size={12}
                    color={item.overdue ? '#dc2626' : Colors.accent}
                  />
                  <Text style={[styles.due, item.overdue && styles.dueOverdue]}>
                    Due: {item.due}
                  </Text>
                </View>
              </View>
              <TouchableOpacity style={[styles.checkBtn, item.overdue && styles.checkBtnOverdue]}>
                <Ionicons
                  name="clipboard"
                  size={16}
                  color={item.overdue ? '#dc2626' : Colors.accent}
                />
                <Text style={[styles.checkBtnText, item.overdue && styles.checkBtnTextOverdue]}>
                  Checkup
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.secondary,
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800', flex: 1 },
  overdueChip: {
    backgroundColor: '#dc2626',
    borderRadius: Radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  overdueText: { color: Colors.white, fontSize: 11, fontWeight: '700' },
  body: { flex: 1, padding: 20 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  cardOverdue: { borderLeftWidth: 3, borderLeftColor: '#dc2626' },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarOverdue: { backgroundColor: '#dc2626' },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  goal: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  due: { fontSize: 11, color: Colors.accent, fontWeight: '600' },
  dueOverdue: { color: '#dc2626' },
  checkBtn: {
    backgroundColor: Colors.accentLight,
    borderRadius: Radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  checkBtnOverdue: { backgroundColor: '#fee2e2' },
  checkBtnText: { fontSize: 10, color: Colors.accent, fontWeight: '700' },
  checkBtnTextOverdue: { color: '#dc2626' },
});
