import { useState } from 'react'
import Dashboard from './Dashboard'
import { supabase } from './supabase'

export default function App() {
  const [currentScreen, setCurrentScreen] = useState('Login')

  if (currentScreen === 'Login') {
    return (
      <LoginScreen 
        onLogin={() => setCurrentScreen('Main')} 
        onRegister={() => setCurrentScreen('Register')} 
      />
    )
  } else if (currentScreen === 'Register') {
    return <RegisterScreen onBack={() => setCurrentScreen('Login')} />
  } else {
    return <Dashboard onLogout={() => setCurrentScreen('Login')} />
  }
}

// ==========================================
// 1. LOGIN SCREEN
// ==========================================
function LoginScreen({ onLogin, onRegister }) {
  const [nim, setNim] = useState('')
  const [password, setPassword] = useState('')

  const handleLogin = (e) => {
    e.preventDefault()
    // Bypass login admin/mahasiswa untuk kemudahan demo tugas
    if (nim && password) onLogin()
  }

  return (
    <div className="login-bg">
      <div className="login-card">
        <div className="icon-circle">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
            <path d="M6 12v5c3 3 9 3 12 0v-5" />
          </svg>
        </div>
        
        <h2 style={{ textAlign: 'center', fontSize: '22px', color: '#0f172a', marginBottom: '8px' }}>
          Sistem Absensi Mahasiswa
        </h2>
        <p style={{ textAlign: 'center', fontSize: '14px', color: '#64748b', marginBottom: '32px' }}>
          Masuk dengan NIM dan password Anda
        </p>

        <form onSubmit={handleLogin}>
          <div className="input-group">
            <label className="input-label">NIM</label>
            <input 
              type="text" className="input-field" placeholder="Masukkan NIM" 
              value={nim} onChange={(e) => setNim(e.target.value)} required 
            />
          </div>
          <div className="input-group">
            <label className="input-label">Password</label>
            <input 
              type="password" className="input-field" placeholder="Masukkan password" 
              value={password} onChange={(e) => setPassword(e.target.value)} required 
            />
          </div>
          <button type="submit" className="btn-dark">Masuk</button>
        </form>

        <button onClick={onRegister} className="link-text">
          Belum punya akun? Daftar sekarang
        </button>
      </div>
    </div>
  )
}

// ==========================================
// 2. REGISTER SCREEN (Koneksi Supabase AKTIF)
// ==========================================
function RegisterScreen({ onBack }) {
  const [form, setForm] = useState({ nama: '', nim: '', fakultas: '', jurusan: '', prodi: '', uid: '' })
  const [isScanning, setIsScanning] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const handleScanKTM = async () => {
    setIsScanning(true)
    if ('NDEFReader' in window) {
      try {
        const ndef = new window.NDEFReader();
        await ndef.scan();
        ndef.onreading = (e) => {
          setForm({ ...form, uid: e.serialNumber });
          setIsScanning(false);
          alert("KTM Berhasil Divalidasi! UID: " + e.serialNumber);
        };
      } catch (err) {
        alert("Gagal mengakses NFC. Pastikan izin diberikan.");
        setIsScanning(false);
      }
    } else {
      // Fallback Otomatis buat testing di Laptop
      setTimeout(() => {
        setForm({ ...form, uid: "99:88:77:66:55" });
        setIsScanning(false);
        alert("Simulasi Laptop: KTM Berhasil Divalidasi dengan UID 99:88:77:66:55");
      }, 1500);
    }
  }

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.uid) {
      return alert("Validasi Gagal! Anda wajib melakukan SCAN KTM terlebih dahulu.");
    }
    
    setIsSaving(true);
    
    // NYAWA UTAMA: Menyimpan data pendaftaran langsung ke tabel 'mahasiswa' Supabase
    const { error } = await supabase.from('mahasiswa').insert([form]);
    
    setIsSaving(false);
    
    if (error) {
      alert("Gagal mendaftar ke database: " + error.message);
    } else {
      alert(`Pendaftaran Berhasil!\nMahasiswa bernama ${form.nama} telah terikat dengan UID Kartu: ${form.uid}`);
      onBack();
    }
  }

  return (
    <div className="login-bg">
      <div className="login-card scrollable">
        <h2 style={{ fontSize: '20px', color: '#0f172a', marginBottom: '6px' }}>Buat Akun Baru</h2>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '24px' }}>Lengkapi data diri dan validasi KTM</p>

        <form onSubmit={handleRegister}>
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <label className="input-label">Nama Lengkap</label>
            <input className="input-field" placeholder="Masukkan nama" value={form.nama} required onChange={(e) => setForm({...form, nama: e.target.value})} />
          </div>
          
          <div className="input-group" style={{ marginBottom: '12px' }}>
            <label className="input-label">NIM</label>
            <input className="input-field" placeholder="Masukkan NIM" value={form.nim} required onChange={(e) => setForm({...form, nim: e.target.value})} />
          </div>

          <div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="input-label">Fakultas</label>
              <input className="input-field" placeholder="Contoh: JMTI" value={form.fakultas} required onChange={(e) => setForm({...form, fakultas: e.target.value})} />
            </div>
            <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
              <label className="input-label">Jurusan</label>
              <input className="input-field" placeholder="Contoh: Teknik Elektro" value={form.jurusan} required onChange={(e) => setForm({...form, jurusan: e.target.value})} />
            </div>
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label className="input-label">Program Studi</label>
            <input className="input-field" placeholder="Contoh: S1 Teknik Elektro" value={form.prodi} required onChange={(e) => setForm({...form, prodi: e.target.value})} />
          </div>

          <div className="input-group">
            <label className="input-label">Validasi Kartu Tanda Mahasiswa (KTM)</label>
            <button 
              type="button" 
              onClick={handleScanKTM} 
              disabled={isScanning}
              style={{
                width: '100%', padding: '14px', borderRadius: '8px', fontWeight: '600', fontSize: '14px', cursor: 'pointer',
                backgroundColor: form.uid ? '#dcfce7' : '#f1f5f9',
                color: form.uid ? '#16a34a' : '#334155',
                border: form.uid ? '1px solid #22c55e' : '1px solid #cbd5e1',
                display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
              {isScanning ? "Mendeteksi KTM..." : form.uid ? `Tervalidasi (UID: ${form.uid})` : "Tap KTM untuk Validasi"}
            </button>
          </div>

          <button type="submit" className="btn-dark" style={{ marginTop: '8px' }} disabled={isSaving}>
            {isSaving ? "Mendaftarkan..." : "Daftar Akun"}
          </button>
        </form>

        <button onClick={onBack} className="link-text" style={{ color: '#64748b' }}>
          Kembali ke halaman Login
        </button>
      </div>
    </div>
  )
}