import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, TextInput, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Radius, Shadow } from '../constants/theme';
import type { MainTabScreenProps } from '../types/navigation';
import type { ClientSummary } from '../types/models';

const clients: Required<ClientSummary>[] = [
  { id: '1', name: 'Priya Sharma', goal: 'Weight Loss', age: 28, status: 'Active', initials: 'PS' },
  { id: '2', name: 'Rahul Verma', goal: 'Muscle Gain', age: 32, status: 'Active', initials: 'RV' },
  {
    id: '3',
    name: 'Anjali Mehta',
    goal: 'Diabetes Care',
    age: 45,
    status: 'Checkup Due',
    initials: 'AM',
  },
  { id: '4', name: 'Suresh Patel', goal: 'Weight Loss', age: 38, status: 'Active', initials: 'SP' },
  { id: '5', name: 'Neha Singh', goal: 'PCOD Management', age: 26, status: 'New', initials: 'NS' },
  { id: '6', name: 'Vikram Rao', goal: 'Heart Health', age: 52, status: 'Active', initials: 'VR' },
];

export default function ClientListScreen({ navigation }: MainTabScreenProps<'Clients'>) {
  const [search, setSearch] = useState('');
  const filtered = clients.filter(c => c.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Clients</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddClient')}>
          <Ionicons name="add" size={22} color={Colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.body}>
        <View style={styles.searchWrap}>
          <Ionicons
            name="search-outline"
            size={18}
            color={Colors.textLight}
            style={{ marginRight: 8 }}
          />
          <TextInput
            style={styles.searchInput}
            placeholder="Search clients..."
            placeholderTextColor={Colors.border}
            value={search}
            onChangeText={setSearch}
          />
        </View>

        <Text style={styles.count}>{filtered.length} clients</Text>

        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.card}
              onPress={() => navigation.navigate('ClientDetail', { client: item })}
            >
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{item.initials}</Text>
              </View>
              <View style={styles.info}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta}>
                  {item.goal} · Age {item.age}
                </Text>
              </View>
              <View
                style={[
                  styles.badge,
                  item.status === 'Active' && styles.badgeActive,
                  item.status === 'Checkup Due' && styles.badgeWarning,
                  item.status === 'New' && styles.badgeNew,
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    item.status === 'Active' && styles.badgeActiveText,
                    item.status === 'Checkup Due' && styles.badgeWarningText,
                    item.status === 'New' && styles.badgeNewText,
                  ]}
                >
                  {item.status}
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={16}
                color={Colors.border}
                style={{ marginLeft: 6 }}
              />
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
    justifyContent: 'space-between',
  },
  title: { color: Colors.white, fontSize: 22, fontWeight: '800' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: { flex: 1, padding: 20 },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Radius.sm,
    paddingHorizontal: 14,
    height: 46,
    ...Shadow.sm,
    marginBottom: 14,
  },
  searchInput: { flex: 1, fontSize: 14, color: Colors.textDark },
  count: { fontSize: 12, color: Colors.textLight, marginBottom: 10, fontWeight: '600' },
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
    backgroundColor: Colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: { color: Colors.white, fontWeight: '700', fontSize: 15 },
  info: { flex: 1 },
  name: { fontSize: 15, fontWeight: '700', color: Colors.textDark },
  meta: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  badge: { borderRadius: Radius.pill, paddingHorizontal: 9, paddingVertical: 3 },
  badgeActive: { backgroundColor: Colors.secondaryLight },
  badgeWarning: { backgroundColor: Colors.accentLight },
  badgeNew: { backgroundColor: Colors.primaryLight },
  badgeText: { fontSize: 10, fontWeight: '700' },
  badgeActiveText: { color: Colors.secondary },
  badgeWarningText: { color: Colors.accent },
  badgeNewText: { color: Colors.primary },
});
