import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, TextInput, StyleSheet,
  ScrollView, Alert, StatusBar, SafeAreaView, FlatList, ActivityIndicator,
} from 'react-native';

type Screen = 'enroll' | 'verify' | 'records';
type EnrolledUser = {
  id: string; name: string; empId: string;
  descriptor: number[]; enrolledAt: string; synced: boolean;
};
type VerifyResult = { matched: boolean; user?: EnrolledUser; score: number; } | null;

export default function App() {
  const [activeScreen, setActiveScreen] = useState<Screen>('enroll');
  const [enrolledUsers, setEnrolledUsers] = useState<EnrolledUser[]>([]);
  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#f0f2f5" />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>FaceAuth Offline</Text>
        <Text style={styles.headerSubtitle}>Works without internet</Text>
      </View>
      <View style={styles.tabBar}>
        {(['enroll', 'verify', 'records'] as Screen[]).map(screen => (
          <TouchableOpacity key={screen}
            style={[styles.tab, activeScreen === screen && styles.tabActive]}
            onPress={() => setActiveScreen(screen)}>
            <Text style={[styles.tabText, activeScreen === screen && styles.tabTextActive]}>
              {screen === 'enroll' ? 'Enroll' : screen === 'verify' ? 'Verify' : 'Records'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      {activeScreen === 'enroll' && <EnrollScreen enrolledUsers={enrolledUsers} setEnrolledUsers={setEnrolledUsers} />}
      {activeScreen === 'verify' && <VerifyScreen enrolledUsers={enrolledUsers} />}
      {activeScreen === 'records' && <RecordsScreen enrolledUsers={enrolledUsers} setEnrolledUsers={setEnrolledUsers} />}
    </SafeAreaView>
  );
}

function EnrollScreen({ enrolledUsers, setEnrolledUsers }: {
  enrolledUsers: EnrolledUser[];
  setEnrolledUsers: React.Dispatch<React.SetStateAction<EnrolledUser[]>>;
}) {
  const [name, setName] = useState('');
  const [empId, setEmpId] = useState('');
  const [faceDetected, setFaceDetected] = useState(false);
  const [blinked, setBlinked] = useState(false);
  const [smiled, setSmiled] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [statusMsg, setStatusMsg] = useState('Fill in details, then start camera');
  const [statusColor, setStatusColor] = useState('#1a73e8');
  const [statusBg, setStatusBg] = useState('#e8f0fe');

  const setStatus = (msg: string, color: string, bg: string) => {
    setStatusMsg(msg); setStatusColor(color); setStatusBg(bg);
  };

  const startCamera = () => {
    if (!name.trim() || !empId.trim()) {
      setStatus('Please fill in name and employee ID first', '#c5221f', '#fce8e6'); return;
    }
    setCameraActive(true);
    setStatus('Camera active — detecting face...', '#1a73e8', '#e8f0fe');
    setTimeout(() => { setFaceDetected(true); setStatus('Face detected! Please blink', '#b06000', '#fef7e0'); }, 1000);
    setTimeout(() => { setBlinked(true); setStatus('Blink detected! Now smile', '#b06000', '#fef7e0'); }, 3000);
    setTimeout(() => { setSmiled(true); setStatus('Liveness confirmed! Press Capture', '#137333', '#e6f4ea'); }, 5000);
  };

  const captureEnroll = () => {
    if (!smiled) { setStatus('Complete liveness check first', '#c5221f', '#fce8e6'); return; }
    const descriptor = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
    setEnrolledUsers(prev => [...prev, { id: Date.now().toString(), name: name.trim(), empId: empId.trim(), descriptor, enrolledAt: new Date().toISOString(), synced: false }]);
    setName(''); setEmpId(''); setCameraActive(false);
    setFaceDetected(false); setBlinked(false); setSmiled(false);
    setStatus('Enrolled successfully!', '#137333', '#e6f4ea');
    Alert.alert('Success!', name + ' has been enrolled.');
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.label}>Employee Name</Text>
        <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="e.g. Rahul Sharma" placeholderTextColor="#999" />
        <Text style={styles.label}>Employee ID</Text>
        <TextInput style={styles.input} value={empId} onChangeText={setEmpId} placeholder="e.g. EMP-001" placeholderTextColor="#999" />
      </View>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>LIVENESS CHECK</Text>
        <View style={styles.livenessSteps}>
          <View style={[styles.livenessStep, faceDetected ? styles.stepDone : cameraActive ? styles.stepActive : null]}>
            <Text style={styles.livenessStepText}>Face</Text>
          </View>
          <View style={[styles.livenessStep, blinked ? styles.stepDone : faceDetected ? styles.stepActive : null]}>
            <Text style={styles.livenessStepText}>Blink</Text>
          </View>
          <View style={[styles.livenessStep, smiled ? styles.stepDone : blinked ? styles.stepActive : null]}>
            <Text style={styles.livenessStepText}>Smile</Text>
          </View>
        </View>
        <View style={[styles.cameraBox, { backgroundColor: cameraActive ? '#1a1a2e' : '#2a2a2a' }]}>
          <Text style={styles.cameraText}>{cameraActive ? 'Camera Active' : 'Camera Preview'}</Text>
          {faceDetected && <View style={styles.faceBoundingBox} />}
        </View>
        <View style={[styles.statusBar, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusMsg}</Text>
        </View>
        {!cameraActive
          ? <TouchableOpacity style={styles.btnPrimary} onPress={startCamera}><Text style={styles.btnPrimaryText}>Start Camera</Text></TouchableOpacity>
          : <TouchableOpacity style={[styles.btnPrimary, !smiled && styles.btnDisabled]} onPress={captureEnroll} disabled={!smiled}><Text style={styles.btnPrimaryText}>Capture & Enroll Face</Text></TouchableOpacity>
        }
      </View>
    </ScrollView>
  );
}

function VerifyScreen({ enrolledUsers }: { enrolledUsers: EnrolledUser[] }) {
  const [cameraActive, setCameraActive] = useState(false);
  const [verifyResult, setVerifyResult] = useState<VerifyResult>(null);
  const [statusMsg, setStatusMsg] = useState('Start camera to verify identity');
  const [statusColor, setStatusColor] = useState('#1a73e8');
  const [statusBg, setStatusBg] = useState('#e8f0fe');
  const [isVerifying, setIsVerifying] = useState(false);

  const cosineSimilarity = (a: number[], b: number[]) => {
    const dot = a.reduce((s, v, i) => s + v * b[i], 0);
    return dot / (Math.sqrt(a.reduce((s, v) => s + v * v, 0)) * Math.sqrt(b.reduce((s, v) => s + v * v, 0)));
  };

  const verifyFace = () => {
    if (enrolledUsers.length === 0) { setStatusMsg('No users enrolled yet'); setStatusColor('#c5221f'); setStatusBg('#fce8e6'); return; }
    setIsVerifying(true);
    setTimeout(() => {
      const liveDesc = Array.from({ length: 128 }, () => Math.random() * 2 - 1);
      let best: EnrolledUser | undefined, bestScore = -1;
      enrolledUsers.forEach(u => { const s = cosineSimilarity(liveDesc, u.descriptor); if (s > bestScore) { bestScore = s; best = u; } });
      const matched = bestScore > 0.85;
      setVerifyResult({ matched, user: best, score: bestScore });
      if (matched) { setStatusMsg('Identity verified — ' + best?.name); setStatusColor('#137333'); setStatusBg('#e6f4ea'); }
      else { setStatusMsg('Identity not recognized'); setStatusColor('#c5221f'); setStatusBg('#fce8e6'); }
      setIsVerifying(false);
    }, 1500);
  };

  return (
    <ScrollView style={styles.screen}>
      <View style={styles.card}>
        <View style={[styles.cameraBox, { backgroundColor: cameraActive ? '#1a1a2e' : '#2a2a2a' }]}>
          <Text style={styles.cameraText}>{cameraActive ? 'Scanning face...' : 'Camera Preview'}</Text>
        </View>
        <View style={[styles.statusBar, { backgroundColor: statusBg }]}>
          <Text style={[styles.statusText, { color: statusColor }]}>{statusMsg}</Text>
        </View>
        {!cameraActive
          ? <TouchableOpacity style={styles.btnPrimary} onPress={() => { setCameraActive(true); setStatusMsg('Face detected — press Verify'); setStatusColor('#1a73e8'); setStatusBg('#e8f0fe'); }}><Text style={styles.btnPrimaryText}>Start Camera</Text></TouchableOpacity>
          : <TouchableOpacity style={styles.btnPrimary} onPress={verifyFace} disabled={isVerifying}>{isVerifying ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnPrimaryText}>Verify Identity</Text>}</TouchableOpacity>
        }
      </View>
      {verifyResult && (
        <View style={styles.card}>
          <View style={styles.matchResult}>
            <Text style={styles.matchEmoji}>{verifyResult.matched ? '✅' : '❌'}</Text>
            <Text style={[styles.matchScore, { color: verifyResult.matched ? '#137333' : '#c5221f' }]}>{Math.abs(Math.round(verifyResult.score * 100))}%</Text>
            {verifyResult.matched && verifyResult.user && <><Text style={styles.matchName}>{verifyResult.user.name}</Text><Text style={styles.matchId}>{verifyResult.user.empId} · Match confirmed</Text></>}
            {!verifyResult.matched && <Text style={styles.matchId}>No match found</Text>}
          </View>
        </View>
      )}
    </ScrollView>
  );
}

function RecordsScreen({ enrolledUsers, setEnrolledUsers }: { enrolledUsers: EnrolledUser[]; setEnrolledUsers: React.Dispatch<React.SetStateAction<EnrolledUser[]>>; }) {
  const sync = () => { setEnrolledUsers(prev => prev.map(u => ({ ...u, synced: true }))); Alert.alert('Sync Complete', 'All records uploaded to AWS.'); };
  const initials = (n: string) => n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  if (enrolledUsers.length === 0) return <View style={styles.screen}><View style={styles.card}><Text style={styles.emptyText}>No users enrolled yet</Text></View></View>;
  return (
    <View style={styles.screen}>
      <View style={styles.card}>
        <Text style={styles.sectionLabel}>ENROLLED PERSONNEL</Text>
        <FlatList data={enrolledUsers} keyExtractor={i => i.id} scrollEnabled={false} renderItem={({ item }) => (
          <View style={styles.enrolledItem}>
            <View style={styles.avatar}><Text style={styles.avatarText}>{initials(item.name)}</Text></View>
            <View><Text style={styles.enrolledName}>{item.name}</Text><Text style={styles.enrolledMeta}>{item.empId} · <Text style={{ color: item.synced ? '#137333' : '#b06000' }}>{item.synced ? 'Synced' : 'Pending'}</Text></Text></View>
          </View>
        )} />
        <TouchableOpacity style={styles.btnSecondary} onPress={sync}><Text style={styles.btnSecondaryText}>Simulate AWS Sync</Text></TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#f0f2f5' },
  header: { alignItems: 'center', paddingVertical: 16 },
  headerTitle: { fontSize: 22, fontWeight: '700', color: '#1a1a1a' },
  headerSubtitle: { fontSize: 13, color: '#666', marginTop: 2 },
  tabBar: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 8 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#fff', alignItems: 'center' },
  tabActive: { backgroundColor: '#e8f0fe', borderColor: '#1a73e8' },
  tabText: { fontSize: 13, color: '#666' },
  tabTextActive: { color: '#1a73e8', fontWeight: '600' },
  screen: { flex: 1, paddingHorizontal: 16 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#eee' },
  label: { fontSize: 13, color: '#555', marginBottom: 6, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#ddd', borderRadius: 8, padding: 10, fontSize: 14, color: '#1a1a1a' },
  cameraBox: { width: '100%', aspectRatio: 1, borderRadius: 8, marginVertical: 12, alignItems: 'center', justifyContent: 'center' },
  cameraText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  faceBoundingBox: { position: 'absolute', top: '20%', left: '25%', width: '50%', height: '60%', borderWidth: 2, borderColor: '#1a73e8', borderRadius: 4 },
  statusBar: { padding: 10, borderRadius: 8, marginBottom: 12 },
  statusText: { fontSize: 13 },
  btnPrimary: { backgroundColor: '#1a73e8', padding: 14, borderRadius: 8, alignItems: 'center', marginBottom: 8 },
  btnPrimaryText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  btnDisabled: { opacity: 0.4 },
  btnSecondary: { padding: 14, borderRadius: 8, alignItems: 'center', borderWidth: 1, borderColor: '#ddd', marginTop: 8 },
  btnSecondaryText: { color: '#1a1a1a', fontSize: 15 },
  livenessSteps: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  livenessStep: { flex: 1, padding: 8, borderRadius: 8, borderWidth: 1, borderColor: '#ddd', backgroundColor: '#f9f9f9', alignItems: 'center' },
  stepDone: { backgroundColor: '#e6f4ea', borderColor: 'transparent' },
  stepActive: { backgroundColor: '#fef7e0', borderColor: 'transparent' },
  livenessStepText: { fontSize: 12, color: '#666' },
  sectionLabel: { fontSize: 11, fontWeight: '700', color: '#999', letterSpacing: 0.8, marginBottom: 10 },
  enrolledItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f0f0f0', gap: 12 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: '#e8f0fe', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 13, fontWeight: '700', color: '#1a73e8' },
  enrolledName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  enrolledMeta: { fontSize: 12, color: '#999', marginTop: 2 },
  matchResult: { alignItems: 'center', padding: 16 },
  matchEmoji: { fontSize: 48, marginBottom: 8 },
  matchScore: { fontSize: 36, fontWeight: '700' },
  matchName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginTop: 8 },
  matchId: { fontSize: 13, color: '#666', marginTop: 4 },
  emptyText: { fontSize: 15, color: '#666', textAlign: 'center', padding: 16 },
});