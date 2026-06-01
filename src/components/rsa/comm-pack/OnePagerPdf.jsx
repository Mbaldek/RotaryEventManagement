import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const NAVY = '#0a1f44';
const GOLD = '#b08d57';

const styles = StyleSheet.create({
  page: { padding: 48, fontSize: 11, color: '#1a1a1a', fontFamily: 'Helvetica' },
  eyebrow: { fontSize: 9, letterSpacing: 2, color: GOLD, textTransform: 'uppercase', marginBottom: 6 },
  title: { fontSize: 24, color: NAVY, fontFamily: 'Times-Roman', marginBottom: 4 },
  rule: { height: 2, width: 64, backgroundColor: GOLD, marginVertical: 12 },
  tagline: { fontSize: 13, color: NAVY, marginBottom: 16 },
  row: { marginBottom: 6 },
  label: { color: GOLD, fontSize: 9, textTransform: 'uppercase', letterSpacing: 1 },
  value: { fontSize: 12 },
  footer: { position: 'absolute', bottom: 36, left: 48, right: 48, fontSize: 9, color: '#7a7367' },
});

const Line = ({ label, value }) =>
  value ? (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  ) : null;

export default function OnePagerPdf({ vars, labels }) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.eyebrow}>{labels.eyebrow}</Text>
        <Text style={styles.title}>{vars.competition_name} {vars.year}</Text>
        <View style={styles.rule} />
        {vars.tagline ? <Text style={styles.tagline}>{vars.tagline}</Text> : null}
        <Line label={labels.applications} value={vars.application_window} />
        <Line label={labels.awards} value={[vars.prize_main, vars.prize_special].filter(Boolean).join(' + ')} />
        <Line label={labels.eligibility} value={vars.eligibility_summary} />
        <Line label={labels.format} value={vars.format_line} />
        <Line label={labels.ceremony} value={vars.ceremony} />
        <Line label={labels.info} value={vars.registration_url} />
        <Text style={styles.footer}>{[vars.contact_name, vars.contact_phone, vars.contact_email].filter(Boolean).join(' · ')}</Text>
      </Page>
    </Document>
  );
}
