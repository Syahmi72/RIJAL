import React, { useState, useEffect } from 'react';
import { supabase } from './supabase';

export default function Dashboard({ onLogout }) {
  const [activeTab, setActiveTab] = useState('home');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
      
      {/* Header */}
      <div className="app-header">
        <div className="header-brand">
          <div className="brand-icon">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
          </div>
          <div>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px' }}>Absensi</div>
            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '16px', lineHeight: '1' }}>Mahasiswa</div>
            <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>Mahasiswa</div>
          </div>
        </div>
        <button onClick={onLogout} className="btn-outline">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          Keluar
        </button>
      </div>

      {/* Konten Berubah Sesuai Tab */}
      <div className="content-area">
        {activeTab === 'home' ? <HomeTab /> : <MatkulTab />}
      </div>

      {/* Bottom Navigation Tabs */}
      <div className="bottom-nav">
        <button className={`nav-item ${activeTab === 'home' ? 'active' : ''}`} onClick={() => setActiveTab('home')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span className="nav-text">Home</span>
        </button>
        <button className={`nav-item ${activeTab === 'matkul' ? 'active' : ''}`} onClick={() => setActiveTab('matkul')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>
          <span className="nav-text">Mata Kuliah</span>
        </button>
      </div>

    </div>
  );
}

// ==========================================
// TAB 1: HOME (PROSES ABSENSI REAL NYAMBUNG DATABASE)
// ==========================================
function HomeTab() {
  const [isScanning, setIsScanning] = useState(false);
  const [statusText, setStatusText] = useState('Siap melakukan pemindaian');
  const [totalPertemuan, setTotalPertemuan] = useState(0);
  const [totalHadir, setTotalHadir] = useState(0);
  const [riwayatList, setRiwayatList] = useState([]);

  // Ambil data riwayat absensi dari database saat komponen pertama kali dibuka
  useEffect(() => {
    fetchRiwayatAbsensi();
  }, []);

  const fetchRiwayatAbsensi = async () => {
    const { data, error } = await supabase
      .from('tabel_absensi')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setRiwayatList(data);
      setTotalPertemuan(data.length);
      const mhsHadir = data.filter(item => item.status === 'Hadir').length;
      setTotalHadir(mhsHadir);
    }
  };

  const handleScanNFC = async () => {
    setIsScanning(true);
    setStatusText('Sensor NFC Aktif, Silahkan Tempel Kartu...');
    
    try {
      const ndef = new window.NDEFReader();
      await ndef.scan();
      
      ndef.onreading = (event) => {
        const serialNumber = event.serialNumber;
        console.log("Kartu Terbaca: ", serialNumber);
        eksekusiAbsenDatabase(serialNumber); // Panggil fungsi database kamu
      };
      
      ndef.onreadingerror = () => {
        setStatusText("Gagal membaca, coba posisikan kartu lebih pas.");
      };

    } catch (error) {
      console.error(error);
      alert("NFC Error: Pastikan NFC HP Aktif & Izin Browser Diberikan.");
      setIsScanning(false);
    }
  };

  const eksekusiAbsenDatabase = async (uidKartu) => {
    setStatusText('Memvalidasi identitas kartu ke server...');
    
    // 1. Cari data nama mahasiswa berdasarkan UID yang di-tap
    const { data: mhs, error: mhsError } = await supabase
      .from('mahasiswa')
      .select('nama, nim, prodi')
      .eq('uid', uidKartu)
      .single();

    let namaMahasiswa = `Mahasiswa Asing (${uidKartu})`;
    if (!mhsError && mhs) {
      namaMahasiswa = `${mhs.nama} - ${mhs.nim}`;
    }

    const waktuSekarang = new Date();
    const stringWaktu = waktuSekarang.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const stringTanggal = waktuSekarang.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' });

    // 2. Simpan catatan riwayat masuk ke tabel_absensi
    const dataAbsen = {
      uid: uidKartu,
      nama: namaMahasiswa,
      waktu: `${stringTanggal} • ${stringWaktu}`,
      status: 'Hadir'
    };

    const { error: insertError } = await supabase.from('tabel_absensi').insert([dataAbsen]);

    setIsScanning(false);

    if (insertError) {
      alert("Gagal mengirim data absensi: " + insertError.message);
      setStatusText('Koneksi Gagal');
    } else {
      alert(`Absen Berhasil!\nSelamat Datang: ${namaMahasiswa}`);
      setStatusText('Pencatatan Kehadiran Sukses!');
      fetchRiwayatAbsensi(); // Sinkronkan ulang data di layar dashboard
    }
  };

  return (
    <div>
      <h2 className="section-title">Dashboard Absensi</h2>
      <p className="section-subtitle">Selamat datang di sistem absensi NFC</p>

      {/* Card Scanner */}
      <div className="scan-box">
        <div className="nfc-circle">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5c1.7 1.9 2.8 4.3 2.8 7s-1.1 5.1-2.8 7"/><path d="M22 2c2.8 2.8 4.5 6.7 4.5 11s-1.7 8.2-4.5 11"/><path d="M7 5C5.3 6.9 4.2 9.3 4.2 12s1.1 5.1 2.8 7"/><path d="M2 2C-0.8 4.8-2.5 8.7-2.5 13s1.7 8.2 4.5 11"/></svg>
        </div>
        <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '6px' }}>Scan NFC untuk Absen</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '20px' }}>{statusText}</p>
        <button className="btn-dark" onClick={handleScanNFC} disabled={isScanning} style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"/></svg>
          {isScanning ? "Membaca..." : "Mulai Scan"}
        </button>
      </div>

      {/* Ringkasan Angka Real-Time */}
      <div className="grid-2">
        <div className="stat-card">
          <div className="stat-title">Total Pertemuan</div>
          <div className="stat-value">{totalPertemuan}</div>
          <div className="stat-desc">Pertemuan tercatat</div>
        </div>
        <div className="stat-card">
          <div className="stat-title">Kehadiran</div>
          <div className="stat-value green">{totalHadir}</div>
          <div className="stat-desc">Kali hadir</div>
        </div>
      </div>

      <div className="stat-card" style={{ marginBottom: '20px' }}>
        <div className="stat-title">Tingkat Kehadiran</div>
        <div className="stat-value blue">
          {totalPertemuan > 0 ? `${Math.round((totalHadir / totalPertemuan) * 100)}%` : '0%'}
        </div>
        <div className="stat-desc">Persentase kehadiran</div>
      </div>

      {/* Riwayat Absen Live dari Database */}
      <div className="stat-card" style={{ padding: '20px' }}>
        <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '4px' }}>Riwayat Absensi Terbaru</h3>
        <p style={{ fontSize: '13px', color: '#64748b', marginBottom: '16px' }}>Daftar log masuk mahasiswa secara berkala</p>
        
        {riwayatList.length === 0 ? (
          <p style={{ fontSize: '13px', color: '#888', fontStyle: 'italic', textAlign: 'center', padding: '10px 0' }}>Belum ada log absensi hari ini.</p>
        ) : (
          riwayatList.slice(0, 5).map(item => (
            <div className="history-card" key={item.id}>
              <div className="icon-success">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              </div>
              <div className="history-info">
                <div className="history-title" style={{ fontSize: '14px' }}>{item.nama}</div>
                <div className="history-time">{item.waktu}</div>
              </div>
              <div className="badge-dark">{item.status}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ==========================================
// TAB 2: MATA KULIAH (MANAJEMEN SKS MANUAL)
// ==========================================
function MatkulTab() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [courses, setCourses] = useState([
    { id: 1, title: "Pemrograman Web", code: "IF301", sks: 3, lecturer: "Dr. Ahmad Susanto, M.Kom", time: "Senin, 08:00 - 10:00", room: "Lab Komputer 1", present: 13, total: 14, status: "Baik" },
    { id: 2, title: "Basis Data", code: "IF302", sks: 3, lecturer: "Siti Nurhaliza, S.Kom, M.T", time: "Selasa, 10:00 - 12:00", room: "Ruang 301", present: 14, total: 14, status: "Baik" }
  ]);
  const [formData, setFormData] = useState({ title: '', code: '', sks: '', lecturer: '', time: '', room: '' });

  const handleAddCourse = (e) => {
    e.preventDefault();
    const newCourse = {
      id: Date.now(),
      title: formData.title, code: formData.code, sks: formData.sks, lecturer: formData.lecturer, time: formData.time, room: formData.room,
      present: 0, total: 16, status: "Baru"
    };
    setCourses([newCourse, ...courses]);
    setIsModalOpen(false);
    setFormData({ title: '', code: '', sks: '', lecturer: '', time: '', room: '' });
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
        <div>
          <h2 className="section-title">Mata Kuliah</h2>
          <p className="section-subtitle" style={{marginBottom: 0}}>Daftar mata kuliah semester ini</p>
        </div>
        <button className="btn-dark" onClick={() => setIsModalOpen(true)} style={{ width: 'auto', padding: '8px 16px', fontSize: '13px' }}>
          + Tambah
        </button>
      </div>

      <div className="gradient-card">
        <div>
          <div className="grad-item-value">{courses.length}</div>
          <div className="grad-item-label">Mata Kuliah</div>
        </div>
        <div>
          <div className="grad-item-value">{courses.reduce((acc, curr) => acc + Number(curr.sks), 0)}</div>
          <div className="grad-item-label">Total SKS</div>
        </div>
        <div>
          <div className="grad-item-value">90%</div>
          <div className="grad-item-label">Rata-rata</div>
        </div>
      </div>

      {courses.map(course => (
        <div className="course-card" key={course.id}>
          <div className="course-header">
            <div className="course-title">{course.title}</div>
            <div className="badge-dark">{course.status}</div>
          </div>
          <div className="course-sks">{course.code} • {course.sks} SKS</div>
          
          <div className="course-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>{course.lecturer}</div>
          <div className="course-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>{course.time}</div>
          <div className="course-detail"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>{course.room}</div>

          <div className="progress-header">
            <span style={{ color: '#64748b' }}>Kehadiran</span>
            <span style={{ color: '#16a34a', fontWeight: '600' }}>{course.present}/{course.total} ({course.total > 0 ? Math.round((course.present/course.total)*100) : 0}%)</span>
          </div>
          <div className="progress-bar"><div className="progress-fill" style={{ width: `${(course.present/course.total)*100}%` }}></div></div>
        </div>
      ))}

      {/* Modal Slide-Up Input */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3 style={{ fontSize: '18px', color: '#0f172a' }}>Tambah Mata Kuliah</h3>
              <button className="btn-close" onClick={() => setIsModalOpen(false)}>✕</button>
            </div>
            <form onSubmit={handleAddCourse}>
              <div className="input-group"><label className="input-label">Nama Mata Kuliah</label><input className="input-field" required placeholder="Sistem Kontrol" onChange={(e) => setFormData({...formData, title: e.target.value})} /></div>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div className="input-group" style={{ flex: 1 }}><label className="input-label">Kode Matkul</label><input className="input-field" required placeholder="TE302" onChange={(e) => setFormData({...formData, code: e.target.value})} /></div>
                <div className="input-group" style={{ width: '80px' }}><label className="input-label">SKS</label><input className="input-field" type="number" required placeholder="3" onChange={(e) => setFormData({...formData, sks: e.target.value})} /></div>
              </div>
              <div className="input-group"><label className="input-label">Nama Dosen</label><input className="input-field" required placeholder="Nama Dosen Pengampu" onChange={(e) => setFormData({...formData, lecturer: e.target.value})} /></div>
              <div className="input-group"><label className="input-label">Jadwal</label><input className="input-field" required placeholder="Rabu, 13:00 - 15:00" onChange={(e) => setFormData({...formData, time: e.target.value})} /></div>
              <div className="input-group" style={{ marginBottom: '24px' }}><label className="input-label">Ruangan</label><input className="input-field" required placeholder="Lab Elektro" onChange={(e) => setFormData({...formData, room: e.target.value})} /></div>
              <button type="submit" className="btn-dark">Simpan Mata Kuliah</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
