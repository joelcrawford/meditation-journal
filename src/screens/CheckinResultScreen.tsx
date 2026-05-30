import React from 'react';
import {View, Text, StyleSheet} from 'react-native';

export function CheckinResultScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>CheckinResultScreen</Text>
      <Text style={styles.sub}>Session 5</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, justifyContent: 'center', alignItems: 'center'},
  title: {fontSize: 22, fontWeight: '700'},
  sub: {fontSize: 14, color: '#888', marginTop: 4},
});
