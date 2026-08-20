import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';

interface Lead {
  id: string;
  name: string;
  phone: string;
  source: string;
  status: 'New' | 'Contacted' | 'Converted' | 'Lost';
  date: string;
  initials: string;
}

const leads: Lead[] = [
  {
    id: '1',
    name: 'Meera Joshi',
    phone: '+91 98765 43210',
    source: 'Instagram',
    status: 'New',
    date: '30 May 2024',
    initials: 'MJ',
  },
  {
    id: '2',
    name: 'Karan Malhotra',
    phone: '+91 87654 32109',
    source: 'Referral',
    status: 'Contacted',
    date: '28 May 2024',
    initials: 'KM',
  },
  {
    id: '3',
    name: 'Divya Reddy',
    phone: '+91 76543 21098',
    source: 'Website',
    status: 'Converted',
    date: '25 May 2024',
    initials: 'DR',
  },
  {
    id: '4',
    name: 'Arun Nair',
    phone: '+91 65432 10987',
    source: 'Instagram',
    status: 'New',
    date: '24 May 2024',
    initials: 'AN',
  },
  {
    id: '5',
    name: 'Pooja Iyer',
    phone: '+91 54321 09876',
    source: 'Referral',
    status: 'Lost',
    date: '20 May 2024',
    initials: 'PI',
  },
];

const statusColors: Record<Lead['status'], { bg: string; text: string }> = {
  New: { bg: Colors.primaryLight, text: Colors.primary },
  Contacted: { bg: Colors.accentLight, text: Colors.accent },
  Converted: { bg: Colors.secondaryLight, text: Colors.secondary },
  Lost: { bg: '#fee2e2', text: '#dc2626' },
};

const filters: ('All' | Lead['status'])[] = ['All', 'New', 'Contacted', 'Converted'];

export default function MyLeadsScreen() {
  const [filter, setFilter] = useState<'All' | Lead['status']>('All');
  const filtered = filter === 'All' ? leads : leads.filter(l => l.status === filter);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Leads</Text>
      </View>

      <View style={styles.body}>
        {/* Filters */}
        <View style={styles.filterRow}>
          {filters.map(f => (
            <TouchableOpacity
              key={f}
              style={[styles.filterBtn, filter === f && styles.filterBtnActive]}
              onPress={() => setFilter(f)}
            >
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.phone}>{item.phone}</Text>
                <View style={styles.metaRow}>
                  <Ionicons name="git-branch-outline" size={11} color={Colors.textLight} />
                  <Text style={styles.source}>{item.source}</Text>
                  <Text style={styles.dot}>·</Text>
                  <Text style={styles.date}>{item.date}</Text>
                </View>
              </View>
              <View style={[styles.badge, { backgroundColor: statusColors[item.status].bg }]}>
                <Text style={[styles.badgeText, { color: statusColors[item.status].text }]}>
                  {item.status}
                </Text>
              </View>
            </View>
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
    justifyContent: 'space-between',
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  body: { flex: 1, padding: 20 },
  filterRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  filterBtn: {
    borderRadius: Radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 7,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
  },
  filterBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterText: { fontSize: 12, color: Colors.textLight, fontWeight: '600' },
  filterTextActive: { color: Colors.white },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.md,
    padding: 14,
    marginBottom: 10,
    ...Shadow.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 14, fontWeight: '700', color: Colors.textDark },
  phone: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  source: { fontSize: 11, color: Colors.textLight },
  dot: { color: Colors.border },
  date: { fontSize: 11, color: Colors.textLight },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeText: { fontSize: 10, fontWeight: '700' },
});
